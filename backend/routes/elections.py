from fastapi import APIRouter, HTTPException, Depends, Query, status
import os, hashlib
from db import get_db
from datetime import datetime
from pwdlib import PasswordHash
from models import (
    User,
    CreateElectionRequest,
    CreateElectionResponse,
    EndElectionResponse,
)
from utils import (
    build_vote_message,
    get_current_user,
    load_public_key,
    verify_signature,
    get_next_id,
)

from web3_dependency import get_contract, get_w3
from web3 import Web3
from web3.contract import Contract
from web3.exceptions import ContractLogicError
from concurrent.futures import ThreadPoolExecutor
import asyncio


router = APIRouter()
password_hash = PasswordHash.recommended()


## ADMIN ROUTES


@router.post(
    "/", response_model=CreateElectionResponse, status_code=status.HTTP_201_CREATED
)
async def create_election(
    body: CreateElectionRequest,
    current_user: User = Depends(get_current_user),
    contract: Contract = Depends(get_contract),
    w3: Web3 = Depends(get_w3),
    db=Depends(get_db),  # injected properly now
):
    # --- 1. Role check ---
    if "admin" not in current_user.role:
        raise HTTPException(status_code=403, detail="Only admins can create elections.")

    if body.end_date <= body.start_date:
        raise HTTPException(400, "End date must be after start date.")

    # --- 2. Generate IDs (2 round-trips total regardless of candidate count) ---
    election_id = await get_next_id(db, "election_id")
    candidate_ids = [election_id * 1000 + i for i in range(1, len(body.candidates) + 1)]

    # Zip each candidate with its generated ID
    candidates_with_ids = [
        {**c.model_dump(), "candidate_id": cid}
        for c, cid in zip(body.candidates, candidate_ids)
    ]

    # --- 3. Load owner account ---
    owner_private_key = os.environ.get("OWNER_PRIVATE_KEY")
    if not owner_private_key:
        raise HTTPException(500, "Server misconfiguration: owner key not set.")
    owner_address = w3.eth.account.from_key(owner_private_key).address

    # --- 4. Build transaction ---
    try:
        estimated_gas = contract.functions.createElection(
            election_id,
            [c["candidate_id"] for c in candidates_with_ids],
        ).estimate_gas({"from": owner_address})

        tx = contract.functions.createElection(
            election_id,
            [c["candidate_id"] for c in candidates_with_ids],
        ).build_transaction(
            {
                "from": owner_address,
                "nonce": w3.eth.get_transaction_count(owner_address),
                "gas": int(estimated_gas * 1.3),
                "gasPrice": w3.eth.gas_price,
            }
        )
    except ContractLogicError as e:
        raise HTTPException(400, f"Contract rejected the transaction: {str(e)}")
    except Exception as e:
        raise HTTPException(500, f"Transaction build failed: {str(e)}")

    # --- 5. Sign and broadcast ---
    signed_tx = w3.eth.account.sign_transaction(tx, private_key=owner_private_key)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

    if receipt.status != 1:
        raise HTTPException(500, "Transaction mined but execution failed (reverted).")

    # --- 6. Persist to MongoDB AFTER on-chain confirmation ---
    await db["elections"].insert_one(
        {
            "election_id": election_id,
            "title": body.title,
            "description": body.description,
            "start_date": body.start_date,
            "end_date": body.end_date,
            "candidates": candidates_with_ids,
            "tx_hash": tx_hash.hex(),
            "created_at": datetime.now(),
        }
    )

    return CreateElectionResponse(
        tx_hash=tx_hash.hex(),
        election_id=election_id,
        candidate_ids=[c["candidate_id"] for c in candidates_with_ids],
        message=f"Election {election_id} created successfully.",
    )


