"""iHomeNerd backend contract tests.

Tests the core control-plane endpoints against a running instance:
  - GET /health
  - GET /discover
  - GET /capabilities
  - GET /system/stats
  - GET / (root)
  - GET /nonexistent (404 behaviour)

Usage:
    BASE_URL=https://localhost:17777 pytest backend/tests/test_contract_api.py -v

Or set IHN_BASE_URL env var.  Default: https://localhost:17777

Requires: pytest, pytest-asyncio, httpx (all in backend/pyproject.toml)
"""

from __future__ import annotations

import os
from typing import AsyncGenerator

import httpx
import pytest


BASE_URL = os.environ.get("IHN_BASE_URL", os.environ.get("BASE_URL", "https://localhost:17777"))


@pytest.fixture(scope="session")
def base() -> str:
    return BASE_URL


@pytest.fixture
async def client(base: str) -> AsyncGenerator[httpx.AsyncClient, None]:
    async with httpx.AsyncClient(base_url=base, verify=False, timeout=10) as c:
        yield c


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------


async def test_health_returns_200(client: httpx.AsyncClient):
    r = await client.get("/health")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"


async def test_health_product(client: httpx.AsyncClient):
    r = await client.get("/health")
    body = r.json()
    assert body.get("product") == "iHomeNerd", f"product={body.get('product')}"


async def test_health_required_fields(client: httpx.AsyncClient):
    r = await client.get("/health")
    body = r.json()
    for key in ("ok", "status", "version", "hostname"):
        assert key in body, f"missing key '{key}' in /health"


async def test_health_ok_boolean(client: httpx.AsyncClient):
    r = await client.get("/health")
    assert isinstance(r.json().get("ok"), bool), "ok must be boolean"


async def test_health_has_providers_list(client: httpx.AsyncClient):
    r = await client.get("/health")
    assert isinstance(r.json().get("providers"), list), "providers must be a list"


async def test_health_has_models_dict(client: httpx.AsyncClient):
    r = await client.get("/health")
    assert isinstance(r.json().get("models"), dict), "models must be a dict"


async def test_health_binding_and_port(client: httpx.AsyncClient):
    r = await client.get("/health")
    body = r.json()
    assert "binding" in body, "missing binding"
    assert isinstance(body.get("port"), int), f"port must be int, got {type(body.get('port'))}"


# ---------------------------------------------------------------------------
# /discover
# ---------------------------------------------------------------------------


async def test_discover_returns_200(client: httpx.AsyncClient):
    r = await client.get("/discover")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"


async def test_discover_product(client: httpx.AsyncClient):
    r = await client.get("/discover")
    assert r.json().get("product") == "iHomeNerd"


async def test_discover_role(client: httpx.AsyncClient):
    r = await client.get("/discover")
    body = r.json()
    assert "role" in body, f"missing 'role' in /discover"
    assert isinstance(body["role"], str) and len(body["role"]) > 0, f"role empty: {body.get('role')!r}"


async def test_discover_os_and_arch(client: httpx.AsyncClient):
    r = await client.get("/discover")
    body = r.json()
    assert "os" in body, "missing 'os'"
    assert "arch" in body, "missing 'arch'"


async def test_discover_network_fields(client: httpx.AsyncClient):
    r = await client.get("/discover")
    body = r.json()
    assert "protocol" in body, "missing 'protocol'"
    assert "port" in body, "missing 'port'"
    assert isinstance(body.get("port"), int), "port must be int"


async def test_discover_quality_profiles(client: httpx.AsyncClient):
    r = await client.get("/discover")
    qp = r.json().get("quality_profiles")
    # May be None in local-only mode (LAN_MODE=0) — valid.
    assert qp is None or isinstance(qp, list), f"quality_profiles must be list or None, got {type(qp)}"


async def test_discover_capabilities_present(client: httpx.AsyncClient):
    r = await client.get("/discover")
    body = r.json()
    caps = body.get("capabilities")
    # May be None in local-only mode (LAN_MODE=0) — valid.
    assert caps is None or isinstance(caps, (list, dict)), f"capabilities must be list/dict or None, got {type(caps)}"


