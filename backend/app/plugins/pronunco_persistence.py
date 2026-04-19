"""PronunCo persistence plugin — profile-aware learner data storage.

Registers PronunCo resource types with the generic persistence service
and exposes the /v1/pronunco/ endpoints from the namespace spec.

Resource types and conflict policies:
  - profile_settings  → lww  (last-write-wins)
  - deck_state        → lww
  - practice_attempt  → append  (append-only journal)
  - weak_spot_summary → lww
  - tutor_note        → lww
  - topic_group       → lww

Spec: docs/PRONUNCO_PERSISTENCE_NAMESPACE_SPEC_2026-04-19.md
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .. import persistence
from ..persistence import AppDisabledError

logger = logging.getLogger(__name__)


def _handle_persistence_error(e: Exception) -> HTTPException:
    """Map persistence layer exceptions to HTTP errors."""
    if isinstance(e, AppDisabledError):
        return HTTPException(status_code=403, detail=str(e))
    if isinstance(e, ValueError):
        msg = str(e)
        if "not found" in msg.lower():
            return HTTPException(status_code=404, detail=msg)
        return HTTPException(status_code=400, detail=msg)
    if isinstance(e, persistence.ConflictError):
        return HTTPException(status_code=409, detail=str(e))
    return HTTPException(status_code=500, detail=str(e))

router = APIRouter(prefix="/v1/pronunco", tags=["pronunco-persistence"])

APP_NAME = "pronunco"

RESOURCE_TYPES = [
    "profile_settings",
    "deck_state",
    "practice_attempt",
    "weak_spot_summary",
    "tutor_note",
    "topic_group",
]

CONFLICT_POLICIES = {
    "profile_settings": "lww",
    "deck_state": "lww",
    "practice_attempt": "append",
    "weak_spot_summary": "lww",
    "tutor_note": "lww",
    "topic_group": "lww",
}


def register():
    """Register PronunCo with the persistence service. Called at app startup."""
    persistence.register_app(
        app=APP_NAME,
        display_name="PronunCo",
        resource_types=RESOURCE_TYPES,
        conflict_policies=CONFLICT_POLICIES,
    )
    logger.info("PronunCo registered with persistence service (%d resource types)", len(RESOURCE_TYPES))


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class CreateProfileRequest(BaseModel):
    profileId: str
    displayName: str


class UpdateProfileRequest(BaseModel):
    displayName: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


class ProfileSettingsRequest(BaseModel):
    data: Dict[str, Any]
    sourceDeviceId: str = ""


class DeckStateRequest(BaseModel):
    data: Dict[str, Any]
    sourceDeviceId: str = ""


class PracticeAppendRequest(BaseModel):
    deckId: str
    lineId: Optional[str] = None
    score: Optional[float] = None
    transcript: Optional[str] = None
    coachModel: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)
    sourceDeviceId: str = ""


class WeakSpotRequest(BaseModel):
    data: Dict[str, Any]
    sourceDeviceId: str = ""


class TutorNoteRequest(BaseModel):
    data: Dict[str, Any]
    sourceDeviceId: str = ""


class TopicGroupRequest(BaseModel):
    data: Dict[str, Any]
    sourceDeviceId: str = ""


# ---------------------------------------------------------------------------
# Profiles
# ---------------------------------------------------------------------------


@router.get("/profiles")
async def list_profiles():
    """List all PronunCo learner profiles on this node."""
    try:
        profiles = persistence.list_profiles(APP_NAME)
    except (AppDisabledError, ValueError) as e:
        raise _handle_persistence_error(e)
    return {
        "profiles": [
            {
                "profileId": p.id,
                "displayName": p.display_name,
                "createdAt": p.created_at,
                "updatedAt": p.updated_at,
                "hasPin": p.pin_hash is not None,
            }
            for p in profiles
        ]
    }


@router.post("/profiles", status_code=201)
async def create_profile(req: CreateProfileRequest):
    """Create a new PronunCo learner profile."""
    try:
        profile = persistence.create_profile(APP_NAME, req.profileId, req.displayName)
    except (AppDisabledError, ValueError) as e:
        raise _handle_persistence_error(e)
    except Exception as e:
        if "UNIQUE constraint" in str(e):
            raise HTTPException(status_code=409, detail=f"Profile '{req.profileId}' already exists")
        raise
    return {
        "profileId": profile.id,
        "displayName": profile.display_name,
        "createdAt": profile.created_at,
    }


@router.get("/profiles/{profile_id}")
async def get_profile(profile_id: str):
    """Get a specific PronunCo learner profile."""
    try:
        profile = persistence.get_profile(APP_NAME, profile_id)
    except (AppDisabledError, ValueError) as e:
        raise _handle_persistence_error(e)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Profile '{profile_id}' not found")
    import json
    return {
        "profileId": profile.id,
        "displayName": profile.display_name,
        "createdAt": profile.created_at,
        "updatedAt": profile.updated_at,
        "hasPin": profile.pin_hash is not None,
        "settings": json.loads(profile.settings_json),
    }


@router.patch("/profiles/{profile_id}")
async def update_profile(profile_id: str, req: UpdateProfileRequest):
    """Update a PronunCo learner profile."""
    import json
    settings_json = json.dumps(req.settings) if req.settings is not None else None
    try:
        profile = persistence.update_profile(
            APP_NAME, profile_id,
            display_name=req.displayName,
            settings_json=settings_json,
        )
    except (AppDisabledError, ValueError) as e:
        raise _handle_persistence_error(e)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Profile '{profile_id}' not found")
    return {
        "profileId": profile.id,
        "displayName": profile.display_name,
        "updatedAt": profile.updated_at,
    }


# ---------------------------------------------------------------------------
# Profile settings (LWW) — per-profile preferences stored as a resource
# ---------------------------------------------------------------------------


@router.get("/profiles/{profile_id}/settings")
async def get_profile_settings(profile_id: str):
    """Get profile settings (UI preferences, coach config, etc.)."""
    try:
        resource = persistence.get_resource(APP_NAME, profile_id, "profile_settings", "default")
    except (AppDisabledError, ValueError) as e:
        raise _handle_persistence_error(e)
    if not resource:
        return {"data": {}, "version": 0, "updatedAt": None}
    return {
        "data": resource.data,
        "version": resource.version,
        "updatedAt": resource.updated_at,
        "sourceDeviceId": resource.source_device_id,
    }


@router.put("/profiles/{profile_id}/settings")
async def put_profile_settings(profile_id: str, req: ProfileSettingsRequest):
    """Create or update profile settings."""
    try:
        resource = persistence.put_resource(
            APP_NAME, profile_id, "profile_settings", "default",
            data=req.data, source_device_id=req.sourceDeviceId,
        )
    except (AppDisabledError, ValueError, persistence.ConflictError) as e:
        raise _handle_persistence_error(e)
    return {
        "version": resource.version,
        "updatedAt": resource.updated_at,
        "revision": resource.revision,
    }


# ---------------------------------------------------------------------------
# Sync status
# ---------------------------------------------------------------------------


@router.get("/profiles/{profile_id}/sync/status")
async def get_sync_status(profile_id: str):
    """Get persistence/sync status for a profile.

    Returns whether persistence is enabled, available resource classes,
    and latest revision tokens per resource class.
    Does NOT require enabled=true (client needs this to show enable prompt).
    """
    try:
        status = persistence.sync_status(APP_NAME, profile_id)
    except ValueError as e:
        raise _handle_persistence_error(e)
    return status


# ---------------------------------------------------------------------------
# Deck state (LWW)
# ---------------------------------------------------------------------------


@router.get("/profiles/{profile_id}/decks")
async def list_decks(profile_id: str, since: Optional[str] = None):
    """List deck states for a profile."""
    try:
        decks = persistence.list_resources(APP_NAME, profile_id, "deck_state", since=since)
    except (AppDisabledError, ValueError) as e:
        raise _handle_persistence_error(e)
    return {
        "decks": [
            {
                "deckId": d.id,
                "data": d.data,
                "version": d.version,
                "updatedAt": d.updated_at,
                "sourceDeviceId": d.source_device_id,
            }
            for d in decks
        ]
    }


@router.put("/profiles/{profile_id}/decks/{deck_id}")
async def put_deck(profile_id: str, deck_id: str, req: DeckStateRequest):
    """Create or update a deck state."""
    try:
        resource = persistence.put_resource(
            APP_NAME, profile_id, "deck_state", deck_id,
            data=req.data, source_device_id=req.sourceDeviceId,
        )
    except (AppDisabledError, ValueError, persistence.ConflictError) as e:
        raise _handle_persistence_error(e)
    return {
        "deckId": resource.id,
        "version": resource.version,
        "updatedAt": resource.updated_at,
        "revision": resource.revision,
    }


@router.delete("/profiles/{profile_id}/decks/{deck_id}")
async def delete_deck(profile_id: str, deck_id: str):
    """Remove a deck from the learner's library."""
    try:
        ok = persistence.delete_resource(APP_NAME, profile_id, "deck_state", deck_id)
    except (AppDisabledError, ValueError) as e:
        raise _handle_persistence_error(e)
    if not ok:
        raise HTTPException(status_code=404, detail="Deck not found")
    return {"deleted": True}


