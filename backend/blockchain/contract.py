import json
from pathlib import Path
from web3 import Web3

HARDHAT_RPC_URL = "https://sepolia.infura.io/v3/775ca45c63a44e5c9abd1f907d19148f"

ABI_PATH = Path("C:/1-voting-system/backend/blockchain/Voting.json")


def load_contract(w3: Web3, contract_address: str):
    """
    Reads the compiled artifact JSON (which contains the ABI),
    then returns a Web3 contract instance bound to the deployed address.

    Think of this like importing a Python class definition (ABI = blueprint)
    and then pointing it at a specific object in memory (the deployed address).
    """
    with open(ABI_PATH) as f:
        artifact = json.load(f)

    # Handle both Hardhat and Remix formats
    if isinstance(artifact, list):
        abi = artifact  # Remix format
    else:
        abi = artifact["abi"]  # Hardhat format
    checksum_address = Web3.to_checksum_address(contract_address)
    return w3.eth.contract(address=checksum_address, abi=abi)


def get_web3_and_contract(contract_address: str):
    """
    Creates a Web3 instance connected to the local Hardhat node,
    validates the connection, and loads the contract.
    Called ONCE at app startup.
    """
    w3 = Web3(Web3.HTTPProvider(HARDHAT_RPC_URL))

    if not w3.is_connected():
        raise ConnectionError(
            f"Failed to connect to Hardhat node at {HARDHAT_RPC_URL}. "
        )

    contract = load_contract(w3, contract_address)
    return w3, contract