@router.post(
    "/{election_id}/end",
    response_model=EndElectionResponse,
    status_code=status.HTTP_200_OK,
)
async def end_election(
    election_id: int,  # pulled from the URL path
    current_user: User = Depends(get_current_user),
    contract: Contract = Depends(get_contract),
    w3: Web3 = Depends(get_w3),
):
    # --- 1. Role check ---
    if "admin" not in current_user.role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can end elections.",
        )

    # --- 2. Load the owner account from env ---
    owner_private_key = os.environ.get("OWNER_PRIVATE_KEY")
    if not owner_private_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server misconfiguration: owner key not set.",
        )

    owner_address = w3.eth.account.from_key(owner_private_key).address

    # --- 3. Build the transaction ---
    try:
        tx = contract.functions.endElection(
            election_id,
        ).build_transaction(
            {
                "from": owner_address,
                "nonce": w3.eth.get_transaction_count(owner_address),
                "gas": 100_000,  # ending an election is cheaper than creating one
                "gasPrice": w3.eth.gas_price,
            }
        )
    except ContractLogicError as e:
        # This catches Solidity require() failures BEFORE the tx is broadcast.
        # e.g. "Election does not exist" or "Election already ended"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Contract rejected the transaction: {str(e)}",
        )

    # --- 4. Sign the transaction ---
    signed_tx = w3.eth.account.sign_transaction(tx, private_key=owner_private_key)

    # --- 5. Broadcast and wait for receipt ---
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

    if receipt.status != 1:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Transaction was mined but execution failed (reverted).",
        )

    return EndElectionResponse(
        tx_hash=tx_hash.hex(),
        election_id=election_id,
        message=f"Election {election_id} has been ended successfully.",
    )


## actual blockchain write happens here
@router.post("/vote")
async def cast_vote(
    payload: dict,
    db=Depends(get_db),
    contract: Contract = Depends(get_contract),
    w3: Web3 = Depends(get_w3),
):
    pubkey_hash = payload["pubkey_hash"]

    voter = await db.voter_registry.find_one(
        {"pubkey_hash": pubkey_hash, "revoked": False}
    )

    if not voter:
        raise HTTPException(status_code=403, detail="Invalid or revoked voter")

    used_nonce = await db.used_nonces.find_one(
        {"nonce": payload["nonce"], "election_id": payload["election_id"]}
    )

    # 2. Replay protection
    if used_nonce:
        raise HTTPException(status_code=409, detail="Replay detected")

    server_secret = os.environ.get("VOTER_HASH_SECRET")
    if not server_secret:
        raise HTTPException(
            status_code=500,
            detail="Server misconfiguration: voter hash secret not set.",
        )

    # 3. Verify ed25519 signature
    public_key = load_public_key(voter["public_key"])  # fetched from DB, not payload
    message = build_vote_message(payload)

    if not verify_signature(public_key, message, payload["signature"]):
        raise HTTPException(status_code=401, detail="Invalid signature")

    # 4. Mark nonce as used (do this BEFORE the blockchain call so a crash
    #    doesn't leave the nonce reusable — better to have a rare "nonce used"
    #    error than a replay attack)
    await db.used_nonces.insert_one(
        {
            "nonce": payload["nonce"],
            "election_id": payload["election_id"],
            "used_at": datetime.now(),
        }
    )

    # ── ON-CHAIN VOTE ─────────────────────────────────────────────────────────

    # 5. Derive the voter_hash that the contract expects (bytes32).
    #    We use the same pubkey_hash we looked up, but the contract needs it as
    #    a raw 32-byte value, not a hex string.
    #    Analogy: converting a written number "255" into the actual byte 0xFF.
    # voter_hash_bytes32 = bytes.fromhex(pubkey_hash)  # sha256 → 32 bytes exactly

    # Combine pubkey_hash + election_id + secret, then SHA-256 the whole thing.
    # This produces a stable, election-scoped, unlinkable voter identity.
    raw = f"{pubkey_hash}:{payload['election_id']}:{server_secret}".encode()
    voter_hash_bytes32 = hashlib.sha256(
        raw
    ).digest()  # already 32 bytes, no .fromhex() needed

    # 6. Load the server's owner key (same pattern as create_election)
    owner_private_key = os.environ.get("OWNER_PRIVATE_KEY")
    if not owner_private_key:
        raise HTTPException(
            status_code=500, detail="Server misconfiguration: owner key not set."
        )

    owner_address = w3.eth.account.from_key(owner_private_key).address
    # 7. Build the transaction — calls castVote(electionId, voterHash, candidateId)
    #    The contract handles both first-vote and re-vote internally, so we don't
    #    need to branch here; one function call covers both cases.
    try:
        tx = contract.functions.castVote(
            payload["election_id"],  # uint256
            voter_hash_bytes32,  # bytes32
            payload["candidate_id"],  # uint256
        ).build_transaction(
            {
                "from": owner_address,
                "nonce": w3.eth.get_transaction_count(owner_address),
                "gas": 200_000,
                "gasPrice": w3.eth.gas_price,
            }
        )
    except ContractLogicError as e:
        # Catches require() failures e.g. "Election has ended", "Invalid candidate"
        raise HTTPException(status_code=400, detail=f"Contract rejected vote: {str(e)}")
    # 8. Sign and broadcast (identical to create_election)
    signed_tx = w3.eth.account.sign_transaction(tx, private_key=owner_private_key)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

    if receipt.status != 1:
        raise HTTPException(status_code=500, detail="Transaction mined but reverted.")

    return {
        "status": "vote cast",
        "tx_hash": tx_hash.hex(),
        "election_id": payload["election_id"],
        "candidate_id": payload["candidate_id"],
    }


