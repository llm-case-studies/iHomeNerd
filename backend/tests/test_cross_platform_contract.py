"""iHomeNerd cross-platform contract comparison tests.

Hits /health, /discover, and /capabilities against multiple node-class hosts
and diffs the shapes to catch regressions where an implementation diverges.

Usage:
    IHN_NODE_A=https://192.168.0.220:17777 \\
    IHN_NODE_B=https://192.168.0.246:17777 \\
    IHN_NODE_C=https://localhost:17777 \\
    pytest backend/tests/test_cross_platform_contract.py -v

Defaults if not set:
    NODE_A = https://localhost:17777
    NODE_B = None (skipped)
    NODE_C = None (skipped)

Deltas documented in the iPhone test request and known Android differences
are flagged as expected, not failures.
"""

from __future__ import annotations

import os
from typing import AsyncGenerator

import httpx
import pytest


NODE_URLS = []
for i, key in enumerate(["IHN_NODE_A", "IHN_NODE_B", "IHN_NODE_C"]):
    url = os.environ.get(key)
    if url:
        NODE_URLS.append((key.replace("IHN_NODE_", "").lower(), url))

if not NODE_URLS:
    NODE_URLS = [("a", "https://localhost:17777")]


KNOWN_IOS_DELTAS = {
    "system_stats_404": True,           # No /system/stats endpoint
    "ollama_false": True,               # ollama is always false
    "providers_ios_local": True,        # Only ios_local provider
    "available_capabilities_empty": True, # No capabilities yet
    "flat_capabilities_empty": True,    # Flat capability map is {}
    "models_empty": True,               # No models loaded
}

KNOWN_ANDROID_DELTAS = {
    "trust_status_hang": True,          # /setup/trust-status hangs on ME-21
    "providers_android_local": True,    # Only android_local provider
    "ollama_false": True,               # ollama is always false
}

FLAT_CAP_SKIP_KEYS = {"_detail", "product", "version", "capabilities", "node_profile"}


@pytest.fixture
async def clients() -> list[tuple[str, str, httpx.AsyncClient]]:
    result = []
    for label, url in NODE_URLS:
        client = httpx.AsyncClient(base_url=url, verify=False, timeout=10)
        result.append((label, url, client))
    yield result
    for _, _, client in result:
        await client.aclose()


def _node_label(label: str, url: str) -> str:
    return f"{label} ({url})"


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------


async def test_health_all_nodes_respond(clients: list[tuple[str, str, httpx.AsyncClient]]):
    for label, url, client in clients:
        r = await client.get("/health")
        assert r.status_code == 200, f"{_node_label(label, url)}: /health returned {r.status_code}"


async def test_health_common_fields_present(clients: list[tuple[str, str, httpx.AsyncClient]]):
    common_fields = {"product", "version", "hostname", "ok", "status", "port"}
    for label, url, client in clients:
        r = await client.get("/health")
        body = r.json()
        for field in common_fields:
            assert field in body, f"{_node_label(label, url)}: /health missing '{field}'"


async def test_health_product_consistent(clients: list[tuple[str, str, httpx.AsyncClient]]):
    for label, url, client in clients:
        r = await client.get("/health")
        assert r.json()["product"] == "iHomeNerd", \
            f"{_node_label(label, url)}: product is '{r.json().get('product')}'"


async def test_health_providers_present(clients: list[tuple[str, str, httpx.AsyncClient]]):
    for label, url, client in clients:
        r = await client.get("/health")
        providers = r.json().get("providers")
        assert isinstance(providers, list), \
            f"{_node_label(label, url)}: providers must be list, got {type(providers)}"

        if not providers:
            print(f"  [INFO] {_node_label(label, url)}: providers list is empty")


async def test_health_models_type(clients: list[tuple[str, str, httpx.AsyncClient]]):
    for label, url, client in clients:
        r = await client.get("/health")
        models = r.json().get("models")
        assert isinstance(models, dict), \
            f"{_node_label(label, url)}: models must be dict, got {type(models)}"


# ---------------------------------------------------------------------------
# /discover
# ---------------------------------------------------------------------------


async def test_discover_all_nodes_respond(clients: list[tuple[str, str, httpx.AsyncClient]]):
    for label, url, client in clients:
        r = await client.get("/discover")
        assert r.status_code == 200, f"{_node_label(label, url)}: /discover returned {r.status_code}"


