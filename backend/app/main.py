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
from fastapi.responses import FileResponse, HTMLResponse, Response
from fastapi.staticfiles import StaticFiles

from .capabilities import capabilities_response
from .config import settings
from .domains.language import router as language_router
from .domains.docs import router as docs_router
from .domains.investigate import router as investigate_router
from .domains.agents import router as agents_router
from .domains.builder import router as builder_router
from .domains.rules_router import router as rules_router
from .domains.vision_router import router as vision_router
from .domains.persistence_router import router as persistence_router
from .plugins.pronunco import router as pronunco_router
from .plugins.pronunco_persistence import router as pronunco_persistence_router
from .plugins import pronunco_persistence
from . import ollama
from .discovery import advertise_start, advertise_stop, get_brain_info, browse_peers

app = FastAPI(
    title="iHomeNerd",
    version="0.1.0",
    description="Local AI brain for your home or office",
)

_startup_time = time.time()


@app.on_event("startup")
async def _startup():
    """Populate Ollama model cache and advertise on network."""
    global _startup_time
    _startup_time = time.time()
    health = await ollama.check_health()
    if health["ok"]:
        logging.getLogger(__name__).info("Ollama ready: %s", health["models"])
    else:
        logging.getLogger(__name__).warning("Ollama not reachable at startup: %s", health.get("error"))
    advertise_start()
    # Register app plugins with persistence service
    pronunco_persistence.register()


@app.on_event("shutdown")
async def _shutdown():
    advertise_stop()

# CORS — allow browser requests from localhost and LAN origins
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|.*\.local)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount domain routers
app.include_router(language_router)
app.include_router(docs_router)
app.include_router(investigate_router)
app.include_router(agents_router)
app.include_router(builder_router)
app.include_router(rules_router)
app.include_router(vision_router)
app.include_router(persistence_router)

# Mount plugins
app.include_router(pronunco_router)
app.include_router(pronunco_persistence_router)

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


# --- Trust setup page (serves on both HTTP and HTTPS) ---
_templates = _here / "templates"
_certs_dir = settings.data_dir / "certs"


@app.get("/setup")
async def setup_page():
    """Serve the trust certificate setup page.

    Auto-detects the user's OS/browser and shows only the relevant
    installation instructions for the iHomeNerd local CA certificate.
    """
    template = _templates / "setup.html"
    if not template.exists():
        return HTMLResponse("<h1>Setup template not found</h1>", status_code=500)
    return HTMLResponse(template.read_text())


@app.get("/setup/ca.crt")
async def download_ca_cert():
    """Download the CA certificate for manual trust installation."""
    from .certs import get_ca_cert_path
    ca_path = get_ca_cert_path(_certs_dir)
    if not ca_path:
        return HTMLResponse("<h1>CA certificate not generated yet</h1>", status_code=404)
    return FileResponse(
        str(ca_path),
        media_type="application/x-x509-ca-cert",
        filename="ihomenerd-ca.crt",
    )