@router.get("/elections/{election_id}/results")
def get_results(
    election_id: int,
    candidate_ids: list[int] = Query(...),
    contract: Contract = Depends(get_contract),
):
    # One single RPC call — the loop runs inside the EVM, not over the network
    counts = contract.functions.getResults(election_id, candidate_ids).call()

    # Zip candidate IDs with their returned counts → {1: 120, 2: 85, 3: 43}
    results = dict(zip(candidate_ids, counts))
    total_votes = sum(results.values())

    return {"election_id": election_id, "results": results, "total_votes": total_votes}


@router.get("/elections/{election_id}/status")
def get_status(
    election_id: int,
    contract: Contract = Depends(get_contract),
):
    # isElectionActive() returns True if exists AND not ended.
    is_active = contract.functions.isElectionActive(election_id).call()

    return {"election_id": election_id, "is_active": is_active}


@router.get("/elections/{election_id}/voter/{voter_hash}")
def get_voter_status(
    election_id: int,
    voter_hash: str,  # hex string from the URL, e.g. "a3f2..."
    contract: Contract = Depends(get_contract),
):
    # Convert the hex string back to the 32-byte value the contract expects —
    # same conversion we do in castVote.
    voter_hash_bytes32 = bytes.fromhex(voter_hash)

    has_voted = contract.functions.hasVoterVoted(election_id, voter_hash_bytes32).call()

    return {
        "election_id": election_id,
        "voter_hash": voter_hash,
        "has_voted": has_voted,
    }


@router.get("/elections")
async def get_all_elections(
    db=Depends(get_db), contract: Contract = Depends(get_contract)
):
    elections = await db["elections"].find({}, {"_id": 0}).to_list(None)

    # fetch_status is a blocking web3 call, so we run it in a thread pool
    # to avoid blocking the async event loop — like running errands
    # by sending multiple people out simultaneously instead of one at a time
    def fetch_status(election_id: int) -> bool:
        return contract.functions.isElectionActive(election_id).call()

    loop = asyncio.get_event_loop()

    with ThreadPoolExecutor() as pool:
        # asyncio.gather fires all status fetches concurrently
        statuses = await asyncio.gather(
            *[
                loop.run_in_executor(pool, fetch_status, e["election_id"])
                for e in elections
            ]
        )

    # Zip elections with their statuses and attach a derived "status" string
    for election, is_active in zip(elections, statuses):
        election["status"] = "active" if is_active else "ended"

    return {"elections": elections}


@router.get("/elections/{election_id}")
async def get_election(
    election_id: int,
    db=Depends(get_db),
    contract: Contract = Depends(get_contract),
):
    # 1. Fetch metadata from MongoDB
    election = await db.elections.find_one({"election_id": election_id}, {"_id": 0})
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # 2. Enrich each candidate with their live vote count from the blockchain.
    #    This is the join — MongoDB gives us the name, blockchain gives us the count.
    for candidate in election["candidates"]:
        candidate["vote_count"] = contract.functions.getVotes(
            election_id, candidate["candidate_id"]
        ).call()

    # 3. Attach live status from the blockchain too
    election["is_active"] = contract.functions.isElectionActive(election_id).call()

    return election
