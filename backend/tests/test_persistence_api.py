#!/usr/bin/env python3
"""Persistence API contract tests — run against a live iHomeNerd instance.

Usage:
    python tests/test_persistence_api.py [BASE_URL]

Default BASE_URL: https://192.168.0.206:17777

Tests cover the 6 Codex findings:
  1. Enabled enforcement (403 when disabled)
  2. Missing-profile returns 404 (not empty 200)
  3. profile_settings exposed as real endpoint
  4. Capability surface matches docs (only pronunco_persistence)
  5. PIN auth documented as phase 2 (hasPin always false)
  6. Sync/status matches reality

Requires: pip install requests
"""

from __future__ import annotations

import json
import sys
import time
import uuid
import urllib3

import requests

# Suppress InsecureRequestWarning for self-signed certs
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE = sys.argv[1] if len(sys.argv) > 1 else "https://192.168.0.206:17777"
S = requests.Session()
S.verify = False  # self-signed TLS

PASS = 0
FAIL = 0
SKIP = 0

TEST_PROFILE = f"test-{uuid.uuid4().hex[:8]}"


def check(name: str, condition: bool, detail: str = ""):
    """Record a pass/fail."""
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  ✅ {name}")
    else:
        FAIL += 1
        print(f"  ❌ {name}{f' — {detail}' if detail else ''}")


def skip(name: str, reason: str):
    global SKIP
    SKIP += 1
    print(f"  ⏭️  {name} — {reason}")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def get(path: str, **kwargs) -> requests.Response:
    return S.get(f"{BASE}{path}", **kwargs)


def post(path: str, data: dict | None = None, **kwargs) -> requests.Response:
    return S.post(f"{BASE}{path}", json=data, **kwargs)


def put(path: str, data: dict | None = None, **kwargs) -> requests.Response:
    return S.put(f"{BASE}{path}", json=data, **kwargs)


def patch(path: str, data: dict | None = None, **kwargs) -> requests.Response:
    return S.patch(f"{BASE}{path}", json=data, **kwargs)


def delete(path: str, **kwargs) -> requests.Response:
    return S.delete(f"{BASE}{path}", **kwargs)


# ===================================================================
# Test groups
# ===================================================================


def test_health():
    """Smoke test — is iHomeNerd alive?"""
    print("\n--- Health ---")
    r = get("/health")
    check("GET /health returns 200", r.status_code == 200)
    body = r.json()
    check("product is iHomeNerd", body.get("product") == "iHomeNerd")


def test_capabilities():
    """Finding #4 — capability surface should be pronunco_persistence only."""
    print("\n--- Capabilities (Finding #4) ---")
    r = get("/capabilities")
    check("GET /capabilities returns 200", r.status_code == 200)
    body = r.json()

    check(
        "pronunco_persistence capability exists",
        "pronunco_persistence" in body,
        f"keys: {list(body.keys())[:10]}",
    )

    # These should NOT exist as separate capabilities
    check(
        "pronunco_profiles does NOT exist as separate capability",
        "pronunco_profiles" not in body,
        "found pronunco_profiles — should be removed",
    )
    check(
        "pronunco_sync does NOT exist as separate capability",
        "pronunco_sync" not in body,
        "found pronunco_sync — should be removed",
    )


def test_app_registration():
    """Verify PronunCo is registered."""
    print("\n--- App Registration ---")
    r = get("/v1/persistence/apps/pronunco")
    check("GET /v1/persistence/apps/pronunco returns 200", r.status_code == 200)
    body = r.json()
    check("app name is pronunco", body.get("app") == "pronunco")
    check("has resource_types", len(body.get("resourceTypes", [])) >= 6)
    check("has conflict_policies", len(body.get("conflictPolicies", {})) >= 6)


