import os
import base64
import hashlib
import json
import time
import uuid
import requests
from cryptography.hazmat.primitives.serialization import load_pem_private_key
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

# ── 1. Load the private key from the .pem file ────────────────────────────────
# This is what the frontend would load from the user's local storage or file.
with open("C:/1-voting-system/backend/private_keys/krishna_private_key.pem", "rb") as f:
    private_key: Ed25519PrivateKey = load_pem_private_key(f.read(), password=None)

server_secret = os.environ.get("VOTER_HASH_SECRET")

# ── 2. Derive the public key and pubkey_hash ──────────────────────────────────
# The client computes their own pubkey_hash so they don't need to store it
# separately — it's always re-derivable from the private key.
public_key_bytes = private_key.public_key().public_bytes_raw()  # raw 32 bytes
pubkey_hash = hashlib.sha256(public_key_bytes).hexdigest()

# ── 3. Build the vote payload (without signature yet) ─────────────────────────
election_id = 25
candidate_id = 25003
nonce = str(uuid.uuid4())  # unique per vote attempt, prevents replay
timestamp = str(int(time.time()))

# This must match build_vote_message() on the server exactly
message_dict = {
    "election_id": election_id,
    "candidate_id": candidate_id,
    "nonce": nonce,
    "timestamp": timestamp,
}
message_bytes = json.dumps(message_dict, separators=(",", ":"), sort_keys=True).encode()

# ── 4. Sign the message ───────────────────────────────────────────────────────
# Ed25519 signs the raw bytes. The signature proves this payload was
# constructed by whoever holds this private key — like a wax seal on a letter.
signature_bytes = private_key.sign(message_bytes)
signature_b64 = base64.b64encode(signature_bytes).decode()

# ── 5. Send the vote ──────────────────────────────────────────────────────────
payload = {
    "pubkey_hash": pubkey_hash,
    "election_id": election_id,
    "candidate_id": candidate_id,
    "nonce": nonce,
    "timestamp": timestamp,
    "signature": signature_b64,
}

response = requests.post("http://127.0.0.1:8000/elections/vote", json=payload)
print(response.status_code, response.json())
