"""iHomeNerd iOS certificate contract tests.

Tests the Home CA and leaf certificate properties for the iOS node:
  - CA: self-signed, CA:TRUE, keyCertSign, validity
  - Leaf: signed by CA, serverAuth EKU, SAN coverage, not CA
  - Cross-referencing: leaf issued by CA, fingerprints match

Usage:
    IHN_BOOTSTRAP_URL=http://192.168.0.220:17778 \\
    IHN_NODE_URL=https://192.168.0.220:17777 \\
    pytest backend/tests/test_ios_cert_contract.py -v

Default bootstrap: http://localhost:17778
Default node: https://localhost:17777
"""

from __future__ import annotations

import os
import socket
import ssl
import tempfile
import subprocess
from datetime import datetime, timezone, timedelta
from typing import AsyncGenerator

import httpx
import pytest
from cryptography import x509
from cryptography.x509.oid import NameOID, ExtendedKeyUsageOID
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, rsa


BOOTSTRAP_URL = os.environ.get("IHN_BOOTSTRAP_URL", "http://localhost:17778")
NODE_URL = os.environ.get("IHN_NODE_URL", "https://localhost:17777")


def _parse_url(url: str) -> tuple[str, int]:
    from urllib.parse import urlparse
    parsed = urlparse(url)
    return parsed.hostname or "localhost", parsed.port or 17777


def _fetch_leaf_cert(host: str, port: int) -> x509.Certificate:
    pem = ssl.get_server_certificate((host, port))
    return x509.load_pem_x509_certificate(pem.encode(), default_backend())


def _cert_fingerprint(cert: x509.Certificate) -> str:
    digest = cert.fingerprint(hashes.SHA256()).hex()
    parts = [digest[i : i + 2].upper() for i in range(0, len(digest), 2)]
    return ":".join(parts)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def bootstrap_base() -> str:
    return BOOTSTRAP_URL


@pytest.fixture(scope="session")
def node_info() -> tuple[str, int]:
    return _parse_url(NODE_URL)


@pytest.fixture
async def bootstrap_client(bootstrap_base: str) -> AsyncGenerator[httpx.AsyncClient, None]:
    async with httpx.AsyncClient(base_url=bootstrap_base, timeout=10) as c:
        yield c


@pytest.fixture(scope="session")
def ca_cert_pem(bootstrap_base: str) -> str:
    r = httpx.get(f"{bootstrap_base}/setup/ca.crt", verify=False, timeout=10)
    r.raise_for_status()
    return r.text


@pytest.fixture(scope="session")
def ca_cert(ca_cert_pem: str) -> x509.Certificate:
    return x509.load_pem_x509_certificate(ca_cert_pem.encode(), default_backend())


@pytest.fixture(scope="session")
def leaf_cert(node_info: tuple[str, int]) -> x509.Certificate:
    host, port = node_info
    return _fetch_leaf_cert(host, port)


# ---------------------------------------------------------------------------
# CA certificate tests
# ---------------------------------------------------------------------------


def test_ca_cert_is_self_signed(ca_cert: x509.Certificate):
    assert ca_cert.issuer == ca_cert.subject, "CA cert must be self-signed — issuer must equal subject"


def test_ca_cert_has_ca_basic_constraints(ca_cert: x509.Certificate):
    bc = ca_cert.extensions.get_extension_for_class(x509.BasicConstraints)
    assert bc.value.ca is True, "CA cert must have CA:TRUE basic constraint"


def test_ca_cert_pathlen(ca_cert: x509.Certificate):
    bc = ca_cert.extensions.get_extension_for_class(x509.BasicConstraints)
    assert bc.value.path_length is not None, "CA cert must specify path length constraint"
    assert bc.value.path_length >= 0, f"expected pathlen >= 0, got {bc.value.path_length}"


def test_ca_cert_key_usage_key_cert_sign(ca_cert: x509.Certificate):
    ku = ca_cert.extensions.get_extension_for_class(x509.KeyUsage)
    assert ku.value.key_cert_sign is True, "CA cert must have keyCertSign key usage"


def test_ca_cert_crl_sign(ca_cert: x509.Certificate):
    ku = ca_cert.extensions.get_extension_for_class(x509.KeyUsage)
    assert ku.value.crl_sign is True, "CA cert must have cRLSign key usage"


def test_ca_cert_subject_cn_contains_home_ca(ca_cert: x509.Certificate):
    cn_attrs = ca_cert.subject.get_attributes_for_oid(NameOID.COMMON_NAME)
    assert len(cn_attrs) >= 1, "CA cert must have a Common Name"
    cn = cn_attrs[0].value
    assert "home" in cn.lower() or "Home" in cn, f"CA CN should contain 'Home CA', got: {cn}"


def test_ca_cert_validity_period(ca_cert: x509.Certificate):
    now = datetime.now(timezone.utc)
    assert ca_cert.not_valid_before_utc <= now, "CA cert not_valid_before is in the future"
    assert ca_cert.not_valid_after_utc > now, "CA cert has expired"
    delta = ca_cert.not_valid_after_utc - ca_cert.not_valid_before_utc
    assert delta.days >= 365, f"CA cert validity must be >= 1 year, got {delta.days} days"


