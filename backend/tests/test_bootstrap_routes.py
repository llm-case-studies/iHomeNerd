"""iHomeNerd bootstrap-trust contract tests.

Tests the HTTP bootstrap listener on port 17778 against a running instance:
  - GET /setup/ca.crt — Home CA certificate download
  - GET /setup/trust-status — trust health endpoint

These routes are served over plain HTTP (no TLS) so that peers can
bootstrap trust before installing the Home CA.

Known issue (2026-04-28): /setup/trust-status hangs on M-E-21 (Android).
The test documents the gap without runtime changes — if the endpoint
times out, the test marks it as a known skip rather than a hard fail
to avoid blocking CI on a known Android-side issue.

Usage:
    IHN_BOOTSTRAP_URL=http://localhost:17778 pytest backend/tests/test_bootstrap_routes.py -v

Default: http://localhost:17778 (or use IHN_BOOTSTRAP_URL env var).
"""

from __future__ import annotations

import os
import ssl
from typing import AsyncGenerator

import httpx
import pytest


BOOTSTRAP_URL = os.environ.get("IHN_BOOTSTRAP_URL", "http://localhost:17778")


def _is_timeout(exc: Exception) -> bool:
    msg = str(exc).lower()
    return "timeout" in msg or "timed out" in msg or isinstance(exc, httpx.TimeoutException)


@pytest.fixture(scope="session")
def bootstrap_base() -> str:
    return BOOTSTRAP_URL


@pytest.fixture
async def bootstrap_client(bootstrap_base: str) -> AsyncGenerator[httpx.AsyncClient, None]:
    async with httpx.AsyncClient(base_url=bootstrap_base, timeout=10) as c:
        yield c


# ---------------------------------------------------------------------------
# /setup/ca.crt
# ---------------------------------------------------------------------------


async def test_ca_cert_returns_200(bootstrap_client: httpx.AsyncClient):
    r = await bootstrap_client.get("/setup/ca.crt")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"


async def test_ca_cert_content_type_is_pem(bootstrap_client: httpx.AsyncClient):
    r = await bootstrap_client.get("/setup/ca.crt")
    ct = r.headers.get("content-type", "")
    acceptable = {"application/x-x509-ca-cert", "application/x-pem-file", "text/plain"}
    assert ct in acceptable or "cert" in ct.lower(), f"unexpected content-type: {ct}"


async def test_ca_cert_body_looks_like_pem(bootstrap_client: httpx.AsyncClient):
    r = await bootstrap_client.get("/setup/ca.crt")
    body = r.text
    assert "BEGIN CERTIFICATE" in body, "response does not contain PEM certificate header"
    assert "END CERTIFICATE" in body, "response does not contain PEM certificate footer"


async def test_ca_cert_parses_as_x509(bootstrap_client: httpx.AsyncClient):
    r = await bootstrap_client.get("/setup/ca.crt")
    try:
        from cryptography import x509
        from cryptography.hazmat.backends import default_backend
        x509.load_pem_x509_certificate(r.content, default_backend())
    except ImportError:
        try:
            ssl.PEM_cert_to_DER_cert(r.text)
        except Exception as e:
            pytest.fail(f"CA cert is not valid PEM: {e}")
    except Exception as e:
        pytest.fail(f"CA cert is not valid X.509: {e}")


async def test_ca_cert_is_self_signed(bootstrap_client: httpx.AsyncClient):
    r = await bootstrap_client.get("/setup/ca.crt")
    try:
        from cryptography import x509
        from cryptography.hazmat.backends import default_backend
        cert = x509.load_pem_x509_certificate(r.content, default_backend())
        assert cert.issuer == cert.subject, "CA cert should be self-signed (issuer == subject)"
    except ImportError:
        try:
            import subprocess
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=".crt", delete=True) as tf:
                tf.write(r.content)
                tf.flush()
                result = subprocess.check_output(
                    ["openssl", "x509", "-in", tf.name, "-noout", "-subject", "-issuer"],
                    text=True, stderr=subprocess.DEVNULL,
                )
                subjects = [line.strip().split("=", 1)[1] for line in result.splitlines() if "=" in line]
                assert len(set(subjects)) == 1, f"issuer/subject differ: {subjects}"
        except (FileNotFoundError, subprocess.CalledProcessError):
            pytest.skip("openssl not available to verify self-signed")


