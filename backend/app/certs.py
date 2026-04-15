"""Auto-generate self-signed TLS certs for LAN HTTPS.

On first boot (or when the LAN IP changes), generates a certificate
covering localhost, ihomenerd.local, the machine hostname, and the
current LAN IP.  This lets browsers grant microphone/camera access
to LAN clients without any manual setup.
"""

import datetime
import logging
import socket
import subprocess
from pathlib import Path

log = logging.getLogger(__name__)

CERT_DAYS = 825  # max macOS trusts without extra flags


def _get_lan_ip() -> str | None:
    """Best-effort LAN IP discovery (no external calls)."""
    try:
        # Connect to a non-routable address to find the default interface IP
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("10.255.255.255", 1))
            return s.getsockname()[0]
    except Exception:
        return None


def _read_san_from_cert(cert_path: Path) -> set[str]:
    """Extract SAN entries from an existing cert via openssl."""
    try:
        out = subprocess.check_output(
            ["openssl", "x509", "-in", str(cert_path), "-noout", "-ext", "subjectAltName"],
            text=True, stderr=subprocess.DEVNULL,
        )
        # Parse "DNS:localhost, DNS:ihomenerd.local, IP:192.168.0.206"
        for line in out.splitlines():
            line = line.strip()
            if "DNS:" in line or "IP:" in line:
                return {e.strip() for e in line.split(",")}
    except Exception:
        pass
    return set()


def ensure_certs(certs_dir: Path) -> tuple[Path, Path] | None:
    """Ensure valid TLS certs exist, regenerate if IP changed.

    Returns (cert_path, key_path) or None if openssl is unavailable.
    """
    certs_dir.mkdir(parents=True, exist_ok=True)
    cert_path = certs_dir / "cert.pem"
    key_path = certs_dir / "key.pem"

    hostname = socket.gethostname()
    lan_ip = _get_lan_ip()

    # Build the SANs we need
    needed_sans = {"DNS:localhost", "DNS:ihomenerd.local", f"DNS:{hostname}", "IP:127.0.0.1"}
    if lan_ip:
        needed_sans.add(f"IP:{lan_ip}")

    # Check if existing cert already covers our SANs
    if cert_path.exists() and key_path.exists():
        existing_sans = _read_san_from_cert(cert_path)
        if needed_sans <= existing_sans:
            log.info("TLS cert valid — SANs match (IP: %s)", lan_ip or "unknown")
            return cert_path, key_path
        log.info("TLS cert SANs stale — regenerating (need %s)", needed_sans - existing_sans)

    # Generate new self-signed cert
    san_string = ",".join(sorted(needed_sans))
    log.info("Generating self-signed TLS cert: %s", san_string)

    try:
        subprocess.check_call([
            "openssl", "req", "-x509",
            "-newkey", "rsa:2048",
            "-keyout", str(key_path),
            "-out", str(cert_path),
            "-days", str(CERT_DAYS),
            "-nodes",
            "-subj", "/CN=iHomeNerd",
            "-addext", f"subjectAltName={san_string}",
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except FileNotFoundError:
        log.warning("openssl not found — running without HTTPS (mic access requires localhost)")
        return None
    except subprocess.CalledProcessError as e:
        log.warning("openssl failed (%s) — running without HTTPS", e)
        return None

    log.info("TLS cert generated: %s", cert_path)
    return cert_path, key_path