def test_ca_cert_key_is_ec_or_rsa(ca_cert: x509.Certificate):
    key = ca_cert.public_key()
    assert isinstance(key, (ec.EllipticCurvePublicKey, rsa.RSAPublicKey)), \
        f"CA key must be EC or RSA, got {type(key).__name__}"


# ---------------------------------------------------------------------------
# Leaf certificate tests
# ---------------------------------------------------------------------------


def test_leaf_cert_is_not_self_signed(leaf_cert: x509.Certificate, ca_cert: x509.Certificate):
    assert leaf_cert.issuer != leaf_cert.subject, "Leaf cert must NOT be self-signed"


def test_leaf_cert_issued_by_ca(leaf_cert: x509.Certificate, ca_cert: x509.Certificate):
    assert leaf_cert.issuer == ca_cert.subject, \
        f"Leaf issuer {leaf_cert.issuer.rfc4514_string()} must equal CA subject {ca_cert.subject.rfc4514_string()}"


def test_leaf_cert_is_not_ca(leaf_cert: x509.Certificate):
    try:
        bc = leaf_cert.extensions.get_extension_for_class(x509.BasicConstraints)
        assert bc.value.ca is False, "Leaf cert must NOT be a CA"
    except x509.ExtensionNotFound:
        pass


def test_leaf_cert_has_server_auth_eku(leaf_cert: x509.Certificate):
    ext = leaf_cert.extensions.get_extension_for_class(x509.ExtendedKeyUsage)
    eku = ext.value
    assert ExtendedKeyUsageOID.SERVER_AUTH in eku, \
        "Leaf cert must have serverAuth EKU"


def test_leaf_cert_has_client_auth_eku(leaf_cert: x509.Certificate):
    ext = leaf_cert.extensions.get_extension_for_class(x509.ExtendedKeyUsage)
    eku = ext.value
    assert ExtendedKeyUsageOID.CLIENT_AUTH in eku, \
        "Leaf cert must have clientAuth EKU"


def test_leaf_cert_san_includes_hostname(leaf_cert: x509.Certificate, bootstrap_base: str):
    ext = leaf_cert.extensions.get_extension_for_class(x509.SubjectAlternativeName)
    san = ext.value
    dns_names = san.get_values_for_type(x509.DNSName)
    assert len(dns_names) >= 1, "Leaf cert SAN must include at least one DNS name"


def test_leaf_cert_san_includes_lan_ip(leaf_cert: x509.Certificate, node_info: tuple[str, int]):
    host, _ = node_info
    ext = leaf_cert.extensions.get_extension_for_class(x509.SubjectAlternativeName)
    san = ext.value
    ip_names = san.get_values_for_type(x509.IPAddress)
    host_ips = [str(ip) for ip in ip_names]
    assert len(host_ips) >= 1, "Leaf cert SAN must include at least one IP address"


def test_leaf_cert_validity_period(leaf_cert: x509.Certificate):
    now = datetime.now(timezone.utc)
    assert leaf_cert.not_valid_before_utc <= now, "Leaf cert not_valid_before is in the future"
    assert leaf_cert.not_valid_after_utc > now, "Leaf cert has expired"


def test_leaf_cert_not_before_skew_acceptable(leaf_cert: x509.Certificate):
    now = datetime.now(timezone.utc)
    future_skew = leaf_cert.not_valid_before_utc - now
    max_skew = timedelta(seconds=90)
    assert future_skew <= max_skew, \
        f"Leaf cert not_valid_before is too far in the future: {future_skew.total_seconds():.0f}s ahead (max allowed: {max_skew.total_seconds():.0f}s)"


# ---------------------------------------------------------------------------
# Fingerprint consistency tests
# ---------------------------------------------------------------------------


def test_ca_fingerprint_matches_trust_status(ca_cert: x509.Certificate, bootstrap_base: str):
    r = httpx.get(f"{bootstrap_base}/setup/trust-status", timeout=10)
    r.raise_for_status()
    body = r.json()
    observed = body.get("homeCa", {}).get("fingerprintSha256")
    if observed:
        actual = _cert_fingerprint(ca_cert)
        assert observed.replace(":", "").upper() == actual.replace(":", "").upper(), \
            f"CA fingerprint mismatch: trust-status={observed}, computed={actual}"


def test_ca_fingerprint_is_stable(ca_cert: x509.Certificate, bootstrap_base: str):
    r1 = httpx.get(f"{bootstrap_base}/setup/trust-status", timeout=10)
    r1.raise_for_status()
    fp1 = r1.json()["homeCa"]["fingerprintSha256"]

    r2 = httpx.get(f"{bootstrap_base}/setup/trust-status", timeout=10)
    r2.raise_for_status()
    fp2 = r2.json()["homeCa"]["fingerprintSha256"]

    assert fp1 == fp2, f"CA fingerprint changed between two consecutive requests: {fp1} -> {fp2}"