# ---------------------------------------------------------------------------
# Practice journal (append-only)
# ---------------------------------------------------------------------------


@router.get("/profiles/{profile_id}/practice")
async def list_practice(
    profile_id: str,
    deckId: Optional[str] = None,
    since: int = 0,
    limit: int = 200,
):
    """List practice attempts for a profile.

    Supports filtering by deckId and pagination via since (seq number).
    """
    try:
        entries = persistence.list_appended(
            APP_NAME, profile_id, "practice_attempt",
            since_seq=since, limit=limit,
            filter_key="deckId" if deckId else None,
            filter_value=deckId,
        )
    except (AppDisabledError, ValueError) as e:
        raise _handle_persistence_error(e)
    return {"attempts": entries, "count": len(entries)}


@router.post("/profiles/{profile_id}/practice/append", status_code=201)
async def append_practice(profile_id: str, req: PracticeAppendRequest):
    """Append a practice attempt to the journal."""
    entry = {
        "deckId": req.deckId,
        "lineId": req.lineId,
        "score": req.score,
        "transcript": req.transcript,
        "coachModel": req.coachModel,
        **req.details,
    }
    try:
        seq = persistence.append_resource(
            APP_NAME, profile_id, "practice_attempt",
            data=entry, source_device_id=req.sourceDeviceId,
        )
    except (AppDisabledError, ValueError) as e:
        raise _handle_persistence_error(e)
    return {"seq": seq}


