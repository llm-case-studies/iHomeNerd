"""App persistence service — profile-aware namespaced storage for connected apps.

Provides each app (PronunCo, iMedisys, TelPro-Bro, etc.) with its own
isolated namespace containing profiles and typed resources.  SQLite-backed,
stored under ~/.ihomenerd/appstore.sqlite.

Design principles (from PronunCo Persistence Namespace Spec):
  - App namespace isolation: one app cannot see another's data
  - Profile isolation: household members don't share history
  - Explicit persistence: disabled by default, opt-in per app+profile
  - Typed resources: predictable schemas, not arbitrary blobs
  - Conflict policy: append-only or last-write-wins per resource type

Spec: docs/PRONUNCO_PERSISTENCE_NAMESPACE_SPEC_2026-04-19.md
"""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional

from .config import settings


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------


@dataclass
class AppRegistration:
    """An app registered for persistence."""
    app: str
    display_name: str
    resource_types: List[str]
    conflict_policies: Dict[str, str]   # resource_type -> "lww" | "append"
    enabled: bool = False
    registered_at: str = ""


@dataclass
class Profile:
    """A user profile within an app namespace."""
    id: str
    app: str
    display_name: str
    created_at: str
    updated_at: str
    pin_hash: Optional[str] = None
    settings_json: str = "{}"


@dataclass
class Resource:
    """A typed resource within an app+profile namespace."""
    id: str
    app: str
    profile_id: str
    resource_type: str
    data: Dict[str, Any]
    version: int
    created_at: str
    updated_at: str
    source_device_id: str = ""
    deleted_at: Optional[str] = None
    revision: int = 0  # monotonic per app+profile


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

_DB_NAME = "appstore.sqlite"
_schema_initialized = False


def _db_path() -> Path:
    return settings.data_dir / _DB_NAME


def _connect() -> sqlite3.Connection:
    global _schema_initialized
    path = _db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(path), timeout=10)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA foreign_keys=ON")
    if not _schema_initialized:
        _ensure_schema(con)
        _schema_initialized = True
    return con


@contextmanager
def _db() -> Generator[sqlite3.Connection, None, None]:
    """Context manager that guarantees connection cleanup."""
    con = _connect()
    try:
        yield con
    finally:
        con.close()


def _ensure_schema(con: sqlite3.Connection) -> None:
    con.executescript("""
        CREATE TABLE IF NOT EXISTS app_registrations (
            app TEXT PRIMARY KEY,
            display_name TEXT NOT NULL,
            resource_types TEXT NOT NULL DEFAULT '[]',
            conflict_policies TEXT NOT NULL DEFAULT '{}',
            enabled INTEGER NOT NULL DEFAULT 0,
            registered_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT NOT NULL,
            app TEXT NOT NULL,
            display_name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            pin_hash TEXT,
            settings_json TEXT NOT NULL DEFAULT '{}',
            PRIMARY KEY (app, id),
            FOREIGN KEY (app) REFERENCES app_registrations(app)
        );

        CREATE TABLE IF NOT EXISTS resources (
            id TEXT NOT NULL,
            app TEXT NOT NULL,
            profile_id TEXT NOT NULL,
            resource_type TEXT NOT NULL,
            data TEXT NOT NULL DEFAULT '{}',
            version INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            source_device_id TEXT NOT NULL DEFAULT '',
            deleted_at TEXT,
            revision INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (app, profile_id, resource_type, id),
            FOREIGN KEY (app, profile_id) REFERENCES profiles(app, id)
        );

        CREATE INDEX IF NOT EXISTS idx_resources_type
            ON resources(app, profile_id, resource_type)
            WHERE deleted_at IS NULL;

        CREATE INDEX IF NOT EXISTS idx_resources_revision
            ON resources(app, profile_id, revision);

        CREATE TABLE IF NOT EXISTS append_log (
            seq INTEGER PRIMARY KEY AUTOINCREMENT,
            app TEXT NOT NULL,
            profile_id TEXT NOT NULL,
            resource_type TEXT NOT NULL,
            data TEXT NOT NULL,
            created_at TEXT NOT NULL,
            source_device_id TEXT NOT NULL DEFAULT '',
            FOREIGN KEY (app, profile_id) REFERENCES profiles(app, id)
        );

        CREATE INDEX IF NOT EXISTS idx_append_log_lookup
            ON append_log(app, profile_id, resource_type);
    """)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# App registration
# ---------------------------------------------------------------------------