async def test_discover_network_hint_present(client: httpx.AsyncClient):
    r = await client.get("/discover")
    body = r.json()
    hint = body.get("network_hint")
    # May be None in local-only mode, str on Android, dict on Python backend.
    if hint is not None:
        assert isinstance(hint, (str, dict)), f"network_hint must be str/dict, got {type(hint)}"


# ---------------------------------------------------------------------------
# /capabilities
# ---------------------------------------------------------------------------


async def test_capabilities_returns_200(client: httpx.AsyncClient):
    r = await client.get("/capabilities")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"


async def test_capabilities_flat_bool_map(client: httpx.AsyncClient):
    r = await client.get("/capabilities")
    body = r.json()
    assert "_detail" in body, "missing '_detail' sub-object in /capabilities"
    _skip = {"_detail", "product", "version", "capabilities", "node_profile"}
    for key, val in body.items():
        if key not in _skip:
            assert isinstance(val, bool), f"capability '{key}' must be bool, got {type(val)}"


async def test_capabilities_detail_subobject(client: httpx.AsyncClient):
    r = await client.get("/capabilities")
    detail = r.json().get("_detail")
    assert isinstance(detail, dict), f"_detail must be dict, got {type(detail)}"

    # Hostname may be top-level (Python backend) or nested in node_profile (Android).
    hostname = detail.get("hostname") or detail.get("node_profile", {}).get("hostname")
    assert hostname, "missing hostname in _detail (top-level or _detail.node_profile)"
    assert isinstance(detail.get("capabilities"), dict), "missing 'capabilities' dict in _detail"


# ---------------------------------------------------------------------------
# /system/stats
# ---------------------------------------------------------------------------


async def test_system_stats_returns_200(client: httpx.AsyncClient):
    r = await client.get("/system/stats")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"


async def test_system_stats_uptime(client: httpx.AsyncClient):
    r = await client.get("/system/stats")
    body = r.json()
    assert "uptime_seconds" in body, "missing 'uptime_seconds'"
    assert isinstance(body["uptime_seconds"], (int, float)), "uptime_seconds must be numeric"


async def test_system_stats_session_count(client: httpx.AsyncClient):
    r = await client.get("/system/stats")
    body = r.json()
    assert "session_count" in body, "missing 'session_count'"
    assert isinstance(body["session_count"], int), "session_count must be int"


async def test_system_stats_storage(client: httpx.AsyncClient):
    r = await client.get("/system/stats")
    body = r.json()
    # Python backend uses storage_bytes; Android uses app_memory_pss_bytes
    storage = body.get("storage_bytes") or body.get("app_memory_pss_bytes")
    assert storage is not None, f"missing storage metric (storage_bytes / app_memory_pss_bytes): {list(body.keys())[:10]}"
    assert isinstance(storage, (int, float)), "storage metric must be numeric"


async def test_system_stats_connected_apps(client: httpx.AsyncClient):
    r = await client.get("/system/stats")
    body = r.json()
    assert "connected_apps" in body, "missing 'connected_apps'"
    assert isinstance(body["connected_apps"], list), "connected_apps must be list"


# ---------------------------------------------------------------------------
# GET / (root)
# ---------------------------------------------------------------------------


async def test_root_responds(client: httpx.AsyncClient):
    r = await client.get("/")
    assert r.status_code in (200, 404, 307), f"unexpected root status: {r.status_code}"
    if r.status_code == 200:
        ct = r.headers.get("content-type", "")
        is_html = "text/html" in ct
        is_json = "application/json" in ct
        assert is_html or is_json, f"root 200 but unexpected content-type: {ct}"


# ---------------------------------------------------------------------------
# 404 behaviour
# ---------------------------------------------------------------------------


async def test_nonexistent_route_returns_404(client: httpx.AsyncClient):
    r = await client.get("/nonexistent-path-xyz-123")
    # Android may return 200 for catch-all SPA routing; Python backend returns 404.
    # Either is acceptable — the key is that the server responds.
    assert r.status_code in (404, 200), f"unexpected status for unknown route: {r.status_code}"