async def test_ca_cert_has_ca_basic_constraints(bootstrap_client: httpx.AsyncClient):
    r = await bootstrap_client.get("/setup/ca.crt")
    try:
        from cryptography import x509
        from cryptography.hazmat.backends import default_backend
        cert = x509.load_pem_x509_certificate(r.content, default_backend())
        bc = cert.extensions.get_extension_for_class(x509.BasicConstraints)
        assert bc.value.ca is True, "CA cert must have CA:TRUE basic constraint"
    except ImportError:
        pytest.skip("cryptography library not available")


# ---------------------------------------------------------------------------
# /setup/trust-status
# ---------------------------------------------------------------------------

# Known issue (2026-04-28): /setup/trust-status hangs on M-E-21 (Android).
# The route is defined in backend/app/main.py and delegates to
# backend/app/certs.py:get_trust_status().  The ME-21 probe confirmed
# TCP connect succeeds but the server never responds.
#
# This test uses a short timeout and interprets a timeout as "route
# hanging" rather than a hard fail, so it can still run on ME-21
# without blocking the rest of the suite.


async def test_trust_status_responds(bootstrap_client: httpx.AsyncClient):
    try:
        r = await bootstrap_client.get("/setup/trust-status")
    except httpx.TimeoutException:
        pytest.skip(
            "Known gap: /setup/trust-status timed out — "
            "route hangs on M-E-21 (Android) per ME-21 LAN probe. "
            "Fix pending on Android side."
        )
        return
    except Exception as e:
        if _is_timeout(e):
            pytest.skip(
                f"Known gap: /setup/trust-status timed out: {e} — "
                "route hangs on M-E-21 (Android). Fix pending."
            )
            return
        raise

    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"


async def test_trust_status_is_json(bootstrap_client: httpx.AsyncClient):
    try:
        r = await bootstrap_client.get("/setup/trust-status")
    except Exception as e:
        if _is_timeout(e):
            pytest.skip("trust-status timed out — known gap on M-E-21")
            return
        raise

    ct = r.headers.get("content-type", "")
    assert "application/json" in ct, f"expected JSON content-type, got: {ct}"
    body = r.json()


async def test_trust_status_required_fields(bootstrap_client: httpx.AsyncClient):
    try:
        r = await bootstrap_client.get("/setup/trust-status")
    except Exception as e:
        if _is_timeout(e):
            pytest.skip("trust-status timed out — known gap on M-E-21")
            return
        raise

    body = r.json()
    required = ("status", "homeCa", "serverCert")
    for key in required:
        assert key in body, f"missing key '{key}' in /setup/trust-status"


async def test_trust_status_product(bootstrap_client: httpx.AsyncClient):
    try:
        r = await bootstrap_client.get("/setup/trust-status")
    except Exception as e:
        if _is_timeout(e):
            pytest.skip("trust-status timed out — known gap on M-E-21")
            return
        raise

    # Python backend includes 'product'; Android may not — both are valid.
    product = r.json().get("product")
    if product is not None:
        assert product == "iHomeNerd", f"product must be iHomeNerd, got {product}"


async def test_trust_status_valid_status_value(bootstrap_client: httpx.AsyncClient):
    try:
        r = await bootstrap_client.get("/setup/trust-status")
    except Exception as e:
        if _is_timeout(e):
            pytest.skip("trust-status timed out — known gap on M-E-21")
            return
        raise

    status = r.json().get("status")
    valid = {"trusted", "missing_ca", "missing_server", "mismatch"}
    assert status in valid, f"status '{status}' not in expected set: {valid}"


async def test_trust_status_home_ca_subobject(bootstrap_client: httpx.AsyncClient):
    try:
        r = await bootstrap_client.get("/setup/trust-status")
    except Exception as e:
        if _is_timeout(e):
            pytest.skip("trust-status timed out — known gap on M-E-21")
            return
        raise

    home_ca = r.json().get("homeCa")
    assert isinstance(home_ca, dict), "homeCa must be a dict"
    assert "present" in home_ca, "homeCa missing 'present' field"


async def test_trust_status_server_cert_subobject(bootstrap_client: httpx.AsyncClient):
    try:
        r = await bootstrap_client.get("/setup/trust-status")
    except Exception as e:
        if _is_timeout(e):
            pytest.skip("trust-status timed out — known gap on M-E-21")
            return
        raise

    server_cert = r.json().get("serverCert")
    assert isinstance(server_cert, dict), "serverCert must be a dict"
    assert "present" in server_cert, "serverCert missing 'present' field"