def register_app(
    app: str,
    display_name: str,
    resource_types: List[str],
    conflict_policies: Optional[Dict[str, str]] = None,
) -> AppRegistration:
    """Register an app for persistence. Idempotent — updates on re-register."""
    policies = conflict_policies or {}
    # Default unspecified types to last-write-wins
    for rt in resource_types:
        if rt not in policies:
            policies[rt] = "lww"

    with _db() as con:
        now = _now()
        con.execute(
            """INSERT INTO app_registrations (app, display_name, resource_types, conflict_policies, enabled, registered_at)
               VALUES (?, ?, ?, ?, 0, ?)
               ON CONFLICT(app) DO UPDATE SET
                 display_name = excluded.display_name,
                 resource_types = excluded.resource_types,
                 conflict_policies = excluded.conflict_policies""",
            (app, display_name, json.dumps(resource_types), json.dumps(policies), now),
        )
        con.commit()
        return _get_app_registration(con, app)


def get_app(app: str) -> Optional[AppRegistration]:
    """Get app registration, or None if not registered."""
    with _db() as con:
        return _get_app_registration(con, app)


def list_apps() -> List[AppRegistration]:
    """List all registered apps."""
    with _db() as con:
        rows = con.execute("SELECT * FROM app_registrations ORDER BY app").fetchall()
        return [_row_to_app(r) for r in rows]


def set_app_enabled(app: str, enabled: bool) -> bool:
    """Enable or disable persistence for an app. Returns success."""
    with _db() as con:
        cur = con.execute(
            "UPDATE app_registrations SET enabled = ? WHERE app = ?",
            (1 if enabled else 0, app),
        )
        con.commit()
        return cur.rowcount > 0


def _get_app_registration(con: sqlite3.Connection, app: str) -> Optional[AppRegistration]:
    row = con.execute("SELECT * FROM app_registrations WHERE app = ?", (app,)).fetchone()
    return _row_to_app(row) if row else None


def _row_to_app(row: sqlite3.Row) -> AppRegistration:
    return AppRegistration(
        app=row["app"],
        display_name=row["display_name"],
        resource_types=json.loads(row["resource_types"]),
        conflict_policies=json.loads(row["conflict_policies"]),
        enabled=bool(row["enabled"]),
        registered_at=row["registered_at"],
    )


# ---------------------------------------------------------------------------
# Profiles
# ---------------------------------------------------------------------------


def create_profile(app: str, profile_id: str, display_name: str) -> Profile:
    """Create a profile within an app namespace."""
    with _db() as con:
        _require_app_enabled(con, app)
        now = _now()
        con.execute(
            """INSERT INTO profiles (id, app, display_name, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?)""",
            (profile_id, app, display_name, now, now),
        )
        con.commit()
        return _get_profile(con, app, profile_id)


def get_profile(app: str, profile_id: str) -> Optional[Profile]:
    """Get a profile by app + id. Requires app to be enabled."""
    with _db() as con:
        _require_app_enabled(con, app)
        return _get_profile(con, app, profile_id)


def list_profiles(app: str) -> List[Profile]:
    """List all profiles for an app. Requires app to be enabled."""
    with _db() as con:
        _require_app_enabled(con, app)
        rows = con.execute(
            "SELECT * FROM profiles WHERE app = ? ORDER BY created_at",
            (app,),
        ).fetchall()
        return [_row_to_profile(r) for r in rows]


def update_profile(
    app: str,
    profile_id: str,
    display_name: Optional[str] = None,
    settings_json: Optional[str] = None,
    pin_hash: Optional[str] = None,
) -> Optional[Profile]:
    """Update profile fields. Returns updated profile or None if not found."""
    with _db() as con:
        _require_app_enabled(con, app)
        profile = _get_profile(con, app, profile_id)
        if not profile:
            return None

        updates = []
        params: list = []
        if display_name is not None:
            updates.append("display_name = ?")
            params.append(display_name)
        if settings_json is not None:
            updates.append("settings_json = ?")
            params.append(settings_json)
        if pin_hash is not None:
            updates.append("pin_hash = ?")
            params.append(pin_hash)

        if updates:
            updates.append("updated_at = ?")
            params.append(_now())
            params.extend([app, profile_id])
            con.execute(
                f"UPDATE profiles SET {', '.join(updates)} WHERE app = ? AND id = ?",
                params,
            )
            con.commit()

        return _get_profile(con, app, profile_id)


