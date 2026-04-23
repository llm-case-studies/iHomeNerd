"""TLS certificate management — home CA + signed server certs.

On first boot, generates or reuses a home Certificate Authority (CA):
  - ca.crt  — the trust anchor users install on their devices (once)
  - ca.key  — can be shared explicitly for a whole-home trust setup

Then uses the CA to sign a server certificate covering localhost,
ihomenerd.local, the hostname, and the current LAN IP.  When the
LAN IP changes, only the server cert is regenerated — the CA stays
stable, so devices that already installed it keep trusting.

Setup page at /setup walks users through installing ca.crt on their
device (auto-detects OS/browser, shows only relevant instructions).
"""

import datetime
import logging
import os
import socket
import subprocess
from pathlib import Path

log = logging.getLogger(__name__)

CA_DAYS = 3650       # 10 years — CA should outlive the hardware
SERVER_DAYS = 825    # ~2 years — max macOS trusts without extra flags
CA_SUBJECT = "/CN=iHomeNerd Home CA/O=iHomeNerd"
SERVER_SUBJECT = "/CN=iHomeNerd"


def _configured_path(key: str) -> Path | None:
    value = os.environ.get(key, "").strip()
    return Path(value) if value else None


def _get_ca_paths(certs_dir: Path) -> tuple[Path, Path]:
    """CA material can live in a shared host directory or locally in /data."""
    return (
        _configured_path("IHN_CA_CERT_PATH") or (certs_dir / "ca.crt"),
        _configured_path("IHN_CA_KEY_PATH") or (certs_dir / "ca.key"),
    )


def _get_lan_ip() -> str | None:
    """Best-effort LAN IP discovery (no external calls)."""
    env_ip = os.environ.get("IHN_CERT_LAN_IP", "").strip()
    if env_ip:
        return env_ip
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("10.255.255.255", 1))
            return s.getsockname()[0]
    except Exception:
        return None


def _get_hostnames() -> set[str]:
    """Hostnames that should appear in the server certificate."""
    names = {"localhost", "ihomenerd.local"}

    hostname = socket.gethostname().strip()
    if hostname:
        names.add(hostname)

    env_names = os.environ.get("IHN_CERT_HOSTNAMES", "")
    for name in env_names.split(","):
        name = name.strip()
        if name:
            names.add(name)

    return names


def _read_san_from_cert(cert_path: Path) -> set[str]:
    """Extract SAN entries from an existing cert via openssl."""
    try:
        out = subprocess.check_output(
            ["openssl", "x509", "-in", str(cert_path), "-noout", "-ext", "subjectAltName"],
            text=True, stderr=subprocess.DEVNULL,
        )
        for line in out.splitlines():
            line = line.strip()
            if "DNS:" in line or "IP:" in line:
                return {e.strip() for e in line.split(",")}
    except Exception:
        pass
    return set()


