"""iHomeNerd investigate API contract tests.

Tests the investigate endpoints:
  - GET  /v1/investigate/environment
  - POST /v1/investigate/scan

Usage:
    IHN_BASE_URL=https://localhost:17777 pytest backend/tests/test_investigate_api.py -v
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
# /v1/investigate/environment
# ---------------------------------------------------------------------------


async def test_environment_returns_200(client: httpx.AsyncClient):
    r = await client.get("/v1/investigate/environment")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"


async def test_environment_has_networks(client: httpx.AsyncClient):
    r = await client.get("/v1/investigate/environment")
    body = r.json()
    assert "networks" in body, f"missing 'networks': {list(body.keys())}"
    assert isinstance(body["networks"], list), "networks must be a list"


async def test_environment_has_devices(client: httpx.AsyncClient):
    r = await client.get("/v1/investigate/environment")
    body = r.json()
    assert "devices" in body, f"missing 'devices': {list(body.keys())}"
    assert isinstance(body["devices"], list), "devices must be a list"


async def test_environment_network_shape(client: httpx.AsyncClient):
    r = await client.get("/v1/investigate/environment")
    networks = r.json().get("networks", [])
    for net in networks:
        for key in ("id", "name", "subnet"):
            assert key in net, f"network missing '{key}': {net}"


async def test_environment_device_shape(client: httpx.AsyncClient):
    r = await client.get("/v1/investigate/environment")
    devices = r.json().get("devices", [])
    for dev in devices:
        for key in ("id", "ip", "type"):
            assert key in dev, f"device missing '{key}': {dev}"


# ---------------------------------------------------------------------------
# /v1/investigate/scan
# ---------------------------------------------------------------------------


async def test_scan_device_health(client: httpx.AsyncClient):
    r = await client.post("/v1/investigate/scan", json={"target": "127.0.0.1", "type": "device_health"})
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"


async def test_scan_response_shape(client: httpx.AsyncClient):
    r = await client.post("/v1/investigate/scan", json={"target": "127.0.0.1", "type": "device_health"})
    body = r.json()
    assert "status" in body, f"missing 'status': {list(body.keys())}"
    assert isinstance(body.get("logs"), list), "logs must be a list"
    assert isinstance(body.get("findings"), list), "findings must be a list"


async def test_scan_findings_shape(client: httpx.AsyncClient):
    r = await client.post("/v1/investigate/scan", json={"target": "127.0.0.1", "type": "device_health"})
    findings = r.json().get("findings", [])
    for f in findings:
        for key in ("id", "severity", "title", "details"):
            assert key in f, f"finding missing '{key}': {f}"
        assert f.get("severity") in ("high", "medium", "low"), \
            f"unknown severity: {f.get('severity')}"


async def test_scan_requires_target(client: httpx.AsyncClient):
    r = await client.post("/v1/investigate/scan", json={"type": "device_health"})
    assert r.status_code == 422, f"expected 422 for missing target, got {r.status_code}: {r.text[:200]}"


async def test_scan_requires_type(client: httpx.AsyncClient):
    r = await client.post("/v1/investigate/scan", json={"target": "127.0.0.1"})
    assert r.status_code == 422, f"expected 422 for missing type, got {r.status_code}: {r.text[:200]}"


async def test_scan_bad_type_returns_400(client: httpx.AsyncClient):
    r = await client.post("/v1/investigate/scan", json={"target": "127.0.0.1", "type": "invalid_scan_type"})
    assert r.status_code in (400, 422), f"expected 400/422 for bad type, got {r.status_code}: {r.text[:200]}"


async def test_scan_hardware_compat(client: httpx.AsyncClient):
    r = await client.post("/v1/investigate/scan", json={"target": "127.0.0.1", "type": "hardware_compat"})
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}" if r.status_code != 200 else True


async def test_scan_network_audit(client: httpx.AsyncClient):
    r = await client.post("/v1/investigate/scan", json={"target": "127.0.0.1", "type": "network_audit"})
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}" if r.status_code != 200 else True