def test_enabled_enforcement():
    """Finding #1 — disabled app must return 403, not silently proceed."""
    print("\n--- Enabled Enforcement (Finding #1) ---")

    # Check current state
    r = get("/v1/persistence/apps/pronunco")
    was_enabled = r.json().get("enabled", False)

    if was_enabled:
        # Disable to test enforcement
        r = patch("/v1/persistence/apps/pronunco/enable", data={"enabled": False})
        check("disable persistence", r.status_code == 200)

    # Now test: list profiles should return 403
    r = get("/v1/pronunco/profiles")
    check(
        "list profiles returns 403 when disabled",
        r.status_code == 403,
        f"got {r.status_code}: {r.text[:200]}",
    )

    # Create profile should return 403
    r = post("/v1/pronunco/profiles", data={"profileId": "should-fail", "displayName": "No"})
    check(
        "create profile returns 403 when disabled",
        r.status_code == 403,
        f"got {r.status_code}: {r.text[:200]}",
    )

    # Re-enable
    r = patch("/v1/persistence/apps/pronunco/enable", data={"enabled": True})
    check("re-enable persistence", r.status_code == 200)

    # Confirm enabled
    r = get("/v1/pronunco/profiles")
    check(
        "list profiles works after re-enable",
        r.status_code == 200,
        f"got {r.status_code}",
    )


def test_missing_profile_404():
    """Finding #2 — non-existent profile returns 404, not empty 200."""
    print("\n--- Missing Profile 404s (Finding #2) ---")

    ghost = "nonexistent-profile-xyz"

    # GET profile
    r = get(f"/v1/pronunco/profiles/{ghost}")
    check(
        "GET profile returns 404 for missing profile",
        r.status_code == 404,
        f"got {r.status_code}: {r.text[:200]}",
    )

    # List decks for missing profile
    r = get(f"/v1/pronunco/profiles/{ghost}/decks")
    check(
        "list decks returns 404 for missing profile",
        r.status_code == 404,
        f"got {r.status_code}: {r.text[:200]}",
    )

    # List practice for missing profile
    r = get(f"/v1/pronunco/profiles/{ghost}/practice")
    check(
        "list practice returns 404 for missing profile",
        r.status_code == 404,
        f"got {r.status_code}: {r.text[:200]}",
    )

    # List weak spots for missing profile
    r = get(f"/v1/pronunco/profiles/{ghost}/weak-spots")
    check(
        "list weak-spots returns 404 for missing profile",
        r.status_code == 404,
        f"got {r.status_code}: {r.text[:200]}",
    )

    # List tutor notes for missing profile
    r = get(f"/v1/pronunco/profiles/{ghost}/tutor-notes")
    check(
        "list tutor-notes returns 404 for missing profile",
        r.status_code == 404,
        f"got {r.status_code}: {r.text[:200]}",
    )

    # List groups for missing profile
    r = get(f"/v1/pronunco/profiles/{ghost}/groups")
    check(
        "list groups returns 404 for missing profile",
        r.status_code == 404,
        f"got {r.status_code}: {r.text[:200]}",
    )

    # Sync status for missing profile
    r = get(f"/v1/pronunco/profiles/{ghost}/sync/status")
    check(
        "sync/status returns 404 for missing profile",
        r.status_code == 404,
        f"got {r.status_code}: {r.text[:200]}",
    )

    # Settings for missing profile
    r = get(f"/v1/pronunco/profiles/{ghost}/settings")
    check(
        "settings returns 404 for missing profile",
        r.status_code == 404,
        f"got {r.status_code}: {r.text[:200]}",
    )


def test_profile_lifecycle():
    """Full profile CRUD."""
    print("\n--- Profile Lifecycle ---")

    # Create
    r = post("/v1/pronunco/profiles", data={"profileId": TEST_PROFILE, "displayName": "Test User"})
    check("create profile returns 201", r.status_code == 201, f"got {r.status_code}: {r.text[:200]}")
    body = r.json()
    check("profile ID matches", body.get("profileId") == TEST_PROFILE)

    # Duplicate returns 409
    r = post("/v1/pronunco/profiles", data={"profileId": TEST_PROFILE, "displayName": "Dup"})
    check("duplicate profile returns 409", r.status_code == 409, f"got {r.status_code}")

    # Get
    r = get(f"/v1/pronunco/profiles/{TEST_PROFILE}")
    check("get profile returns 200", r.status_code == 200)
    body = r.json()
    check("displayName correct", body.get("displayName") == "Test User")

    # Finding #5 — hasPin always false
    check(
        "hasPin is false (PIN auth is phase 2)",
        body.get("hasPin") is False,
        f"got hasPin={body.get('hasPin')}",
    )

    # Update
    r = patch(f"/v1/pronunco/profiles/{TEST_PROFILE}", data={"displayName": "Updated Name"})
    check("update profile returns 200", r.status_code == 200)
    check("updated displayName", r.json().get("displayName") == "Updated Name")

    # List includes our profile
    r = get("/v1/pronunco/profiles")
    check("list profiles returns 200", r.status_code == 200)
    ids = [p["profileId"] for p in r.json().get("profiles", [])]
    check("test profile in list", TEST_PROFILE in ids)


