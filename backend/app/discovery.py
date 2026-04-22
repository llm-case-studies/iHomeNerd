"""Service discovery — mDNS advertisement and Brain discovery endpoint.

Advertises this iHomeNerd instance as _ihomenerd._tcp on the LAN
so Scout devices can find it without knowing the IP address.
Uses avahi-publish as a subprocess (available on most Linux systems).
Falls back gracefully if avahi is not available.
"""

from __future__ import annotations

import logging
import socket
import subprocess
from pathlib import Path

from .config import settings

logger = logging.getLogger(__name__)

_avahi_process: subprocess.Popen | None = None


def _get_local_ip() -> str | None:
    """Get the primary LAN IP address."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 53))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return None


def get_brain_info() -> dict:
    """Return this Brain's discovery info."""
    import platform

    hostname = socket.gethostname()
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

    return {
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


def advertise_start():
    """Start advertising this Brain via mDNS (avahi-publish)."""
    global _avahi_process

    if not settings.lan_mode:
        logger.info("Not in LAN mode — skipping mDNS advertisement")
        return

    hostname = socket.gethostname()
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