@app.get("/setup/profile.mobileconfig")
async def download_mobileconfig():
    """Download an Apple .mobileconfig profile that installs the CA cert.

    This provides a clean installation experience on iOS and macOS.
    """
    from .certs import get_ca_cert_path
    import base64, uuid as _uuid
    ca_path = get_ca_cert_path(_certs_dir)
    if not ca_path:
        return HTMLResponse("<h1>CA certificate not generated yet</h1>", status_code=404)

    # Read the DER-encoded cert (convert from PEM)
    import subprocess
    try:
        der_bytes = subprocess.check_output([
            "openssl", "x509", "-in", str(ca_path), "-outform", "DER",
        ], stderr=subprocess.DEVNULL)
    except Exception:
        # Fallback: serve PEM as-is (still works, just less clean)
        der_bytes = ca_path.read_bytes()

    cert_b64 = base64.b64encode(der_bytes).decode()
    profile_uuid = str(_uuid.uuid5(_uuid.NAMESPACE_DNS, "ihomenerd.local.ca"))
    cert_uuid = str(_uuid.uuid5(_uuid.NAMESPACE_DNS, "ihomenerd.local.ca.cert"))

    mobileconfig = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>PayloadCertificateFileName</key>
            <string>ihomenerd-ca.crt</string>
            <key>PayloadContent</key>
            <data>{cert_b64}</data>
            <key>PayloadDescription</key>
            <string>Adds the iHomeNerd Local CA to your trusted certificates.</string>
            <key>PayloadDisplayName</key>
            <string>iHomeNerd Local CA</string>
            <key>PayloadIdentifier</key>
            <string>com.ihomenerd.local.ca.cert</string>
            <key>PayloadType</key>
            <string>com.apple.security.root</string>
            <key>PayloadUUID</key>
            <string>{cert_uuid}</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
        </dict>
    </array>
    <key>PayloadDisplayName</key>
    <string>iHomeNerd Trust Certificate</string>
    <key>PayloadDescription</key>
    <string>Install this profile to trust your iHomeNerd for secure connections (microphone, camera, sync).</string>
    <key>PayloadIdentifier</key>
    <string>com.ihomenerd.local.ca</string>
    <key>PayloadOrganization</key>
    <string>iHomeNerd</string>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>{profile_uuid}</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>"""

    return Response(
        content=mobileconfig,
        media_type="application/x-apple-aspen-config",
        headers={"Content-Disposition": "attachment; filename=iHomeNerd-Trust.mobileconfig"},
    )


@app.get("/setup/extension")
async def download_extension_zip():
    """Download the iHomeNerd Bridge extension as a zip for sideloading."""
    import io
    import zipfile

    ext_dir = Path(__file__).resolve().parent.parent.parent / "browser-extension" / "ihomenerd-bridge"
    if not ext_dir.exists():
        return HTMLResponse("<h1>Extension files not found</h1>", status_code=404)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for fpath in sorted(ext_dir.rglob("*")):
            if fpath.is_file():
                zf.write(fpath, f"ihomenerd-bridge/{fpath.relative_to(ext_dir)}")
    buf.seek(0)

    return Response(
        content=buf.read(),
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=ihomenerd-bridge.zip"},
    )


@app.get("/setup/test")
async def setup_test():
    """HTTPS test endpoint — if the browser can reach this, the cert is trusted."""
    return {"trusted": True, "product": "iHomeNerd"}


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


@app.get("/discover")
async def discover():
    """Brain discovery endpoint — returns this machine's capabilities.

    Scouts probe this endpoint to find and evaluate Brains on the LAN.
    """
    info = get_brain_info()
    # Add live model info
    ollama_health = await ollama.check_health()
    info["ollama"] = ollama_health["ok"]
    info["models"] = ollama_health.get("models", [])
    return info


@app.get("/discover/peers")
async def discover_peers():
    """Find other iHomeNerd brains on the LAN via mDNS (avahi-browse).

    The browser extension cannot do mDNS/DNS-SD directly, so it calls
    this endpoint on any reachable brain to discover other brains.
    """
    return {"peers": browse_peers()}


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


def _build_setup_app():
    """Build a minimal HTTP-only app that serves /setup routes.

    This solves the chicken-and-egg problem: users need to reach /setup
    to install the CA certificate, but the main server requires HTTPS.
    This lightweight HTTP server on port+1 serves only setup-related
    routes — no API, no app, just trust bootstrap.
    """
    from fastapi import FastAPI as _FastAPI

    setup_app = _FastAPI(title="iHomeNerd Setup", docs_url=None, redoc_url=None)

    setup_app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https?://.*",
        allow_methods=["GET"],
        allow_headers=["*"],
    )

    # Re-use the setup routes from the main app
    @setup_app.get("/")
    @setup_app.get("/setup")
    async def setup_redirect():
        return await setup_page()

    @setup_app.get("/setup/ca.crt")
    async def setup_ca():
        return await download_ca_cert()

    @setup_app.get("/setup/profile.mobileconfig")
    async def setup_profile():
        return await download_mobileconfig()

    @setup_app.get("/setup/extension")
    async def setup_ext():
        return await download_extension_zip()

    @setup_app.get("/setup/test")
    async def setup_test_redirect():
        return await setup_test()

    # Discovery + health on HTTP too — the extension needs these to find
    # brains before the user has installed the HTTPS CA certificate.
    @setup_app.get("/discover/peers")
    async def setup_discover_peers():
        return await discover_peers()

    @setup_app.get("/discover")
    async def setup_discover():
        return await discover()

    @setup_app.get("/health")
    async def setup_health():
        return await health()

    return setup_app


def main():
    """Entry point for `ihomenerd` CLI or `python -m app.main`."""
    import asyncio
    import uvicorn
    from .certs import ensure_certs

    host = "0.0.0.0" if settings.lan_mode else settings.host

    # Auto-generate TLS certs for LAN HTTPS (mic/camera access)
    # Uses a local CA (ca.crt/ca.key) + signed server cert (server.crt/server.key).
    # Users install ca.crt once via /setup page → all server certs trusted.
    ssl_kwargs = {}
    certs_dir = settings.data_dir / "certs"
    result = ensure_certs(certs_dir)
    if result:
        cert_path, key_path = result
        ssl_kwargs = {"ssl_certfile": str(cert_path), "ssl_keyfile": str(key_path)}

    http_port = settings.port + 1  # 17778

    logging.getLogger(__name__).info(
        "HTTPS on port %d | HTTP setup on port %d — http://<lan-ip>:%d/setup",
        settings.port, http_port, http_port,
    )

    async def _serve():
        # Main HTTPS server
        main_config = uvicorn.Config(
            app, host=host, port=settings.port,
            log_level=settings.log_level, **ssl_kwargs,
        )
        main_server = uvicorn.Server(main_config)

        # HTTP-only setup server (no TLS — so users can bootstrap trust)
        setup_config = uvicorn.Config(
            _build_setup_app(), host=host, port=http_port,
            log_level=settings.log_level,
        )
        setup_server = uvicorn.Server(setup_config)

        await asyncio.gather(
            main_server.serve(),
            setup_server.serve(),
        )

    asyncio.run(_serve())


if __name__ == "__main__":
    main()
