"""Managed node registry for the iHomeNerd control plane."""

from __future__ import annotations

import json
import secrets
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Generator

from .config import settings


_DB_NAME = "nodes.sqlite"
_schema_initialized = False


@dataclass
class ManagedNode:
    id: str
    hostname: str
    ip: str
    control_host: str
    ssh_user: str
    ssh_port: int
    platform: str
    arch: str
    runtime_kind: str
    install_path: str
    service_name: str
    state: str
    managed: bool
    install_supported: bool
    created_at: str
    updated_at: str
    last_seen: str | None = None
    metadata: dict[str, Any] | None = None


def _db_path() -> Path:
    return settings.data_dir / _DB_NAME


def _connect() -> sqlite3.Connection:
    global _schema_initialized
    path = _db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(path), timeout=10)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    if not _schema_initialized:
        _ensure_schema(con)
        _schema_initialized = True
    return con


@contextmanager
def _db() -> Generator[sqlite3.Connection, None, None]:
    con = _connect()
    try:
        yield con
    finally:
        con.close()


def _ensure_schema(con: sqlite3.Connection) -> None:
    con.executescript("""
        CREATE TABLE IF NOT EXISTS managed_nodes (
            id TEXT PRIMARY KEY,
            hostname TEXT NOT NULL DEFAULT '',
            ip TEXT NOT NULL DEFAULT '',
            control_host TEXT NOT NULL DEFAULT '',
            ssh_user TEXT NOT NULL DEFAULT '',
            ssh_port INTEGER NOT NULL DEFAULT 22,
            platform TEXT NOT NULL DEFAULT '',
            arch TEXT NOT NULL DEFAULT '',
            runtime_kind TEXT NOT NULL DEFAULT '',
            install_path TEXT NOT NULL DEFAULT '',
            service_name TEXT NOT NULL DEFAULT '',
            state TEXT NOT NULL DEFAULT 'discovered',
            managed INTEGER NOT NULL DEFAULT 0,
            install_supported INTEGER NOT NULL DEFAULT 0,
            last_seen TEXT,
            metadata TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_managed_nodes_ip
            ON managed_nodes(ip);

        CREATE INDEX IF NOT EXISTS idx_managed_nodes_control_host
            ON managed_nodes(control_host);
    """)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def now_iso() -> str:
    """Public timestamp helper for sibling modules."""
    return _now()


def _row_to_node(row: sqlite3.Row) -> ManagedNode:
    return ManagedNode(
        id=row["id"],
        hostname=row["hostname"],
        ip=row["ip"],
        control_host=row["control_host"],
        ssh_user=row["ssh_user"],
        ssh_port=int(row["ssh_port"]),
        platform=row["platform"],
        arch=row["arch"],
        runtime_kind=row["runtime_kind"],
        install_path=row["install_path"],
        service_name=row["service_name"],
        state=row["state"],
        managed=bool(row["managed"]),
        install_supported=bool(row["install_supported"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        last_seen=row["last_seen"],
        metadata=json.loads(row["metadata"] or "{}"),
    )


def list_nodes() -> list[ManagedNode]:
    with _db() as con:
        rows = con.execute("SELECT * FROM managed_nodes ORDER BY hostname, ip").fetchall()
        return [_row_to_node(r) for r in rows]


def get_node(node_id: str) -> ManagedNode | None:
    with _db() as con:
        row = con.execute("SELECT * FROM managed_nodes WHERE id = ?", (node_id,)).fetchone()
        return _row_to_node(row) if row else None


def find_node(*, ip: str | None = None, control_host: str | None = None, hostname: str | None = None) -> ManagedNode | None:
    with _db() as con:
        if ip:
            row = con.execute("SELECT * FROM managed_nodes WHERE ip = ? ORDER BY updated_at DESC LIMIT 1", (ip,)).fetchone()
            if row:
                return _row_to_node(row)
        if control_host:
            row = con.execute(
                "SELECT * FROM managed_nodes WHERE control_host = ? ORDER BY updated_at DESC LIMIT 1",
                (control_host,),
            ).fetchone()
            if row:
                return _row_to_node(row)
        if hostname:
            row = con.execute(
                "SELECT * FROM managed_nodes WHERE hostname = ? ORDER BY updated_at DESC LIMIT 1",
                (hostname,),
            ).fetchone()
            if row:
                return _row_to_node(row)
    return None


def upsert_node(data: dict[str, Any]) -> ManagedNode:
    now = _now()
    existing = find_node(
        ip=data.get("ip") or None,
        control_host=data.get("control_host") or None,
        hostname=data.get("hostname") or None,
    )
    node_id = data.get("id") or (existing.id if existing else secrets.token_hex(8))
    created_at = existing.created_at if existing else now
    metadata = data.get("metadata", existing.metadata if existing else {}) or {}

    values = {
        "id": node_id,
        "hostname": data.get("hostname") or (existing.hostname if existing else ""),
        "ip": data.get("ip") or (existing.ip if existing else ""),
        "control_host": data.get("control_host") or (existing.control_host if existing else ""),
        "ssh_user": data.get("ssh_user") or (existing.ssh_user if existing else ""),
        "ssh_port": int(data.get("ssh_port", existing.ssh_port if existing else 22)),
        "platform": data.get("platform") or (existing.platform if existing else ""),
        "arch": data.get("arch") or (existing.arch if existing else ""),
        "runtime_kind": data.get("runtime_kind") or (existing.runtime_kind if existing else ""),
        "install_path": data.get("install_path") or (existing.install_path if existing else ""),
        "service_name": data.get("service_name") or (existing.service_name if existing else ""),
        "state": data.get("state") or (existing.state if existing else "discovered"),
        "managed": 1 if data.get("managed", existing.managed if existing else False) else 0,
        "install_supported": 1 if data.get("install_supported", existing.install_supported if existing else False) else 0,
        "last_seen": data.get("last_seen", existing.last_seen if existing else now),
        "metadata": json.dumps(metadata),
        "created_at": created_at,
        "updated_at": now,
    }

    with _db() as con:
        con.execute(
            """
            INSERT INTO managed_nodes (
                id, hostname, ip, control_host, ssh_user, ssh_port, platform, arch,
                runtime_kind, install_path, service_name, state, managed,
                install_supported, last_seen, metadata, created_at, updated_at
            ) VALUES (
                :id, :hostname, :ip, :control_host, :ssh_user, :ssh_port, :platform, :arch,
                :runtime_kind, :install_path, :service_name, :state, :managed,
                :install_supported, :last_seen, :metadata, :created_at, :updated_at
            )
            ON CONFLICT(id) DO UPDATE SET
                hostname = excluded.hostname,
                ip = excluded.ip,
                control_host = excluded.control_host,
                ssh_user = excluded.ssh_user,
                ssh_port = excluded.ssh_port,
                platform = excluded.platform,
                arch = excluded.arch,
                runtime_kind = excluded.runtime_kind,
                install_path = excluded.install_path,
                service_name = excluded.service_name,
                state = excluded.state,
                managed = excluded.managed,
                install_supported = excluded.install_supported,
                last_seen = excluded.last_seen,
                metadata = excluded.metadata,
                updated_at = excluded.updated_at
            """,
            values,
        )
        con.commit()
    node = get_node(node_id)
    assert node is not None
    return node