def _generate_ca(certs_dir: Path) -> tuple[Path, Path] | None:
    """Generate a home CA key + cert. Returns (ca_cert, ca_key) or None."""
    ca_key = certs_dir / "ca.key"
    ca_cert = certs_dir / "ca.crt"

    log.info("Generating iHomeNerd home CA (valid %d days)", CA_DAYS)
    try:
        # Generate CA private key
        subprocess.check_call([
            "openssl", "genrsa", "-out", str(ca_key), "4096",
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Generate CA certificate (self-signed, with CA:TRUE)
        subprocess.check_call([
            "openssl", "req", "-x509", "-new", "-nodes",
            "-key", str(ca_key),
            "-sha256",
            "-days", str(CA_DAYS),
            "-subj", CA_SUBJECT,
            "-addext", "basicConstraints=critical,CA:TRUE,pathlen:0",
            "-addext", "keyUsage=critical,keyCertSign,cRLSign",
            "-out", str(ca_cert),
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except FileNotFoundError:
        log.warning("openssl not found — cannot generate CA")
        return None
    except subprocess.CalledProcessError as e:
        log.warning("CA generation failed: %s", e)
        return None

    log.info("Home CA generated: %s", ca_cert)
    return ca_cert, ca_key


def _generate_server_cert(
    certs_dir: Path,
    ca_cert: Path,
    ca_key: Path,
    san_string: str,
) -> tuple[Path, Path] | None:
    """Generate a server cert signed by the local CA."""
    server_key = certs_dir / "server.key"
    server_cert = certs_dir / "server.crt"
    csr_path = certs_dir / "server.csr"
    ext_path = certs_dir / "server.ext"

    log.info("Generating server cert: %s", san_string)

    # Write extensions file (openssl x509 -extfile needs this)
    ext_path.write_text(
        f"subjectAltName={san_string}\n"
        f"basicConstraints=CA:FALSE\n"
        f"keyUsage=digitalSignature,keyEncipherment\n"
        f"extendedKeyUsage=serverAuth\n"
    )

    try:
        # Generate server private key
        subprocess.check_call([
            "openssl", "genrsa", "-out", str(server_key), "2048",
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Generate CSR
        subprocess.check_call([
            "openssl", "req", "-new",
            "-key", str(server_key),
            "-subj", SERVER_SUBJECT,
            "-out", str(csr_path),
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Sign with CA
        subprocess.check_call([
            "openssl", "x509", "-req",
            "-in", str(csr_path),
            "-CA", str(ca_cert),
            "-CAkey", str(ca_key),
            "-set_serial", str(int.from_bytes(os.urandom(16), "big")),
            "-out", str(server_cert),
            "-days", str(SERVER_DAYS),
            "-sha256",
            "-extfile", str(ext_path),
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Clean up temp files
        csr_path.unlink(missing_ok=True)
        ext_path.unlink(missing_ok=True)

    except FileNotFoundError:
        log.warning("openssl not found — cannot generate server cert")
        return None
    except subprocess.CalledProcessError as e:
        log.warning("Server cert generation failed: %s", e)
        return None

    log.info("Server cert generated: %s (signed by CA)", server_cert)
    return server_cert, server_key


def get_ca_cert_path(certs_dir: Path) -> Path | None:
    """Return the CA cert path if it exists."""
    ca_cert, _ = _get_ca_paths(certs_dir)
    return ca_cert if ca_cert.exists() else None


def ensure_certs(certs_dir: Path) -> tuple[Path, Path] | None:
    """Ensure valid TLS certs exist, regenerate if IP changed.

    Returns (cert_path, key_path) for the server cert, or None
    if openssl is unavailable.

    Certificate structure:
      ca.crt / ca.key         — home CA (generated once or explicitly reused)
      server.crt / server.key — signed by CA (regenerated when IP changes)
    """
    certs_dir.mkdir(parents=True, exist_ok=True)

    ca_cert, ca_key = _get_ca_paths(certs_dir)
    server_cert = certs_dir / "server.crt"
    server_key = certs_dir / "server.key"

    lan_ip = _get_lan_ip()

    # Build the SANs we need
    needed_sans = {f"DNS:{name}" for name in _get_hostnames()}
    needed_sans.add("IP:127.0.0.1")
    if lan_ip:
        needed_sans.add(f"IP:{lan_ip}")

    # Step 1: If a valid server cert is already present and chains to the CA,
    # we can operate without needing the CA private key on this node.
    ca_exists = ca_cert.exists()
    ca_key_exists = ca_key.exists()

    # Step 2: Check if server cert needs (re)generation
    needs_server_cert = False
    if not server_cert.exists() or not server_key.exists():
        needs_server_cert = True
        log.info("Server cert missing — generating")
    else:
        existing_sans = _read_san_from_cert(server_cert)
        if not needed_sans <= existing_sans:
            needs_server_cert = True
            log.info("Server cert SANs stale — regenerating (need %s)", needed_sans - existing_sans)
        else:
            # Verify it's signed by our CA (not an old self-signed cert)
            try:
                if not ca_exists:
                    raise FileNotFoundError("CA certificate missing")
                subprocess.check_call([
                    "openssl", "verify", "-CAfile", str(ca_cert), str(server_cert),
                ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except (subprocess.CalledProcessError, FileNotFoundError):
                needs_server_cert = True
                log.info("Server cert not signed by current CA — regenerating")

    # Step 3: Ensure CA exists if we need to sign locally on this node.
    if needs_server_cert and not ca_exists:
        if _configured_path("IHN_CA_CERT_PATH") or _configured_path("IHN_CA_KEY_PATH"):
            log.warning("Configured home CA missing: cert=%s key=%s", ca_cert, ca_key)
            return None
        result = _generate_ca(certs_dir)
        if not result:
            return None
        ca_cert, ca_key = result
        ca_exists = True
        ca_key_exists = True

    if needs_server_cert:
        if not ca_key_exists:
            log.warning("CA key missing — cannot sign a server cert on this node")
            return None
        san_string = ",".join(sorted(needed_sans))
        result = _generate_server_cert(certs_dir, ca_cert, ca_key, san_string)
        if not result:
            return None
        server_cert, server_key = result
    else:
        log.info("TLS cert valid — SANs match (IP: %s)", lan_ip or "unknown")

    return server_cert, server_key
