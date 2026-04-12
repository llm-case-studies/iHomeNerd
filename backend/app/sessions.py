"""Short-lived session manager for multi-turn interactions.

Used by dialogue practice (PronunCo scenario packs), document Q&A sessions,
troubleshooting walkthroughs, and any flow that needs context across turns.

Sessions are in-memory and auto-expire. No persistent storage, no accounts.
"""

from __future__ import annotations

import secrets
import time
from dataclasses import dataclass, field


@dataclass
class Turn:
    role: str  # "user", "agent", "system"
    content: str
    metadata: dict = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)


@dataclass
class Session:
    id: str
    app: str  # "pronunco", "telpro-bro", "ihomenerd", etc.
    purpose: str  # "dialogue", "document_qa", "troubleshoot", etc.
    config: dict = field(default_factory=dict)  # scenario_id, roles, language, difficulty, etc.
    turns: list[Turn] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    expires_at: float = 0.0
    closed: bool = False

    def is_expired(self) -> bool:
        return time.time() > self.expires_at

    def add_turn(self, role: str, content: str, metadata: dict | None = None) -> Turn:
        turn = Turn(role=role, content=content, metadata=metadata or {})
        self.turns.append(turn)
        return turn

    def messages_for_llm(self) -> list[dict]:
        """Format turns as Ollama-compatible chat messages."""
        msgs = []
        for t in self.turns:
            msgs.append({"role": t.role if t.role != "agent" else "assistant", "content": t.content})
        return msgs


# In-memory store — no persistence needed for short-lived sessions
_sessions: dict[str, Session] = {}

# Default session TTL: 30 minutes
DEFAULT_TTL_SECONDS = 30 * 60

# Max sessions to prevent memory bloat
MAX_SESSIONS = 100


def _cleanup_expired():
    """Remove expired sessions."""
    expired = [sid for sid, s in _sessions.items() if s.is_expired()]
    for sid in expired:
        del _sessions[sid]


def create(
    app: str,
    purpose: str,
    config: dict | None = None,
    ttl_seconds: int = DEFAULT_TTL_SECONDS,
) -> Session:
    """Create a new session. Returns the session object."""
    _cleanup_expired()

    # Enforce max sessions
    if len(_sessions) >= MAX_SESSIONS:
        # Drop the oldest expired or oldest overall
        oldest_id = min(_sessions, key=lambda k: _sessions[k].created_at)
        del _sessions[oldest_id]

    session = Session(
        id=secrets.token_urlsafe(16),
        app=app,
        purpose=purpose,
        config=config or {},
        expires_at=time.time() + ttl_seconds,
    )
    _sessions[session.id] = session
    return session


def get(session_id: str) -> Session | None:
    """Get a session by ID. Returns None if not found or expired."""
    _cleanup_expired()
    session = _sessions.get(session_id)
    if session and session.is_expired():
        del _sessions[session_id]
        return None
    return session


def close(session_id: str) -> bool:
    """Close a session. Returns True if it existed."""
    session = _sessions.pop(session_id, None)
    return session is not None


def list_active(app: str | None = None) -> list[dict]:
    """List active sessions, optionally filtered by app."""
    _cleanup_expired()
    result = []
    for s in _sessions.values():
        if app and s.app != app:
            continue
        result.append({
            "id": s.id,
            "app": s.app,
            "purpose": s.purpose,
            "turns": len(s.turns),
            "created_at": s.created_at,
            "expires_at": s.expires_at,
        })
    return result
