"""iHomeNerd — local AI brain.

FastAPI application with /health, /capabilities, and domain endpoints.
Serves the Command Center SPA from backend/app/static/ (built by Vite).
Auto-generates TLS certs on first boot for LAN mic/camera access.
"""

import logging
import time
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .capabilities import capabilities_response
from .config import settings
from .domains.language import router as language_router
from .plugins.pronunco import router as pronunco_router
from . import ollama

app = FastAPI(
    title="iHomeNerd",
    version="0.1.0",
    description="Local AI brain for your home or office",
)

_startup_time = time.time()


@app.on_event("startup")
async def _startup():
    """Populate Ollama model cache so first request doesn't 500."""
    global _startup_time
    _startup_time = time.time()
    health = await ollama.check_health()
    if health["ok"]:
        logging.getLogger(__name__).info("Ollama ready: %s", health["models"])
    else:
        logging.getLogger(__name__).warning("Ollama not reachable at startup: %s", health.get("error"))

# CORS — allow browser requests from localhost and LAN origins
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|.*\.local)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount domain routers
app.include_router(language_router)

# Mount plugins
app.include_router(pronunco_router)

# --- Dashboard SPA (built by: cd frontend && npm run build) ---
_here = Path(__file__).parent
_static = _here / "static"
_index = _static / "index.html"

if _index.exists():
    # Serve built assets (JS/CSS/images) at /assets/
    _assets = _static / "assets"
    if _assets.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets)), name="assets")

    @app.get("/app/{rest:path}")
    @app.get("/")
    async def spa_root(rest: str = ""):
        """Serve the SPA — all non-API routes get index.html."""
        return FileResponse(str(_index))
else:
    @app.get("/")
    async def no_ui():
        return {"message": "iHomeNerd API is running. Build the frontend: cd frontend && npm run build"}


@app.get("/health")
async def health():
    """Health check — is the Nerd running, is Ollama reachable?

    Returns both the iHomeNerd format and the fields PronunCo expects
    (ok, version, providers, models).
    """
    ollama_health = await ollama.check_health()
    caps_data = await capabilities_response()

    # Build PronunCo-compatible models map
    models_map = {}
    for name, info in caps_data["capabilities"].items():
        if info["available"] and info.get("model"):
            models_map[name] = info["model"]

    return {
        "ok": ollama_health["ok"],
        "status": "ok",
        "product": "iHomeNerd",
        "version": "0.1.0",
        "hostname": caps_data["hostname"],
        "ollama": ollama_health["ok"],
        "providers": ["gemma_local"] if ollama_health["ok"] else [],
        "models": models_map,
        "binding": "0.0.0.0" if settings.lan_mode else settings.host,
        "port": settings.port,
    }


@app.get("/capabilities")
async def capabilities():
    """Capability registry.

    Returns a flat boolean map matching PronunCo's LocalCompanionCapabilities
    interface, plus full detail under _detail for debugging.
    """
    full = await capabilities_response()
    # Flat boolean map: { "extract_lesson_items": true, ... }
    flat = {name: info["available"] for name, info in full["capabilities"].items()}
    return {**flat, "_detail": full}


# Registered plugins — name + description for the System dashboard
_PLUGINS = [
    {"name": "PronunCo", "description": "AI pronunciation coach & language learning"},
]


def _dir_size_bytes(path: Path) -> int:
    """Total size of a directory tree in bytes."""
    if not path.exists():
        return 0
    return sum(f.stat().st_size for f in path.rglob("*") if f.is_file())


@app.get("/system/stats")
async def system_stats():
    """System statistics for the dashboard."""
    from . import sessions

    active = sessions.list_active()
    storage_bytes = _dir_size_bytes(settings.data_dir)

    # Derive connected apps from active sessions
    apps_with_sessions: dict[str, dict] = {}
    for s in active:
        app_name = s["app"]
        if app_name not in apps_with_sessions or s["created_at"] > apps_with_sessions[app_name]["last_seen"]:
            apps_with_sessions[app_name] = {"last_seen": s["created_at"], "sessions": 0}
        apps_with_sessions[app_name]["sessions"] += 1

    # Merge plugin registry with session activity
    connected_apps = []
    seen_names = set()
    for plugin in _PLUGINS:
        name_lower = plugin["name"].lower()
        session_info = apps_with_sessions.get(name_lower, {})
        connected_apps.append({
            "name": plugin["name"],
            "description": plugin["description"],
            "registered": True,
            "active_sessions": session_info.get("sessions", 0),
            "last_seen": session_info.get("last_seen"),
        })
        seen_names.add(name_lower)

    # Add any apps with sessions that aren't in the plugin registry
    for app_name, info in apps_with_sessions.items():
        if app_name not in seen_names:
            connected_apps.append({
                "name": app_name,
                "description": None,
                "registered": False,
                "active_sessions": info["sessions"],
                "last_seen": info["last_seen"],
            })

    return {
        "uptime_seconds": round(time.time() - _startup_time),
        "session_count": len(active),
        "storage_bytes": storage_bytes,
        "connected_apps": connected_apps,
    }


@app.get("/sessions")
async def list_sessions(app_filter: str | None = None):
    """List active sessions (for debugging/dashboard)."""
    from . import sessions
    return {"sessions": sessions.list_active(app=app_filter)}


def main():
    """Entry point for `ihomenerd` CLI or `python -m app.main`."""
    import uvicorn
    from .certs import ensure_certs

    host = "0.0.0.0" if settings.lan_mode else settings.host

    # Auto-generate TLS certs for LAN HTTPS (mic/camera access)
    ssl_kwargs = {}
    certs_dir = settings.data_dir / "certs"
    result = ensure_certs(certs_dir)
    if result:
        cert_path, key_path = result
        ssl_kwargs = {"ssl_certfile": str(cert_path), "ssl_keyfile": str(key_path)}

    uvicorn.run(app, host=host, port=settings.port, **ssl_kwargs)


if __name__ == "__main__":
    main()