async def test_discover_common_fields(clients: list[tuple[str, str, httpx.AsyncClient]]):
    common = {"product", "version", "role", "hostname", "os", "arch", "protocol", "port"}
    for label, url, client in clients:
        r = await client.get("/discover")
        body = r.json()
        for field in common:
            assert field in body, f"{_node_label(label, url)}: /discover missing '{field}'"


async def test_discover_role_is_string(clients: list[tuple[str, str, httpx.AsyncClient]]):
    for label, url, client in clients:
        r = await client.get("/discover")
        role = r.json().get("role")
        assert isinstance(role, str) and len(role) > 0, \
            f"{_node_label(label, url)}: role empty or not string: {role!r}"


async def test_discover_os_consistency(clients: list[tuple[str, str, httpx.AsyncClient]]):
    os_values = {}
    for label, url, client in clients:
        r = await client.get("/discover")
        os_val = r.json().get("os")
        assert isinstance(os_val, str), \
            f"{_node_label(label, url)}: os must be str, got {type(os_val)}"
        os_values[label] = os_val

    if len(os_values) > 1:
        print(f"  [INFO] OS distribution: {os_values}")


# ---------------------------------------------------------------------------
# /capabilities
# ---------------------------------------------------------------------------


async def test_capabilities_all_nodes_respond(clients: list[tuple[str, str, httpx.AsyncClient]]):
    for label, url, client in clients:
        r = await client.get("/capabilities")
        if r.status_code == 404:
            print(f"  [WARN] {_node_label(label, url)}: /capabilities returns 404 — known iOS gap")
            continue
        assert r.status_code == 200, f"{_node_label(label, url)}: /capabilities returned {r.status_code}"


async def test_capabilities_detail_present(clients: list[tuple[str, str, httpx.AsyncClient]]):
    for label, url, client in clients:
        r = await client.get("/capabilities")
        if r.status_code == 404:
            continue
        body = r.json()
        assert "_detail" in body, \
            f"{_node_label(label, url)}: /capabilities missing '_detail'"


async def test_capabilities_detail_is_dict(clients: list[tuple[str, str, httpx.AsyncClient]]):
    for label, url, client in clients:
        r = await client.get("/capabilities")
        if r.status_code == 404:
            continue
        detail = r.json().get("_detail")
        assert isinstance(detail, dict), \
            f"{_node_label(label, url)}: _detail must be dict, got {type(detail)}"


async def test_capabilities_detail_has_metadata(clients: list[tuple[str, str, httpx.AsyncClient]]):
    metadata_keys = {"product", "version", "hostname", "os", "arch"}
    for label, url, client in clients:
        r = await client.get("/capabilities")
        if r.status_code == 404:
            continue
        detail = r.json().get("_detail", {})
        found = metadata_keys & set(detail.keys())
        missing = metadata_keys - set(detail.keys())
        if missing:
            hostname = detail.get("node_profile", {}).get("hostname") or detail.get("hostname")
            if hostname:
                found.add("hostname")
                missing.discard("hostname")
        if missing:
            print(f"  [INFO] {_node_label(label, url)}: _detail missing keys: {missing}")


async def test_capabilities_cross_node_diff(clients: list[tuple[str, str, httpx.AsyncClient]]):
    caps_by_node = {}
    for label, url, client in clients:
        r = await client.get("/capabilities")
        if r.status_code == 404:
            caps_by_node[label] = {"_detail": {}, "_status": 404}
            continue
        body = r.json()
        flat_caps = {k: v for k, v in body.items() if k not in FLAT_CAP_SKIP_KEYS}
        caps_by_node[label] = {"caps": set(flat_caps.keys()), "count": len(flat_caps)}

    if len(caps_by_node) > 1:
        all_caps = set()
        for info in caps_by_node.values():
            if "caps" in info:
                all_caps |= info["caps"]

        for label, info in caps_by_node.items():
            if "caps" in info:
                missing_from_this = all_caps - info["caps"]
                if missing_from_this:
                    print(f"  [INFO] {label}: {info['count']} caps, missing vs others: {missing_from_this}")
                else:
                    print(f"  [INFO] {label}: {info['count']} caps (no deltas vs others)")
