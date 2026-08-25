"""Encrypted vault for API keys — XChaCha20-Poly1305 + HKDF machine fingerprint."""

from __future__ import annotations

import hashlib
import json
import os
import uuid
from pathlib import Path
from typing import Optional

from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

VAULT_PATH = Path(__file__).parent.parent / "data" / "vault.enc"
SALT = b"roleito-vault-v1"


def _get_machine_id() -> str:
    """Generate machine fingerprint from hostname + MAC address."""
    import platform
    import subprocess

    hostname = platform.node()

    mac = "000000000000"
    try:
        if platform.system() == "Windows":
            output = subprocess.check_output(
                ["getmac", "/fo", "csv", "/nh"],
                stderr=subprocess.DEVNULL,
                text=True,
            )
            for line in output.strip().split("\n"):
                if line:
                    mac = line.split(",")[0].strip('"')
                    break
        elif platform.system() == "Darwin":
            output = subprocess.check_output(
                ["ifconfig", "en0"], stderr=subprocess.DEVNULL, text=True
            )
            for line in output.split("\n"):
                if "ether" in line:
                    mac = line.split("ether")[1].strip()
                    break
        else:
            output = subprocess.check_output(
                ["cat", "/sys/class/net/eth0/address"],
                stderr=subprocess.DEVNULL,
                text=True,
            )
            mac = output.strip()
    except Exception:
        mac = str(uuid.getnode())

    return hashlib.sha256(f"{hostname}:{mac}".encode()).hexdigest()


def _derive_key() -> bytes:
    """Derive XChaCha20-Poly1305 key from machine fingerprint."""
    machine_id = _get_machine_id()
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=SALT,
        info=b"roleito-api-keys",
    )
    return hkdf.derive(machine_id.encode())


def encrypt_value(plaintext: str) -> str:
    """Encrypt a string value. Returns base64-encoded nonce + ciphertext."""
    key = _derive_key()
    nonce = os.urandom(12)
    aead = ChaCha20Poly1305(key)
    ciphertext = aead.encrypt(nonce, plaintext.encode(), None)
    import base64
    return base64.b64encode(nonce + ciphertext).decode()


def decrypt_value(encrypted: str) -> str:
    """Decrypt a base64-encoded nonce + ciphertext back to string."""
    key = _derive_key()
    aead = ChaCha20Poly1305(key)
    import base64
    raw = base64.b64decode(encrypted)
    nonce = raw[:12]
    ciphertext = raw[12:]
    return aead.decrypt(nonce, ciphertext, None).decode()


def load_vault() -> dict[str, str]:
    """Load all encrypted keys from vault. Returns {key_name: decrypted_value}."""
    if not VAULT_PATH.exists():
        return {}
    try:
        encrypted_data = VAULT_PATH.read_text().strip()
        if not encrypted_data:
            return {}
        decrypted_json = decrypt_value(encrypted_data)
        return json.loads(decrypted_json)
    except Exception:
        return {}


def save_vault(vault: dict[str, str]):
    """Save vault dict to encrypted file."""
    VAULT_PATH.parent.mkdir(parents=True, exist_ok=True)
    json_data = json.dumps(vault)
    encrypted = encrypt_value(json_data)
    VAULT_PATH.write_text(encrypted)


def store_api_key(provider: str, api_key: str):
    """Store an API key for a provider."""
    vault = load_vault()
    vault[provider] = api_key
    save_vault(vault)


def get_api_key(provider: str) -> Optional[str]:
    """Retrieve API key for a provider. Returns None if not set."""
    vault = load_vault()
    return vault.get(provider)


def delete_api_key(provider: str) -> bool:
    """Delete an API key. Returns True if key existed."""
    vault = load_vault()
    if provider in vault:
        del vault[provider]
        save_vault(vault)
        return True
    return False


def vault_status() -> dict[str, bool]:
    """Return which providers have keys configured."""
    vault = load_vault()
    return {p: bool(v) for p, v in vault.items()}


def is_vault_empty() -> bool:
    """Check if vault has any keys."""
    return len(load_vault()) == 0
