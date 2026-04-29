"""iHomeNerd full bootstrap trust E2E contract test.

Tests the complete trust bootstrap flow:
  1. Fetch CA cert from :17778 (plain HTTP)
  2. Create a TLS client that trusts ONLY the fetched CA
  3. Verify TLS handshake on :17777 succeeds with chain validation
  4. Hit /health through the trusted connection
  5. Negative case: without the CA, strict TLS validation should fail

Usage:
    IHN_BOOTSTRAP_URL=http://192.168.0.220:17778 \\
    IHN_NODE_URL=https://192.168.0.220:17777 \\
    pytest backend/tests/test_bootstrap_trust_e2e.py -v
"""

from __future__ import annotations

import os
import ssl
import tempfile
from typing import AsyncGenerator

import httpx
import pytest

from cryptography import x509
from cryptography.hazmat.backends import default_backend


BOOTSTRAP_URL = os.environ.get("IHN_BOOTSTRAP_URL", "http://localhost:17778")
NODE_URL = os.environ.get("IHN_NODE_URL", "https://localhost:17777")


@pytest.fixture(scope="session")
def bootstrap_base() -> str:
    return BOOTSTRAP_URL


@pytest.fixture(scope="session")
def node_url() -> str:
    return NODE_URL


@pytest.fixture
async def bootstrap_client(bootstrap_base: str) -> AsyncGenerator[httpx.AsyncClient, None]:
    async with httpx.AsyncClient(base_url=bootstrap_base, timeout=10) as c:
        yield c


@pytest.fixture(scope="session")
def ca_cert_pem(bootstrap_base: str) -> str:
    r = httpx.get(f"{bootstrap_base}/setup/ca.crt", timeout=10)
    r.raise_for_status()
    return r.text


@pytest.fixture(scope="session")
def ca_cert_file(ca_cert_pem: str):
    with tempfile.NamedTemporaryFile(mode="w", suffix=".crt", delete=False) as f:
        f.write(ca_cert_pem)
        f.flush()
        yield f.name
    os.unlink(f.name)


@pytest.fixture(scope="session")
def ca_cert(ca_cert_pem: str) -> x509.Certificate:
    return x509.load_pem_x509_certificate(ca_cert_pem.encode(), default_backend())


# ---------------------------------------------------------------------------
# Step 1: Fetch CA cert
# ---------------------------------------------------------------------------


def test_bootstrap_ca_cert_accessible(bootstrap_client: httpx.AsyncClient):
    async def _run():
        r = await bootstrap_client.get("/setup/ca.crt")
        assert r.status_code == 200
        assert "BEGIN CERTIFICATE" in r.text
    import asyncio
    asyncio.get_event_loop().run_until_complete(_run())


def test_ca_cert_is_valid_x509(ca_cert: x509.Certificate):
    assert ca_cert.subject is not None
    assert ca_cert.issuer is not None


def test_ca_cert_fingerprint_is_stable(ca_cert: x509.Certificate, ca_cert_pem: str):
    from cryptography.hazmat.primitives import hashes
    fp1 = ca_cert.fingerprint(hashes.SHA256()).hex()

    cert2 = x509.load_pem_x509_certificate(ca_cert_pem.encode(), default_backend())
    fp2 = cert2.fingerprint(hashes.SHA256()).hex()

    assert fp1 == fp2, "CA fingerprint must be stable across reloads"


# ---------------------------------------------------------------------------
# Step 2: Create TLS client trusting the CA
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Step 3: TLS handshake with chain validation
# ---------------------------------------------------------------------------


async def test_tls_handshake_with_ca_succeeds(node_url: str, ca_cert_file: str):
    from urllib.parse import urlparse

    parsed = urlparse(node_url)
    host = parsed.hostname
    port = parsed.port or 17777

    ctx = ssl.create_default_context(cafile=ca_cert_file)
    ctx.check_hostname = True

    import socket
    with socket.create_connection((host, port), timeout=10) as sock:
        with ctx.wrap_socket(sock, server_hostname=host) as ssock:
            cert_bin = ssock.getpeercert(binary_form=True)
            assert cert_bin is not None, "TLS handshake must return peer certificate"

            cert = x509.load_der_x509_certificate(cert_bin, default_backend())
            assert cert is not None, "Peer certificate must be valid X.509"


async def test_tls_handshake_without_ca_fails(node_url: str):
    from urllib.parse import urlparse

    parsed = urlparse(node_url)
    host = parsed.hostname
    port = parsed.port or 17777

    ctx = ssl.create_default_context()
    ctx.check_hostname = True

    import socket
    try:
        with socket.create_connection((host, port), timeout=10) as sock:
            with ctx.wrap_socket(sock, server_hostname=host) as ssock:
                pytest.fail(
                    "TLS handshake should FAIL with default trust store "
                    "(iPhone leaf cert is not trusted by system roots)"
                )
    except ssl.SSLError as e:
        err_msg = str(e).lower()
        assert any(kw in err_msg for kw in ("certificate", "verify", "unknown", "self-signed", "unable")), \
            f"Expected certificate verification error, got: {e}"
    except (socket.timeout, ConnectionRefusedError, OSError) as e:
        pytest.skip(f"Connection/network error (not a cert validation failure): {e}")


# ---------------------------------------------------------------------------
# Step 4: /health through trusted connection
# ---------------------------------------------------------------------------


async def test_health_through_ca_trust(node_url: str, ca_cert_file: str):
    ctx = ssl.create_default_context(cafile=ca_cert_file)
    async with httpx.AsyncClient(base_url=node_url, verify=ctx, timeout=10) as client:
        r = await client.get("/health")
        assert r.status_code == 200, f"/health failed: {r.status_code}: {r.text[:200]}"
        body = r.json()
        assert body.get("product") == "iHomeNerd"
        assert body.get("ok") is True


async def test_discover_through_ca_trust(node_url: str, ca_cert_file: str):
    ctx = ssl.create_default_context(cafile=ca_cert_file)
    async with httpx.AsyncClient(base_url=node_url, verify=ctx, timeout=10) as client:
        r = await client.get("/discover")
        assert r.status_code == 200, f"/discover failed: {r.status_code}: {r.text[:200]}"
        body = r.json()
        assert "role" in body


async def test_capabilities_through_ca_trust(node_url: str, ca_cert_file: str):
    ctx = ssl.create_default_context(cafile=ca_cert_file)
    async with httpx.AsyncClient(base_url=node_url, verify=ctx, timeout=10) as client:
        r = await client.get("/capabilities")
        if r.status_code == 404:
            pytest.skip("Node does not have /capabilities (known iOS gap)")
        assert r.status_code == 200, f"/capabilities failed: {r.status_code}: {r.text[:200]}"


# ---------------------------------------------------------------------------
# Step 5: Trust-status consistency
# ---------------------------------------------------------------------------


def test_trust_status_matches_ca(bootstrap_base: str, ca_cert: x509.Certificate):
    from cryptography.hazmat.primitives import hashes

    r = httpx.get(f"{bootstrap_base}/setup/trust-status", timeout=10)
    r.raise_for_status()
    body = r.json()

    assert body.get("status") == "trusted", f"expected status=trusted, got {body.get('status')}"
    assert body["homeCa"]["present"] is True
    assert body["serverCert"]["present"] is True

    reported_fp = body["homeCa"]["fingerprintSha256"].replace(":", "").upper()
    actual_fp = ca_cert.fingerprint(hashes.SHA256()).hex().upper()
    assert reported_fp == actual_fp, \
        f"CA fingerprint mismatch: trust-status={reported_fp}, actual={actual_fp}"
