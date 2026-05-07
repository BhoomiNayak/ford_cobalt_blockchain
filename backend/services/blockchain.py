"""
Web3.py integration for contract interactions.
"""
import json
import os
from pathlib import Path
from typing import Any, Dict, Optional

from web3 import Web3
from web3.middleware import geth_poa_middleware

from config import settings

w3: Web3 = None
mine_registry = None
batch_tracking = None
compliance_verifier = None


async def init_web3():
    global w3, mine_registry, batch_tracking, compliance_verifier

    w3 = Web3(Web3.HTTPProvider(settings.WEB3_PROVIDER_URL))
    w3.middleware_onion.inject(geth_poa_middleware, layer=0)  # For Polygon/PoA

    if not w3.is_connected():
        print("⚠️  Web3 not connected. Running in offline mode.")
        return

    abis_path = Path(__file__).parent.parent / "abis"

    def load_contract(name: str, address: str):
        abi_file = abis_path / f"{name}.json"
        if not abi_file.exists():
            print(f"⚠️  ABI not found for {name}")
            return None
        with open(abi_file) as f:
            abi = json.load(f)
        return w3.eth.contract(address=Web3.to_checksum_address(address), abi=abi)

    if settings.MINE_REGISTRY_ADDRESS:
        mine_registry = load_contract("MineRegistry", settings.MINE_REGISTRY_ADDRESS)
    if settings.BATCH_TRACKING_ADDRESS:
        batch_tracking = load_contract("BatchTracking", settings.BATCH_TRACKING_ADDRESS)
    if settings.COMPLIANCE_VERIFIER_ADDRESS:
        compliance_verifier = load_contract("ComplianceVerifier", settings.COMPLIANCE_VERIFIER_ADDRESS)

    print(f"✅ Web3 connected: {settings.WEB3_PROVIDER_URL}")


def get_w3() -> Web3:
    return w3


def get_contracts() -> Dict[str, Any]:
    return {
        "mine_registry": mine_registry,
        "batch_tracking": batch_tracking,
        "compliance_verifier": compliance_verifier,
    }


def get_account():
    """Returns the deployer/signer account."""
    if not settings.DEPLOYER_PRIVATE_KEY:
        raise ValueError("DEPLOYER_PRIVATE_KEY not set")
    account = w3.eth.account.from_key(settings.DEPLOYER_PRIVATE_KEY)
    return account


async def send_transaction(contract_func, *args):
    """Build, sign, and send a transaction. Returns receipt."""
    account = get_account()
    nonce = w3.eth.get_transaction_count(account.address)

    tx = contract_func(*args).build_transaction({
        "from": account.address,
        "nonce": nonce,
        "gas": 500_000,
        "gasPrice": w3.eth.gas_price,
    })

    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    return receipt


def bytes32_to_hex(b: bytes) -> str:
    return "0x" + b.hex()


def hex_to_bytes32(h: str) -> bytes:
    return bytes.fromhex(h.replace("0x", ""))


def purity_to_bps(purity_percent: float) -> int:
    return int(purity_percent * 100)


def bps_to_purity(bps: int) -> float:
    return bps / 100
