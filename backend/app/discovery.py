"""Service discovery — mDNS advertisement and Brain discovery endpoint.

Advertises this iHomeNerd instance as _ihomenerd._tcp on the LAN
so Scout devices can find it without knowing the IP address.
Uses avahi-publish as a subprocess (available on most Linux systems).
Falls back gracefully if avahi is not available.
"""

from __future__ import annotations

import logging
import os
import socket
import subprocess
from pathlib import Path

from .config import settings

logger = logging.getLogger(__name__)

_avahi_process: subprocess.Popen | None = None


def _preferred_hostname() -> str:
    """Prefer installer-provided host identity over container hostname."""
    env_names = os.environ.get("IHN_CERT_HOSTNAMES", "")
    for name in env_names.split(","):
        name = name.strip()
        if name:
            return name
    return socket.gethostname()


def _get_local_ip() -> str | None:
    """Get the primary LAN IP address."""
    env_ip = os.environ.get("IHN_CERT_LAN_IP", "").strip()
    if env_ip:
        return env_ip
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 53))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return None


def _detect_coral() -> bool:
    """Best-effort Coral detection for role suggestions."""
    env_value = os.environ.get("IHN_ACCELERATOR", "").strip().lower()
    if env_value in {"coral", "tpu", "google-coral"}:
        return True
    return Path("/dev/apex_0").exists() or Path("/dev/apex_1").exists()


def _suggest_node_roles(*, gpu: dict | None, ram_bytes: int | None, capabilities: dict | None = None) -> dict:
    """Suggest practical node roles from hardware and capability hints."""
    caps = capabilities or {}
    has_gpu = gpu is not None
    has_coral = _detect_coral()
    ram_gb = int((ram_bytes or 0) / (1024 ** 3))

    roles: list[str] = []
    strengths: list[str] = []

    if not has_gpu:
        roles.extend(["gateway", "automation", "docs"])
        strengths.extend([
            "always-on routing and orchestration",
            "document ingestion and background tools",
        ])

    if has_gpu:
        roles.extend(["llm-worker", "vision-worker"])
        strengths.extend([
            "larger local reasoning models",
            "multimodal and image-heavy workloads",
        ])

    if has_coral:
        roles.extend(["edge-vision", "sensor-worker"])
        strengths.extend([
            "camera pipelines and low-latency detection loops",
        ])

    if caps.get("transcribe_audio", {}).get("available") or caps.get("synthesize_speech", {}).get("available"):
        roles.append("voice-worker")
        strengths.append("speech and audio tasks")

    if caps.get("investigate_network", {}).get("available"):
        roles.append("radar")

    if caps.get("query_documents", {}).get("available") and "docs" not in roles:
        roles.append("docs")

    if caps.get("chat", {}).get("available") and has_gpu and "llm-worker" not in roles:
        roles.append("llm-worker")

    if ram_gb >= 32 and "docs" in roles:
        strengths.append("memory-heavy indexing and retrieval")

    if not roles:
        roles = ["gateway", "tools"]
    if not strengths:
        strengths = ["general local AI services"]

    # Preserve order while deduping.
    dedup_roles = list(dict.fromkeys(roles))
    dedup_strengths = list(dict.fromkeys(strengths))

    return {
        "suggested_roles": dedup_roles,
        "strengths": dedup_strengths,
        "accelerators": [
            *([{"kind": "gpu", "name": gpu["name"], "vram_mb": gpu.get("vram_mb", 0)}] if gpu else []),
            *([{"kind": "coral", "name": "Google Coral TPU"}] if has_coral else []),
        ],
    }


def get_brain_info(capabilities: dict | None = None) -> dict:
    """Return this Brain's discovery info."""
    import platform

    hostname = _preferred_hostname()
    local_ip = _get_local_ip()

    # Try to get GPU info
    gpu = None
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode == 0 and result.stdout.strip():
            parts = result.stdout.strip().split(", ")
            gpu = {"name": parts[0], "vram_mb": int(parts[1]) if len(parts) > 1 else 0}
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    # Memory
    mem_total = None
    try:
        with open("/proc/meminfo") as f:
            for line in f:
                if line.startswith("MemTotal:"):
                    mem_total = int(line.split()[1]) * 1024  # KB → bytes
                    break
    except (FileNotFoundError, ValueError):
        pass

    info = {
        "product": "iHomeNerd",
        "version": "0.1.0",
        "role": "brain",
        "hostname": hostname,
        "ip": local_ip,
        "port": settings.port,
        "protocol": "https",
        "os": platform.system().lower(),
        "arch": platform.machine(),
        "gpu": gpu,
        "ram_bytes": mem_total,
    }
    info.update(_suggest_node_roles(gpu=gpu, ram_bytes=mem_total, capabilities=capabilities))
    return info


def advertise_start():
    """Start advertising this Brain via mDNS (avahi-publish)."""
    global _avahi_process

    if not settings.lan_mode:
        logger.info("Not in LAN mode — skipping mDNS advertisement")
        return

    hostname = _preferred_hostname()
    port = settings.port

    try:
        # avahi-publish-service: name, type, port, TXT records
        _avahi_process = subprocess.Popen(
            [
                "avahi-publish-service",
                f"iHomeNerd on {hostname}",
                "_ihomenerd._tcp",
                str(port),
                f"version=0.1.0",
                f"hostname={hostname}",
                f"role=brain",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        logger.info("mDNS: advertising _ihomenerd._tcp on port %d", port)
    except FileNotFoundError:
        logger.info("avahi-publish not found — mDNS advertisement disabled")
    except OSError as e:
        logger.warning("mDNS advertisement failed: %s", e)


def advertise_stop():
    """Stop mDNS advertisement."""
    global _avahi_process
    if _avahi_process:
        _avahi_process.terminate()
        _avahi_process = None
        logger.info("mDNS: stopped advertising")


def browse_peers() -> list[dict]:
    """Use avahi-browse to find other iHomeNerd instances on the LAN.

    Returns a list of discovered peers with hostname, ip, port.
    The extension can call this on any reachable brain to discover
    other brains — solving the chicken-and-egg where browser JS
    cannot do mDNS/DNS-SD directly.
    """
    try:
        result = subprocess.run(
            [
                "avahi-browse", "-tpr",  # terminate, parseable, resolve
                "_ihomenerd._tcp",
            ],
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode != 0:
            return []

        peers = []
        seen = set()
        for line in result.stdout.strip().splitlines():
            # Format: =;iface;protocol;name;type;domain;hostname;address;port;txt
            if not line.startswith("="):
                continue
            parts = line.split(";")
            if len(parts) < 9:
                continue
            hostname = parts[6].rstrip(".")  # remove trailing dot
            address = parts[7]
            port = int(parts[8])
            key = f"{address}:{port}"
            if key in seen:
                continue
            seen.add(key)
            peers.append({
                "hostname": hostname,
                "ip": address,
                "port": port,
            })
        return peers
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError) as e:
        logger.debug("avahi-browse failed: %s", e)
        return []