# ---------------------------------------------------------------------------
# Weak spots (LWW)
# ---------------------------------------------------------------------------


@router.get("/profiles/{profile_id}/weak-spots")
async def list_weak_spots(profile_id: str):
    """List weak spot summaries for a profile."""
    try:
        spots = persistence.list_resources(APP_NAME, profile_id, "weak_spot_summary")
    except (AppDisabledError, ValueError) as e:
        raise _handle_persistence_error(e)
    return {
        "weakSpots": [
            {
                "scopeId": s.id,
                "data": s.data,
                "version": s.version,
                "updatedAt": s.updated_at,
            }
            for s in spots
        ]
    }


@router.put("/profiles/{profile_id}/weak-spots/{scope_id}")
async def put_weak_spot(profile_id: str, scope_id: str, req: WeakSpotRequest):
    """Create or update a weak spot summary."""
    try:
        resource = persistence.put_resource(
            APP_NAME, profile_id, "weak_spot_summary", scope_id,
            data=req.data, source_device_id=req.sourceDeviceId,
        )
    except (AppDisabledError, ValueError, persistence.ConflictError) as e:
        raise _handle_persistence_error(e)
    return {
        "scopeId": resource.id,
        "version": resource.version,
        "updatedAt": resource.updated_at,
    }


# ---------------------------------------------------------------------------
# Tutor notes (LWW)
# ---------------------------------------------------------------------------


@router.get("/profiles/{profile_id}/tutor-notes")
async def list_tutor_notes(profile_id: str):
    """List tutor/handoff notes for a profile."""
    try:
        notes = persistence.list_resources(APP_NAME, profile_id, "tutor_note")
    except (AppDisabledError, ValueError) as e:
        raise _handle_persistence_error(e)
    return {
        "notes": [
            {
                "noteId": n.id,
                "data": n.data,
                "version": n.version,
                "updatedAt": n.updated_at,
            }
            for n in notes
        ]
    }


@router.put("/profiles/{profile_id}/tutor-notes/{note_id}")
async def put_tutor_note(profile_id: str, note_id: str, req: TutorNoteRequest):
    """Create or update a tutor note."""
    try:
        resource = persistence.put_resource(
            APP_NAME, profile_id, "tutor_note", note_id,
            data=req.data, source_device_id=req.sourceDeviceId,
        )
    except (AppDisabledError, ValueError, persistence.ConflictError) as e:
        raise _handle_persistence_error(e)
    return {
        "noteId": resource.id,
        "version": resource.version,
        "updatedAt": resource.updated_at,
    }


@router.delete("/profiles/{profile_id}/tutor-notes/{note_id}")
async def delete_tutor_note(profile_id: str, note_id: str):
    """Delete a tutor note."""
    try:
        ok = persistence.delete_resource(APP_NAME, profile_id, "tutor_note", note_id)
    except (AppDisabledError, ValueError) as e:
        raise _handle_persistence_error(e)
    if not ok:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"deleted": True}


# ---------------------------------------------------------------------------
# Topic groups (LWW)
# ---------------------------------------------------------------------------


@router.get("/profiles/{profile_id}/groups")
async def list_groups(profile_id: str):
    """List topic groups for a profile."""
    try:
        groups = persistence.list_resources(APP_NAME, profile_id, "topic_group")
    except (AppDisabledError, ValueError) as e:
        raise _handle_persistence_error(e)
    return {
        "groups": [
            {
                "groupId": g.id,
                "data": g.data,
                "version": g.version,
                "updatedAt": g.updated_at,
            }
            for g in groups
        ]
    }


@router.put("/profiles/{profile_id}/groups/{group_id}")
async def put_group(profile_id: str, group_id: str, req: TopicGroupRequest):
    """Create or update a topic group."""
    try:
        resource = persistence.put_resource(
            APP_NAME, profile_id, "topic_group", group_id,
            data=req.data, source_device_id=req.sourceDeviceId,
        )
    except (AppDisabledError, ValueError, persistence.ConflictError) as e:
        raise _handle_persistence_error(e)
    return {
        "groupId": resource.id,
        "version": resource.version,
        "updatedAt": resource.updated_at,
    }


@router.delete("/profiles/{profile_id}/groups/{group_id}")
async def delete_group(profile_id: str, group_id: str):
    """Delete a topic group."""
    try:
        ok = persistence.delete_resource(APP_NAME, profile_id, "topic_group", group_id)
    except (AppDisabledError, ValueError) as e:
        raise _handle_persistence_error(e)
    if not ok:
        raise HTTPException(status_code=404, detail="Group not found")
    return {"deleted": True}