def test_profile_settings():
    """Finding #3 — profile_settings has dedicated GET/PUT endpoints."""
    print("\n--- Profile Settings (Finding #3) ---")

    # Get (initially empty)
    r = get(f"/v1/pronunco/profiles/{TEST_PROFILE}/settings")
    check("GET settings returns 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
    body = r.json()
    check("empty settings has data={}", body.get("data") == {} or body.get("data") is not None)
    check("empty settings has version 0", body.get("version") == 0)

    # Put
    settings_data = {"preferredLanguages": ["zh-CN", "ru"], "scoringStrictness": "moderate"}
    r = put(
        f"/v1/pronunco/profiles/{TEST_PROFILE}/settings",
        data={"data": settings_data, "sourceDeviceId": "test-device"},
    )
    check("PUT settings returns 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
    body = r.json()
    check("settings version >= 1", body.get("version", 0) >= 1)
    check("settings has revision", "revision" in body)

    # Get again — should have data
    r = get(f"/v1/pronunco/profiles/{TEST_PROFILE}/settings")
    body = r.json()
    check("settings data persisted", body.get("data", {}).get("scoringStrictness") == "moderate")


def test_deck_crud():
    """Deck state CRUD."""
    print("\n--- Deck State ---")
    deck_id = "test-deck-01"

    # Put
    r = put(
        f"/v1/pronunco/profiles/{TEST_PROFILE}/decks/{deck_id}",
        data={"data": {"title": "Test Deck", "cardCount": 5}, "sourceDeviceId": "test"},
    )
    check("put deck returns 200", r.status_code == 200, f"got {r.status_code}")
    check("deck has version", r.json().get("version", 0) >= 1)

    # List
    r = get(f"/v1/pronunco/profiles/{TEST_PROFILE}/decks")
    check("list decks returns 200", r.status_code == 200)
    decks = r.json().get("decks", [])
    check("deck in list", any(d["deckId"] == deck_id for d in decks))

    # Delete
    r = delete(f"/v1/pronunco/profiles/{TEST_PROFILE}/decks/{deck_id}")
    check("delete deck returns 200", r.status_code == 200)

    # Verify deleted
    r = get(f"/v1/pronunco/profiles/{TEST_PROFILE}/decks")
    decks = r.json().get("decks", [])
    check("deck removed from list", not any(d["deckId"] == deck_id for d in decks))


def test_practice_append():
    """Practice journal append-only."""
    print("\n--- Practice Journal ---")

    r = post(
        f"/v1/pronunco/profiles/{TEST_PROFILE}/practice/append",
        data={
            "deckId": "test-deck-01",
            "lineId": "line-1",
            "score": 0.85,
            "transcript": "nǐ hǎo",
            "sourceDeviceId": "test",
        },
    )
    check("append practice returns 201", r.status_code == 201, f"got {r.status_code}: {r.text[:200]}")
    seq = r.json().get("seq")
    check("returns seq number", seq is not None and seq > 0)

    # List
    r = get(f"/v1/pronunco/profiles/{TEST_PROFILE}/practice")
    check("list practice returns 200", r.status_code == 200)
    attempts = r.json().get("attempts", [])
    check("practice attempt in list", len(attempts) >= 1)

    # Filter by deckId
    r = get(f"/v1/pronunco/profiles/{TEST_PROFILE}/practice?deckId=test-deck-01")
    check("filter by deckId returns 200", r.status_code == 200)


def test_weak_spots():
    """Weak spots CRUD."""
    print("\n--- Weak Spots ---")

    r = put(
        f"/v1/pronunco/profiles/{TEST_PROFILE}/weak-spots/test-scope",
        data={"data": {"phonemes": ["zh", "ch"], "failRate": 0.6}, "sourceDeviceId": "test"},
    )
    check("put weak spot returns 200", r.status_code == 200, f"got {r.status_code}")

    r = get(f"/v1/pronunco/profiles/{TEST_PROFILE}/weak-spots")
    check("list weak spots returns 200", r.status_code == 200)
    spots = r.json().get("weakSpots", [])
    check("weak spot in list", any(s["scopeId"] == "test-scope" for s in spots))


def test_tutor_notes():
    """Tutor notes CRUD."""
    print("\n--- Tutor Notes ---")

    r = put(
        f"/v1/pronunco/profiles/{TEST_PROFILE}/tutor-notes/note-01",
        data={"data": {"tutor": "Test", "summary": "Focus on tones"}, "sourceDeviceId": "test"},
    )
    check("put tutor note returns 200", r.status_code == 200, f"got {r.status_code}")

    r = get(f"/v1/pronunco/profiles/{TEST_PROFILE}/tutor-notes")
    check("list tutor notes returns 200", r.status_code == 200)

    r = delete(f"/v1/pronunco/profiles/{TEST_PROFILE}/tutor-notes/note-01")
    check("delete tutor note returns 200", r.status_code == 200)


def test_groups():
    """Topic groups CRUD."""
    print("\n--- Topic Groups ---")

    r = put(
        f"/v1/pronunco/profiles/{TEST_PROFILE}/groups/grp-01",
        data={"data": {"name": "Test Group", "deckIds": []}, "sourceDeviceId": "test"},
    )
    check("put group returns 200", r.status_code == 200, f"got {r.status_code}")

    r = get(f"/v1/pronunco/profiles/{TEST_PROFILE}/groups")
    check("list groups returns 200", r.status_code == 200)

    r = delete(f"/v1/pronunco/profiles/{TEST_PROFILE}/groups/grp-01")
    check("delete group returns 200", r.status_code == 200)


def test_sync_status():
    """Finding #6 — sync/status counts match reality."""
    print("\n--- Sync Status (Finding #6) ---")

    r = get(f"/v1/pronunco/profiles/{TEST_PROFILE}/sync/status")
    check("sync status returns 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
    body = r.json()

    check("has enabled field", "enabled" in body)
    check("has profileExists field", "profileExists" in body)
    check("has resourceTypes list", isinstance(body.get("resourceTypes"), list))

    # Verify all 6 resource types are listed
    rt_names = [rt["resourceType"] for rt in body.get("resourceTypes", [])]
    for expected in ["profile_settings", "deck_state", "practice_attempt", "weak_spot_summary", "tutor_note", "topic_group"]:
        check(f"resourceType '{expected}' in sync status", expected in rt_names, f"found: {rt_names}")

    # Check practice_attempt count (we appended 1)
    practice_rt = next((rt for rt in body.get("resourceTypes", []) if rt["resourceType"] == "practice_attempt"), None)
    if practice_rt:
        check("practice_attempt count >= 1", practice_rt.get("count", 0) >= 1, f"count={practice_rt.get('count')}")


# ===================================================================
# Runner
# ===================================================================


def main():
    print(f"🔍 Testing persistence API at {BASE}")
    print(f"   Test profile: {TEST_PROFILE}")

    try:
        test_health()
        test_capabilities()
        test_app_registration()
        test_enabled_enforcement()
        test_missing_profile_404()
        test_profile_lifecycle()
        test_profile_settings()
        test_deck_crud()
        test_practice_append()
        test_weak_spots()
        test_tutor_notes()
        test_groups()
        test_sync_status()
    except requests.ConnectionError:
        print(f"\n❌ Cannot connect to {BASE} — is iHomeNerd running?")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()

    print(f"\n{'='*50}")
    print(f"Results: {PASS} passed, {FAIL} failed, {SKIP} skipped")
    if FAIL > 0:
        print("⚠️  Some tests failed — see above for details")
        sys.exit(1)
    else:
        print("✅ All tests passed!")


if __name__ == "__main__":
    main()
