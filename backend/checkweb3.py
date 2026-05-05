from web3 import Web3, AsyncWeb3

w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))

print(w3.is_connected())

print(w3.eth.get_block("latest"))
