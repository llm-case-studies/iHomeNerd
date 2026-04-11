"""Home journal — accumulated knowledge about THIS home/office.

Every solved problem, answered question, and derived fact gets stored here.
Next time a similar question comes up, the journal provides the answer
(or relevant context) without burning GPU cycles on re-derivation.
"""

from __future__ import annotations

import json
import sqlite3
import math
from datetime import datetime, timezone
from pathlib import Path
from dataclasses import dataclass

from .config import settings


@dataclass
class JournalEntry:
    id: int
    timestamp: str
    domain: str
    collection: str | None
    problem: str
    reasoning: str
    solution: str
    outcome: str  # resolved, partial, failed, informational
    sources: list[str]
    similarity: float = 0.0


def _db_path() -> Path:
    return settings.data_dir / "journal.sqlite"


def _connect() -> sqlite3.Connection:
    path = _db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(path))
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("""
        CREATE TABLE IF NOT EXISTS journal (
            id INTEGER PRIMARY KEY,
            timestamp TEXT NOT NULL,
            domain TEXT NOT NULL,
            collection TEXT,
            problem TEXT NOT NULL,
            reasoning TEXT,
            solution TEXT,
            outcome TEXT DEFAULT 'informational',
            sources TEXT DEFAULT '[]',
            embedding BLOB
        )
    """)
    con.commit()
    return con


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def save(
    domain: str,
    problem: str,
    reasoning: str,
    solution: str,
    outcome: str = "resolved",
    collection: str | None = None,
    sources: list[str] | None = None,
    embedding: list[float] | None = None,
) -> int:
    """Save a journal entry. Returns the entry ID."""
    con = _connect()
    emb_bytes = json.dumps(embedding).encode() if embedding else None
    cur = con.execute(
        """INSERT INTO journal (timestamp, domain, collection, problem, reasoning, solution, outcome, sources, embedding)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            datetime.now(timezone.utc).isoformat(),
            domain,
            collection,
            problem,
            reasoning,
            solution,
            outcome,
            json.dumps(sources or []),
            emb_bytes,
        ),
    )
    con.commit()
    entry_id = cur.lastrowid
    con.close()
    return entry_id


def search_similar(
    query_embedding: list[float],
    domain: str | None = None,
    k: int = 5,
    min_score: float = 0.65,
) -> list[JournalEntry]:
    """Find similar past entries by embedding cosine similarity."""
    con = _connect()
    sql = "SELECT * FROM journal WHERE embedding IS NOT NULL"
    params: list = []
    if domain:
        sql += " AND domain = ?"
        params.append(domain)
    rows = con.execute(sql, params).fetchall()
    con.close()

    scored = []
    for row in rows:
        stored_emb = json.loads(row["embedding"])
        sim = _cosine_similarity(query_embedding, stored_emb)
        if sim >= min_score:
            scored.append((sim, row))

    scored.sort(key=lambda x: x[0], reverse=True)

    return [
        JournalEntry(
            id=row["id"],
            timestamp=row["timestamp"],
            domain=row["domain"],
            collection=row["collection"],
            problem=row["problem"],
            reasoning=row["reasoning"] or "",
            solution=row["solution"] or "",
            outcome=row["outcome"] or "informational",
            sources=json.loads(row["sources"]) if row["sources"] else [],
            similarity=sim,
        )
        for sim, row in scored[:k]
    ]


def list_entries(domain: str | None = None, limit: int = 50) -> list[JournalEntry]:
    """List recent journal entries."""
    con = _connect()
    sql = "SELECT * FROM journal"
    params: list = []
    if domain:
        sql += " WHERE domain = ?"
        params.append(domain)
    sql += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)
    rows = con.execute(sql, params).fetchall()
    con.close()

    return [
        JournalEntry(
            id=row["id"],
            timestamp=row["timestamp"],
            domain=row["domain"],
            collection=row["collection"],
            problem=row["problem"],
            reasoning=row["reasoning"] or "",
            solution=row["solution"] or "",
            outcome=row["outcome"] or "informational",
            sources=json.loads(row["sources"]) if row["sources"] else [],
        )
        for row in rows
    ]
