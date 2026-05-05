## dependencies (thin dependencies, no new connections)

from fastapi import Request
from web3.contract import Contract
from web3 import Web3


def get_contract(request: Request) -> Contract:
    """
    Dependency that retrieves the already-connected contract from app state.
    """
    return request.app.state.contract


def get_w3(request: Request) -> Web3:
    return request.app.state.w3
