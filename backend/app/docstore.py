"""Document store — SQLite-backed RAG storage for local document collections.

Stores collections, documents, and text chunks with embedding vectors.
Vector search uses cosine similarity (same pattern as journal.py).
"""

from __future__ import annotations

import json
import math
import sqlite3
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from .config import settings


@dataclass
class Collection:
    id: str
    name: str
    path: str
    watching: bool = False
    document_count: int = 0
    chunk_count: int = 0
    last_ingested: str | None = None


@dataclass
class Chunk:
    id: int
    collection_id: str
    document_id: int
    document_name: str
    page: int
    text: str
    relevance: float = 0.0


def _db_path() -> Path:
    return settings.data_dir / "docstore.sqlite"


def _connect() -> sqlite3.Connection:
    path = _db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(path))
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.executescript("""
        CREATE TABLE IF NOT EXISTS collections (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            watching INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY,
            collection_id TEXT NOT NULL REFERENCES collections(id),
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            page_count INTEGER DEFAULT 0,
            ingested_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS chunks (
            id INTEGER PRIMARY KEY,
            document_id INTEGER NOT NULL REFERENCES documents(id),
            collection_id TEXT NOT NULL REFERENCES collections(id),
            page INTEGER DEFAULT 0,
            position INTEGER DEFAULT 0,
            text TEXT NOT NULL,
            embedding BLOB
        );

        CREATE INDEX IF NOT EXISTS idx_chunks_collection ON chunks(collection_id);
        CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents(collection_id);
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


# ---------------------------------------------------------------------------
# Collections
# ---------------------------------------------------------------------------

def list_collections() -> list[Collection]:
    """List all collections with document/chunk counts."""
    con = _connect()
    rows = con.execute("""
        SELECT c.id, c.name, c.path, c.watching, c.created_at,
               COUNT(DISTINCT d.id) AS doc_count,
               COUNT(ch.id) AS chunk_count,
               MAX(d.ingested_at) AS last_ingested
        FROM collections c
        LEFT JOIN documents d ON d.collection_id = c.id
        LEFT JOIN chunks ch ON ch.collection_id = c.id
        GROUP BY c.id
        ORDER BY c.created_at DESC
    """).fetchall()
    con.close()
    return [
        Collection(
            id=r["id"],
            name=r["name"],
            path=r["path"],
            watching=bool(r["watching"]),
            document_count=r["doc_count"],
            chunk_count=r["chunk_count"],
            last_ingested=r["last_ingested"],
        )
        for r in rows
    ]


def get_collection(collection_id: str) -> Collection | None:
    con = _connect()
    row = con.execute("SELECT * FROM collections WHERE id = ?", (collection_id,)).fetchone()
    con.close()
    if not row:
        return None
    return Collection(id=row["id"], name=row["name"], path=row["path"], watching=bool(row["watching"]))


def create_collection(collection_id: str, name: str, path: str, watching: bool = False) -> Collection:
    con = _connect()
    now = datetime.now(timezone.utc).isoformat()
    con.execute(
        "INSERT OR REPLACE INTO collections (id, name, path, watching, created_at) VALUES (?, ?, ?, ?, ?)",
        (collection_id, name, path, int(watching), now),
    )
    con.commit()
    con.close()
    return Collection(id=collection_id, name=name, path=path, watching=watching)


# ---------------------------------------------------------------------------
# Ingestion
# ---------------------------------------------------------------------------

def add_document(collection_id: str, filename: str, filepath: str, page_count: int = 0) -> int:
    """Insert a document record. Returns the document ID."""
    con = _connect()
    now = datetime.now(timezone.utc).isoformat()
    cur = con.execute(
        "INSERT INTO documents (collection_id, filename, filepath, page_count, ingested_at) VALUES (?, ?, ?, ?, ?)",
        (collection_id, filename, filepath, page_count, now),
    )
    con.commit()
    doc_id = cur.lastrowid
    con.close()
    return doc_id


def add_chunk(collection_id: str, document_id: int, page: int, position: int, text: str, embedding: list[float] | None = None) -> int:
    """Insert a text chunk with optional embedding. Returns chunk ID."""
    con = _connect()
    emb_bytes = json.dumps(embedding).encode() if embedding else None
    cur = con.execute(
        "INSERT INTO chunks (collection_id, document_id, page, position, text, embedding) VALUES (?, ?, ?, ?, ?, ?)",
        (collection_id, document_id, page, position, text, emb_bytes),
    )
    con.commit()
    chunk_id = cur.lastrowid
    con.close()
    return chunk_id


def add_chunks_batch(chunks: list[tuple[str, int, int, int, str, list[float] | None]]) -> int:
    """Batch insert chunks. Each tuple: (collection_id, document_id, page, position, text, embedding).
    Returns count inserted.
    """
    con = _connect()
    rows = [
        (cid, did, page, pos, text, json.dumps(emb).encode() if emb else None)
        for cid, did, page, pos, text, emb in chunks
    ]
    con.executemany(
        "INSERT INTO chunks (collection_id, document_id, page, position, text, embedding) VALUES (?, ?, ?, ?, ?, ?)",
        rows,
    )
    con.commit()
    count = len(rows)
    con.close()
    return count


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

def search_similar(
    query_embedding: list[float],
    collection_ids: list[str] | None = None,
    k: int = 5,
    min_score: float = 0.5,
) -> list[Chunk]:
    """Find similar chunks by cosine similarity across specified collections."""
    con = _connect()

    if collection_ids:
        placeholders = ",".join("?" for _ in collection_ids)
        sql = f"""
            SELECT ch.id, ch.collection_id, ch.document_id, ch.page, ch.position, ch.text, ch.embedding,
                   d.filename AS document_name
            FROM chunks ch
            JOIN documents d ON d.id = ch.document_id
            WHERE ch.embedding IS NOT NULL AND ch.collection_id IN ({placeholders})
        """
        rows = con.execute(sql, collection_ids).fetchall()
    else:
        rows = con.execute("""
            SELECT ch.id, ch.collection_id, ch.document_id, ch.page, ch.position, ch.text, ch.embedding,
                   d.filename AS document_name
            FROM chunks ch
            JOIN documents d ON d.id = ch.document_id
            WHERE ch.embedding IS NOT NULL
        """).fetchall()

    con.close()

    scored = []
    for row in rows:
        stored_emb = json.loads(row["embedding"])
        sim = _cosine_similarity(query_embedding, stored_emb)
        if sim >= min_score:
            scored.append((sim, row))

    scored.sort(key=lambda x: x[0], reverse=True)

    return [
        Chunk(
            id=row["id"],
            collection_id=row["collection_id"],
            document_id=row["document_id"],
            document_name=row["document_name"],
            page=row["page"],
            text=row["text"],
            relevance=round(sim, 4),
        )
        for sim, row in scored[:k]
    ]


# ---------------------------------------------------------------------------
# File parsing utilities
# ---------------------------------------------------------------------------

SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md", ".csv", ".json", ".log"}


def chunk_text(text: str, max_chars: int = 800, overlap: int = 100) -> list[str]:
    """Split text into overlapping chunks by paragraph/sentence boundaries."""
    if not text.strip():
        return []

    # Split by double newlines (paragraphs) first
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

    chunks = []
    current = ""

    for para in paragraphs:
        if len(current) + len(para) + 2 > max_chars and current:
            chunks.append(current.strip())
            # Overlap: keep the tail of the current chunk
            if overlap > 0 and len(current) > overlap:
                current = current[-overlap:] + "\n\n" + para
            else:
                current = para
        else:
            current = current + "\n\n" + para if current else para

    if current.strip():
        chunks.append(current.strip())

    return chunks


def extract_text_from_file(filepath: Path) -> list[tuple[int, str]]:
    """Extract text from a file. Returns list of (page_number, text) tuples.
    Page 0 for plain text files.
    """
    suffix = filepath.suffix.lower()

    if suffix == ".pdf":
        return _extract_pdf(filepath)
    elif suffix in (".txt", ".md", ".csv", ".log"):
        text = filepath.read_text(errors="replace")
        return [(0, text)]
    elif suffix == ".json":
        text = filepath.read_text(errors="replace")
        return [(0, text)]

    return []


def _extract_pdf(filepath: Path) -> list[tuple[int, str]]:
    """Extract text from PDF using pypdf."""
    try:
        from pypdf import PdfReader
    except ImportError:
        # pypdf not installed — skip PDF files gracefully
        return []

    try:
        reader = PdfReader(str(filepath))
        pages = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                pages.append((i + 1, text))
        return pages
    except Exception:
        return []
