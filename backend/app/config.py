"""iHomeNerd configuration."""

from pathlib import Path
from pydantic import BaseModel


class Settings(BaseModel):
    """Runtime settings, overridable via environment variables."""

    host: str = "127.0.0.1"
    port: int = 17777
    ollama_url: str = "http://127.0.0.1:11434"
    data_dir: Path = Path.home() / ".ihomenerd"
    log_level: str = "info"

    # LAN mode — disabled by default (localhost only)
    lan_mode: bool = False


settings = Settings()