def delete_profile(app: str, profile_id: str) -> bool:
    """Delete a profile and all its resources. Returns True if existed."""
    with _db() as con:
        # Delete resources first (FK constraint)
        con.execute(
            "DELETE FROM append_log WHERE app = ? AND profile_id = ?",
            (app, profile_id),
        )
        con.execute(
            "DELETE FROM resources WHERE app = ? AND profile_id = ?",
            (app, profile_id),
        )
        cur = con.execute(
            "DELETE FROM profiles WHERE app = ? AND id = ?",
            (app, profile_id),
        )
        con.commit()
        return cur.rowcount > 0


def _get_profile(con: sqlite3.Connection, app: str, profile_id: str) -> Optional[Profile]:
    row = con.execute(
        "SELECT * FROM profiles WHERE app = ? AND id = ?",
        (app, profile_id),
    ).fetchone()
    return _row_to_profile(row) if row else None


def _row_to_profile(row: sqlite3.Row) -> Profile:
    return Profile(
        id=row["id"],
        app=row["app"],
        display_name=row["display_name"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        pin_hash=row["pin_hash"],
        settings_json=row["settings_json"],
    )


# ---------------------------------------------------------------------------
# Resources — last-write-wins (LWW) operations
# ---------------------------------------------------------------------------


def put_resource(
    app: str,
    profile_id: str,
    resource_type: str,
    resource_id: str,
    data: Dict[str, Any],
    source_device_id: str = "",
    base_revision: Optional[int] = None,
) -> Resource:
    """Create or update a resource (last-write-wins).

    If base_revision is provided, the write is rejected if the current
    revision doesn't match (optimistic concurrency).
    """
    with _db() as con:
        _require_profile(con, app, profile_id)
        _require_resource_type(con, app, resource_type)

        now = _now()
        next_rev = _next_revision(con, app, profile_id)

        existing = con.execute(
            "SELECT version, revision FROM resources WHERE app = ? AND profile_id = ? AND resource_type = ? AND id = ?",
            (app, profile_id, resource_type, resource_id),
        ).fetchone()

        if existing:
            if base_revision is not None and existing["revision"] != base_revision:
                raise ConflictError(
                    f"Conflict: expected revision {base_revision}, current is {existing['revision']}",
                    current_revision=existing["revision"],
                )
            new_version = existing["version"] + 1
            con.execute(
                """UPDATE resources
                   SET data = ?, version = ?, updated_at = ?, source_device_id = ?,
                       deleted_at = NULL, revision = ?
                   WHERE app = ? AND profile_id = ? AND resource_type = ? AND id = ?""",
                (json.dumps(data), new_version, now, source_device_id, next_rev,
                 app, profile_id, resource_type, resource_id),
            )
        else:
            new_version = 1
            con.execute(
                """INSERT INTO resources
                   (id, app, profile_id, resource_type, data, version, created_at, updated_at, source_device_id, revision)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (resource_id, app, profile_id, resource_type, json.dumps(data),
                 new_version, now, now, source_device_id, next_rev),
            )

        con.commit()
        return _get_resource(con, app, profile_id, resource_type, resource_id)


def get_resource(
    app: str,
    profile_id: str,
    resource_type: str,
    resource_id: str,
) -> Optional[Resource]:
    """Get a single resource."""
    with _db() as con:
        _require_profile(con, app, profile_id)
        return _get_resource(con, app, profile_id, resource_type, resource_id)


def list_resources(
    app: str,
    profile_id: str,
    resource_type: str,
    since: Optional[str] = None,
    limit: int = 100,
) -> List[Resource]:
    """List resources of a given type within a profile."""
    with _db() as con:
        _require_profile(con, app, profile_id)
        sql = """SELECT * FROM resources
                 WHERE app = ? AND profile_id = ? AND resource_type = ? AND deleted_at IS NULL"""
        params: list = [app, profile_id, resource_type]
        if since:
            sql += " AND updated_at > ?"
            params.append(since)
        sql += " ORDER BY updated_at DESC LIMIT ?"
        params.append(limit)
        rows = con.execute(sql, params).fetchall()
        return [_row_to_resource(r) for r in rows]


def delete_resource(
    app: str,
    profile_id: str,
    resource_type: str,
    resource_id: str,
    hard: bool = False,
) -> bool:
    """Delete a resource (soft by default — sets deleted_at tombstone)."""
    with _db() as con:
        if hard:
            cur = con.execute(
                "DELETE FROM resources WHERE app = ? AND profile_id = ? AND resource_type = ? AND id = ?",
                (app, profile_id, resource_type, resource_id),
            )
        else:
            now = _now()
            next_rev = _next_revision(con, app, profile_id)
            cur = con.execute(
                """UPDATE resources SET deleted_at = ?, revision = ?
                   WHERE app = ? AND profile_id = ? AND resource_type = ? AND id = ? AND deleted_at IS NULL""",
                (now, next_rev, app, profile_id, resource_type, resource_id),
            )
        con.commit()
        return cur.rowcount > 0


def _get_resource(
    con: sqlite3.Connection, app: str, profile_id: str,
    resource_type: str, resource_id: str,
) -> Optional[Resource]:
    row = con.execute(
        """SELECT * FROM resources
           WHERE app = ? AND profile_id = ? AND resource_type = ? AND id = ?""",
        (app, profile_id, resource_type, resource_id),
    ).fetchone()
    return _row_to_resource(row) if row else None


def _row_to_resource(row: sqlite3.Row) -> Resource:
    return Resource(
        id=row["id"],
        app=row["app"],
        profile_id=row["profile_id"],
        resource_type=row["resource_type"],
        data=json.loads(row["data"]),
        version=row["version"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        source_device_id=row["source_device_id"],
        deleted_at=row["deleted_at"],
        revision=row["revision"],
    )


# ---------------------------------------------------------------------------
# Resources — append-only operations
# ---------------------------------------------------------------------------


def append_resource(
    app: str,
    profile_id: str,
    resource_type: str,
    data: Dict[str, Any],
    source_device_id: str = "",
) -> int:
    """Append an entry to the append-only log for a resource type.

    Returns the sequence number.
    """
    with _db() as con:
        _require_profile(con, app, profile_id)
        _require_resource_type(con, app, resource_type)

        # Verify this type uses append policy
        reg = _get_app_registration(con, app)
        if reg and reg.conflict_policies.get(resource_type) != "append":
            raise ValueError(
                f"Resource type '{resource_type}' uses '{reg.conflict_policies.get(resource_type, 'lww')}' "
                f"policy, not 'append'. Use put_resource() instead."
            )

        now = _now()
        cur = con.execute(
            """INSERT INTO append_log (app, profile_id, resource_type, data, created_at, source_device_id)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (app, profile_id, resource_type, json.dumps(data), now, source_device_id),
        )
        con.commit()
        return cur.lastrowid


def list_appended(
    app: str,
    profile_id: str,
    resource_type: str,
    since_seq: int = 0,
    limit: int = 200,
    filter_key: Optional[str] = None,
    filter_value: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """List entries from the append log.

    Args:
        since_seq: Return entries with seq > this value.
        filter_key/filter_value: Optional JSON filter (e.g. deckId=xyz).
    """
    with _db() as con:
        _require_profile(con, app, profile_id)
        sql = """SELECT seq, data, created_at, source_device_id FROM append_log
                 WHERE app = ? AND profile_id = ? AND resource_type = ? AND seq > ?"""
        params: list = [app, profile_id, resource_type, since_seq]
        sql += " ORDER BY seq ASC LIMIT ?"
        params.append(limit)
        rows = con.execute(sql, params).fetchall()

    results = []
    for row in rows:
        entry_data = json.loads(row["data"])
        # Client-side JSON filtering
        if filter_key and filter_value:
            if str(entry_data.get(filter_key)) != filter_value:
                continue
        results.append({
            "seq": row["seq"],
            "data": entry_data,
            "createdAt": row["created_at"],
            "sourceDeviceId": row["source_device_id"],
        })
    return results


# ---------------------------------------------------------------------------
# Sync status
# ---------------------------------------------------------------------------


def sync_status(app: str, profile_id: str) -> Dict[str, Any]:
    """Get sync status for a profile — latest revisions per resource type.

    Unlike other operations, sync_status does NOT require enabled=true.
    The client needs to check sync status to know whether to show the
    "enable persistence" prompt.  But it DOES require the profile to exist.
    """
    with _db() as con:
        reg = _get_app_registration(con, app)
        if not reg:
            return {"enabled": False, "resourceTypes": []}

        profile = _get_profile(con, app, profile_id)
        if not profile:
            raise ValueError(f"Profile '{profile_id}' not found for app '{app}'.")

        type_status = []
        for rt in reg.resource_types:
            policy = reg.conflict_policies.get(rt, "lww")
            if policy == "append":
                row = con.execute(
                    "SELECT MAX(seq) as latest, COUNT(*) as count FROM append_log WHERE app = ? AND profile_id = ? AND resource_type = ?",
                    (app, profile_id, rt),
                ).fetchone()
                type_status.append({
                    "resourceType": rt,
                    "policy": policy,
                    "count": row["count"] if row else 0,
                    "latestSeq": row["latest"] if row and row["latest"] else 0,
                })
            else:
                row = con.execute(
                    "SELECT MAX(revision) as latest, COUNT(*) as count FROM resources WHERE app = ? AND profile_id = ? AND resource_type = ? AND deleted_at IS NULL",
                    (app, profile_id, rt),
                ).fetchone()
                type_status.append({
                    "resourceType": rt,
                    "policy": policy,
                    "count": row["count"] if row else 0,
                    "latestRevision": row["latest"] if row and row["latest"] else 0,
                })

        return {
            "enabled": reg.enabled,
            "profileExists": True,
            "profileId": profile_id,
            "resourceTypes": type_status,
        }


# ---------------------------------------------------------------------------
# Storage stats
# ---------------------------------------------------------------------------


def storage_stats(app: Optional[str] = None) -> Dict[str, Any]:
    """Get storage statistics — total resources, profiles, db size."""
    with _db() as con:
        if app:
            profiles = con.execute("SELECT COUNT(*) as c FROM profiles WHERE app = ?", (app,)).fetchone()["c"]
            resources = con.execute("SELECT COUNT(*) as c FROM resources WHERE app = ? AND deleted_at IS NULL", (app,)).fetchone()["c"]
            appended = con.execute("SELECT COUNT(*) as c FROM append_log WHERE app = ?", (app,)).fetchone()["c"]
        else:
            profiles = con.execute("SELECT COUNT(*) as c FROM profiles").fetchone()["c"]
            resources = con.execute("SELECT COUNT(*) as c FROM resources WHERE deleted_at IS NULL").fetchone()["c"]
            appended = con.execute("SELECT COUNT(*) as c FROM append_log").fetchone()["c"]

    db_size = _db_path().stat().st_size if _db_path().exists() else 0

    return {
        "profiles": profiles,
        "resources": resources,
        "appendEntries": appended,
        "dbSizeBytes": db_size,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _next_revision(con: sqlite3.Connection, app: str, profile_id: str) -> int:
    """Get next monotonic revision number for an app+profile."""
    row = con.execute(
        "SELECT MAX(revision) as r FROM resources WHERE app = ? AND profile_id = ?",
        (app, profile_id),
    ).fetchone()
    return (row["r"] or 0) + 1


class AppDisabledError(Exception):
    """Raised when an operation is attempted on a disabled app."""
    pass


def _require_app(con: sqlite3.Connection, app: str) -> None:
    row = con.execute("SELECT app FROM app_registrations WHERE app = ?", (app,)).fetchone()
    if not row:
        raise ValueError(f"App '{app}' is not registered. Call register_app() first.")


def _require_app_enabled(con: sqlite3.Connection, app: str) -> None:
    """Require that the app is both registered and enabled."""
    row = con.execute("SELECT app, enabled FROM app_registrations WHERE app = ?", (app,)).fetchone()
    if not row:
        raise ValueError(f"App '{app}' is not registered. Call register_app() first.")
    if not row["enabled"]:
        raise AppDisabledError(f"Persistence is disabled for app '{app}'. Enable it via PATCH /v1/persistence/apps/{app}/enable")


def _require_profile(con: sqlite3.Connection, app: str, profile_id: str) -> None:
    _require_app_enabled(con, app)
    row = con.execute(
        "SELECT id FROM profiles WHERE app = ? AND id = ?",
        (app, profile_id),
    ).fetchone()
    if not row:
        raise ValueError(f"Profile '{profile_id}' not found for app '{app}'.")


def _require_resource_type(con: sqlite3.Connection, app: str, resource_type: str) -> None:
    reg = _get_app_registration(con, app)
    if reg and resource_type not in reg.resource_types:
        raise ValueError(
            f"Resource type '{resource_type}' not registered for app '{app}'. "
            f"Registered types: {reg.resource_types}"
        )


class ConflictError(Exception):
    """Raised when an optimistic concurrency check fails."""
    def __init__(self, message: str, current_revision: int):
        super().__init__(message)
        self.current_revision = current_revision
