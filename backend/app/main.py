"""iHomeNerd — local AI brain.

FastAPI application with /health, /capabilities, and domain endpoints.
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .capabilities import capabilities_response
from .config import settings
from .domains.language import router as language_router
from . import ollama

app = FastAPI(
    title="iHomeNerd",
    version="0.1.0",
    description="Local AI brain for your home or office",
)

# Mount domain routers
app.include_router(language_router)

# Templates and static files for the dashboard
_here = Path(__file__).parent
templates = Jinja2Templates(directory=str(_here / "templates"))
app.mount("/static", StaticFiles(directory=str(_here / "static")), name="static")


@app.get("/health")
async def health():
    """Health check — is the Nerd running, is Ollama reachable?"""
    ollama_health = await ollama.check_health()
    return {
        "status": "ok",
        "product": "iHomeNerd",
        "version": "0.1.0",
        "hostname": (await capabilities_response())["hostname"],
        "ollama": ollama_health["ok"],
        "binding": settings.host,
        "port": settings.port,
    }


@app.get("/capabilities")
async def capabilities():
    """Full capability registry with model info."""
    return await capabilities_response()


def main():
    """Entry point for `ihomenerd` CLI or `python -m app.main`."""
    import uvicorn

    host = "0.0.0.0" if settings.lan_mode else settings.host
    uvicorn.run(app, host=host, port=settings.port)


if __name__ == "__main__":
    main()
