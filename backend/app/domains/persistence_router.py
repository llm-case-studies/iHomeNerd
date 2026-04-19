"""Persistence domain — generic app storage REST API.

Provides the admin/system-level endpoints for managing app registrations,
viewing storage stats, and enabling/disabling persistence.  Per-app endpoints
(e.g., /v1/pronunco/profiles) live in their respective plugin routers.

Spec: docs/PRONUNCO_PERSISTENCE_NAMESPACE_SPEC_2026-04-19.md
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .. import persistence

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/persistence", tags=["persistence"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class AppInfo(BaseModel):
    app: str
    displayName: str
    resourceTypes: List[str]
    conflictPolicies: Dict[str, str]
    enabled: bool
    registeredAt: str


class EnableRequest(BaseModel):
    enabled: bool


class StorageStats(BaseModel):
    profiles: int
    resources: int
    appendEntries: int
    dbSizeBytes: int


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/apps")
async def list_apps():
    """List all registered apps and their persistence status."""
    apps = persistence.list_apps()
    return {
        "apps": [
            {
                "app": a.app,
                "displayName": a.display_name,
                "resourceTypes": a.resource_types,
                "conflictPolicies": a.conflict_policies,
                "enabled": a.enabled,
                "registeredAt": a.registered_at,
            }
            for a in apps
        ]
    }


@router.get("/apps/{app}")
async def get_app(app: str):
    """Get details for a specific registered app."""
    reg = persistence.get_app(app)
    if not reg:
        raise HTTPException(status_code=404, detail=f"App '{app}' not registered")
    return {
        "app": reg.app,
        "displayName": reg.display_name,
        "resourceTypes": reg.resource_types,
        "conflictPolicies": reg.conflict_policies,
        "enabled": reg.enabled,
        "registeredAt": reg.registered_at,
    }


@router.patch("/apps/{app}/enable")
async def set_app_enabled(app: str, req: EnableRequest):
    """Enable or disable persistence for an app."""
    ok = persistence.set_app_enabled(app, req.enabled)
    if not ok:
        raise HTTPException(status_code=404, detail=f"App '{app}' not registered")
    return {"app": app, "enabled": req.enabled}


@router.get("/stats")
async def storage_stats(app: Optional[str] = None):
    """Get storage statistics (optionally filtered by app)."""
    return persistence.storage_stats(app)
