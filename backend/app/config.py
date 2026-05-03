"""iHomeNerd configuration."""

import os
from pathlib import Path
from pydantic import BaseModel


def _bool_env(key: str, default: bool = False) -> bool:
    val = os.environ.get(key, "").lower()
    return val in ("1", "true", "yes") if val else default


class Settings(BaseModel):
    """Runtime settings, overridable via environment variables."""

    host: str = os.environ.get("IHN_HOST", "127.0.0.1")
    port: int = int(os.environ.get("IHN_PORT", "17777"))
    ollama_url: str = os.environ.get("IHN_OLLAMA_URL", "http://127.0.0.1:11434")
    llm_provider: str = os.environ.get("IHN_LLM_PROVIDER", "ollama")
    mlx_server_url: str = os.environ.get("IHN_MLX_SERVER_URL", "http://127.0.0.1:11435")
    mlx_model: str = os.environ.get("IHN_MLX_MODEL", "mlx-community/gemma-4-e2b-it-4bit")
    data_dir: Path = Path(os.environ.get("IHN_DATA_DIR", str(Path.home() / ".ihomenerd")))
    log_level: str = os.environ.get("IHN_LOG_LEVEL", "info")

    # LAN mode — disabled by default (localhost only)
    lan_mode: bool = _bool_env("IHN_LAN_MODE", False)


settings = Settings()
