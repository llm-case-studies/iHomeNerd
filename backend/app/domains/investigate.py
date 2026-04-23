"""Investigate domain — network discovery and intelligent scanning.

Discovers local networks and devices using standard Linux tools (ip, arp,
avahi-browse), then runs LLM-analyzed scans on selected targets.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import socket
import subprocess
from pathlib import Path
import ipaddress

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

from .. import ollama

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/investigate", tags=["investigate"])


# ---------------------------------------------------------------------------
# Helpers — system probing
# ---------------------------------------------------------------------------

def _run(cmd: list[str], timeout: int = 10) -> str:
    """Run a shell command and return stdout. Returns empty string on failure."""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return result.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
        return ""


def _preferred_hostname() -> str:
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


def _configured_network() -> dict | None:
    subnet = os.environ.get("IHN_LAN_SUBNET", "").strip()
    if not subnet:
        return None
    try:
        subnet = str(ipaddress.ip_network(subnet, strict=False))
    except ValueError:
        pass
    iface = os.environ.get("IHN_LAN_IFACE", "").strip() or "lan0"
    return {
        "id": iface,
        "name": iface,
        "type": "primary",
        "subnet": subnet,
    }


def _decode_service_name(name: str) -> str:
    """Decode Avahi/Bonjour-style octal escapes like '\\032'."""
    if not name:
        return name

    def replace_octal(match: re.Match[str]) -> str:
        try:
            return chr(int(match.group(1), 8))
        except ValueError:
            return match.group(0)

    return re.sub(r"\\([0-7]{3})", replace_octal, name)


def _discover_networks() -> list[dict]:
    """Discover local networks from ip route."""
    networks = []
    configured = _configured_network()
    if configured:
        networks.append(configured)

    raw = _run(["ip", "-j", "route"])
    if not raw:
        # Fallback: parse text output
        raw_text = _run(["ip", "route"])
        for line in raw_text.splitlines():
            # e.g. "192.168.1.0/24 dev wlp0s20f3 proto kernel scope link src 192.168.1.100"
            m = re.match(r"(\d+\.\d+\.\d+\.\d+/\d+)\s+dev\s+(\S+)", line)
            if m and "default" not in line:
                subnet, iface = m.groups()
                net = {
                    "id": iface,
                    "name": iface,
                    "type": "primary" if len(networks) == 0 else "secondary",
                    "subnet": subnet,
                }
                if configured and net["subnet"] == configured["subnet"]:
                    continue
                networks.append(net)
        return networks

    try:
        routes = json.loads(raw)
        seen_subnets = set()
        for route in routes:
            dst = route.get("dst", "")
            dev = route.get("dev", "")
            if dst == "default" or not dst or dst in seen_subnets:
                continue
            # Only include subnet routes (with /)
            if "/" not in dst:
                dst = dst + "/32"
            seen_subnets.add(dst)
            net = {
                "id": dev,
                "name": dev,
                "type": "primary" if len(networks) == 0 else "secondary",
                "subnet": dst,
            }
            if configured and net["subnet"] == configured["subnet"]:
                continue
            networks.append(net)
    except (json.JSONDecodeError, KeyError):
        pass

    return networks


def _add_device(
    devices: list[dict],
    seen_ips: set[str],
    device_id: int,
    *,
    name: str,
    dev_type: str,
    dev_os: str,
    ip: str,
    network_id: str,
    warning: str | None = None,
) -> int:
    if not ip or ip in seen_ips:
        return device_id
    device = {
        "id": f"d{device_id}",
        "name": name,
        "type": dev_type,
        "os": dev_os,
        "ip": ip,
        "networkId": network_id,
        "status": "online",
    }
    if warning:
        device["warning"] = warning
    devices.append(device)
    seen_ips.add(ip)
    return device_id + 1


def _discover_devices(networks: list[dict]) -> tuple[list[dict], set[str], int]:
    """Discover devices from ARP table and mDNS."""
    devices = []
    seen_ips = set()
    device_id = 0

    # Add this machine first
    hostname = _preferred_hostname()
    local_ip = _get_local_ip()
    if local_ip:
        net_id = _match_network(local_ip, networks)
        device_id = _add_device(
            devices,
            seen_ips,
            device_id,
            name=f"{hostname} (this machine)",
            dev_type="server",
            dev_os="linux",
            ip=local_ip,
            network_id=net_id,
        )

    # ARP table
    raw = _run(["ip", "-j", "neighbor"])
    if raw:
        try:
            neighbors = json.loads(raw)
            for n in neighbors:
                ip = n.get("dst", "")
                state = n.get("state", [])
                if not ip or ip in seen_ips:
                    continue
                # Skip incomplete/failed entries
                if isinstance(state, list) and "FAILED" in state:
                    continue
                if isinstance(state, str) and state == "FAILED":
                    continue
                mac = n.get("lladdr", "")
                net_id = _match_network(ip, networks)
                dev_type, dev_os = _guess_device_type(mac, ip)
                name = _resolve_hostname(ip) or f"Device ({ip})"
                device_id = _add_device(
                    devices,
                    seen_ips,
                    device_id,
                    name=name,
                    dev_type=dev_type,
                    dev_os=dev_os,
                    ip=ip,
                    network_id=net_id,
                )
        except (json.JSONDecodeError, KeyError):
            pass

    # mDNS enrichment (avahi-browse)
    mdns_raw = _run(["avahi-browse", "-all", "-t", "-r", "-p"], timeout=5)
    if mdns_raw:
        for line in mdns_raw.splitlines():
            parts = line.split(";")
            if len(parts) >= 8 and parts[0] == "=":
                # = ; interface ; protocol ; name ; type ; domain ; hostname ; address ; port
                mdns_name = parts[3]
                mdns_ip = parts[7]
                # Enrich existing device if IP matches
                for dev in devices:
                    if dev["ip"] == mdns_ip and "this machine" not in dev["name"]:
                        if mdns_name and mdns_name != dev["ip"]:
                            dev["name"] = _decode_service_name(mdns_name)
                        break

    return devices, seen_ips, device_id


def _match_network(ip: str, networks: list[dict]) -> str:
    """Find which network an IP belongs to."""
    import ipaddress
    try:
        addr = ipaddress.ip_address(ip)
        for net in networks:
            try:
                if addr in ipaddress.ip_network(net["subnet"], strict=False):
                    return net["id"]
            except ValueError:
                continue
    except ValueError:
        pass
    return networks[0]["id"] if networks else "unknown"


def _resolve_hostname(ip: str) -> str | None:
    """Attempt reverse DNS lookup."""
    try:
        name, _, _ = socket.gethostbyaddr(ip)
        return _decode_service_name(name)
    except (socket.herror, socket.gaierror, OSError):
        avahi_name = _run(["avahi-resolve-address", ip], timeout=2)
        if avahi_name:
            parts = avahi_name.split()
            if len(parts) >= 2:
                return _decode_service_name(parts[-1])
        return None


def _guess_device_type(mac: str, ip: str) -> tuple[str, str]:
    """Guess device type from MAC OUI prefix."""
    if not mac:
        return ("unknown", "unknown")
    mac_upper = mac.upper().replace(":", "").replace("-", "")[:6]

    # Common OUI prefixes
    APPLE_OUIS = {"3C22FB", "A4B197", "F0B479", "ACDE48", "A860B6", "DC2B2A", "F4F15A"}
    SAMSUNG_OUIS = {"E4E749", "C45006", "BCB1F3", "849866", "9852B1"}
    ESPRESSIF_OUIS = {"240AC4", "3C71BF", "A4CF12", "CC50E3"}  # ESP32/ESP8266 IoT

    if mac_upper in APPLE_OUIS:
        return ("computer", "macOS")
    if mac_upper in SAMSUNG_OUIS:
        return ("phone", "android")
    if mac_upper in ESPRESSIF_OUIS:
        return ("iot", "rtos")

    return ("computer", "unknown")


async def _probe_ihomenerd(ip: str) -> dict | None:
    """Check whether a host is running iHomeNerd."""
    for url, verify in (
        (f"http://{ip}:17778/discover", True),
        (f"https://{ip}:17777/discover", False),
    ):
        try:
            async with httpx.AsyncClient(timeout=0.35, verify=verify) as client:
                r = await client.get(url, headers={"Accept": "application/json"})
            if not r.is_success:
                continue
            data = r.json()
            if data.get("product") != "iHomeNerd":
                continue
            return data
        except Exception:
            continue
    return None


async def _ping_host(ip: str) -> bool:
    """Best-effort host liveness probe for Linux containers."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "ping", "-c", "1", "-W", "1", ip,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        return await proc.wait() == 0
    except (FileNotFoundError, OSError):
        return False


async def _discover_subnet_hosts(networks: list[dict], seen_ips: set[str]) -> list[dict]:
    """Active subnet discovery for Docker deployments where ARP is blind."""
    hosts: list[dict] = []
    subnets = []
    for net in networks:
        try:
            subnet = ipaddress.ip_network(net["subnet"], strict=False)
        except ValueError:
            continue
        # Keep this bounded to realistic home-lab ranges.
        if subnet.version != 4 or subnet.num_addresses > 256:
            continue
        subnets.append((net["id"], subnet))

    if not subnets:
        return hosts

    sem = asyncio.Semaphore(64)

    async def inspect_ip(network_id: str, ip: str) -> dict | None:
        async with sem:
            info = await _probe_ihomenerd(ip)
            if info:
                return {
                    "name": info.get("hostname") or f"iHomeNerd ({ip})",
                    "type": "server",
                    "os": info.get("os", "linux"),
                    "ip": ip,
                    "networkId": network_id,
                    "status": "online",
                }
            if await _ping_host(ip):
                return {
                    "name": _resolve_hostname(ip) or f"Device ({ip})",
                    "type": "computer",
                    "os": "unknown",
                    "ip": ip,
                    "networkId": network_id,
                    "status": "online",
                }
            return None

    tasks = []
    for network_id, subnet in subnets:
        for addr in subnet.hosts():
            ip = str(addr)
            if ip in seen_ips:
                continue
            tasks.append(inspect_ip(network_id, ip))

    for result in await asyncio.gather(*tasks):
        if result:
            hosts.append(result)
            seen_ips.add(result["ip"])

    return hosts


def _merge_discovered_device(devices: list[dict], discovered: dict, next_id: int) -> int:
    """Update an existing row or append a newly found device."""
    for device in devices:
        if device["ip"] != discovered["ip"]:
            continue
        if discovered.get("type") == "server":
            device["name"] = discovered["name"]
            device["type"] = discovered["type"]
            device["os"] = discovered["os"]
            device["status"] = discovered["status"]
            device["networkId"] = discovered["networkId"]
        return next_id

    discovered["id"] = f"d{next_id}"
    devices.append(discovered)
    return next_id + 1


# ---------------------------------------------------------------------------
# Scan implementations
# ---------------------------------------------------------------------------

async def _scan_device_health(target: str) -> dict:
    """Basic device health: ping, port check."""
    logs = [f"[INFO] Pinging {target}..."]
    findings = []

    # Ping
    ping_out = _run(["ping", "-c", "3", "-W", "2", target])
    if "0 received" in ping_out or not ping_out:
        logs.append(f"[WARN] {target} is not responding to ping")
        findings.append({
            "id": "h1", "severity": "high",
            "title": "Host Unreachable",
            "details": f"{target} did not respond to ICMP ping. It may be offline, blocking pings, or on a different subnet.",
        })
    else:
        # Extract latency
        m = re.search(r"rtt min/avg/max.*= ([\d.]+)/([\d.]+)/([\d.]+)", ping_out)
        if m:
            avg_ms = float(m.group(2))
            logs.append(f"[INFO] Ping OK — avg latency: {avg_ms:.1f}ms")
            if avg_ms > 100:
                findings.append({
                    "id": "h2", "severity": "medium",
                    "title": "High Latency",
                    "details": f"Average round-trip time is {avg_ms:.1f}ms. This may indicate network congestion or a weak wireless signal.",
                })
        else:
            logs.append("[INFO] Ping OK")

    # Check common ports
    for port, service in [(22, "SSH"), (80, "HTTP"), (443, "HTTPS"), (8080, "HTTP-Alt")]:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(1)
            result = s.connect_ex((target, port))
            s.close()
            if result == 0:
                logs.append(f"[INFO] Port {port} ({service}) — open")
        except OSError:
            pass

    logs.append("[INFO] Health check complete.")
    return {"logs": logs, "findings": findings}


async def _scan_hardware_compat(target: str) -> dict:
    """Check local hardware for AI model compatibility."""
    logs = [f"[INFO] Probing hardware on this machine..."]
    info_parts = []

    # CPU
    cpu_info = _run(["lscpu"])
    if cpu_info:
        logs.append("[INFO] CPU info collected")
        info_parts.append(f"CPU:\n{cpu_info[:500]}")

    # Memory
    mem_info = _run(["free", "-h"])
    if mem_info:
        logs.append("[INFO] Memory info collected")
        info_parts.append(f"Memory:\n{mem_info}")

    # GPU
    gpu_info = _run(["nvidia-smi", "--query-gpu=name,memory.total,memory.free,driver_version", "--format=csv,noheader"])
    if gpu_info:
        logs.append(f"[INFO] GPU detected: {gpu_info.splitlines()[0].strip()}")
        info_parts.append(f"GPU:\n{gpu_info}")
    else:
        logs.append("[INFO] No NVIDIA GPU detected")
        info_parts.append("GPU: None detected (no nvidia-smi)")

    # Disk
    disk_info = _run(["df", "-h", "/"])
    if disk_info:
        info_parts.append(f"Disk:\n{disk_info}")

    logs.append("[INFO] Analyzing compatibility with AI models...")

    # LLM analysis
    system_text = "\n\n".join(info_parts)
    prompt = (
        "You are a hardware analyst. Based on the system information below, assess compatibility "
        "with running local AI models (LLMs, TTS, ASR). Respond with a JSON array of findings, "
        "each with: id (string), severity (high/medium/low), title (string), details (string).\n"
        "Focus on: GPU VRAM for model loading, RAM for context, CPU cores for inference.\n"
        "Return ONLY the JSON array, no markdown.\n\n"
        f"System info:\n{system_text}"
    )

    findings = await _llm_analyze(prompt, logs)
    logs.append("[INFO] Hardware compatibility check complete.")
    return {"logs": logs, "findings": findings}


async def _scan_network_audit(target: str) -> dict:
    """Audit network placement and security posture of a device."""
    logs = [f"[INFO] Auditing network placement for {target}..."]

    # Gather ARP + route info
    arp_info = _run(["ip", "neighbor"])
    route_info = _run(["ip", "route"])

    logs.append("[INFO] Network topology collected")
    logs.append("[INFO] Analyzing security posture...")

    prompt = (
        "You are a home network security analyst. Based on the network data below, "
        "assess the security posture of the target device. Look for: IoT devices on primary networks, "
        "potential segmentation issues, unusual ARP entries.\n"
        "Respond with a JSON array of findings, each with: id (string), severity (high/medium/low), "
        "title (string), details (string).\n"
        "Return ONLY the JSON array, no markdown.\n\n"
        f"Target: {target}\n\nARP Table:\n{arp_info[:1000]}\n\nRoutes:\n{route_info[:500]}"
    )

    findings = await _llm_analyze(prompt, logs)
    logs.append("[INFO] Network audit complete.")
    return {"logs": logs, "findings": findings}


async def _scan_file_analysis(target: str) -> dict:
    """Analyze files in a directory for duplicates and large files."""
    logs = [f"[INFO] Analyzing directory: {target}..."]
    findings = []

    target_path = Path(target).expanduser()
    if not target_path.exists():
        logs.append(f"[WARN] Path does not exist: {target}")
        return {"logs": logs, "findings": findings}

    # Count files and total size
    total_files = 0
    total_bytes = 0
    large_files = []
    size_by_ext: dict[str, int] = {}

    for f in target_path.rglob("*"):
        if not f.is_file():
            continue
        total_files += 1
        try:
            size = f.stat().st_size
        except OSError:
            continue
        total_bytes += size
        ext = f.suffix.lower() or "(no ext)"
        size_by_ext[ext] = size_by_ext.get(ext, 0) + size
        if size > 100 * 1024 * 1024:  # > 100MB
            large_files.append((str(f.name), size))

    logs.append(f"[INFO] Found {total_files} files, {total_bytes / (1024**3):.1f} GB total")

    if large_files:
        large_files.sort(key=lambda x: x[1], reverse=True)
        for name, size in large_files[:5]:
            logs.append(f"[WARN] Large file: {name} ({size / (1024**2):.0f} MB)")
        findings.append({
            "id": "f1", "severity": "medium",
            "title": f"{len(large_files)} Large Files Found",
            "details": f"Found {len(large_files)} files over 100MB. Largest: {large_files[0][0]} ({large_files[0][1] / (1024**3):.1f} GB). Consider archiving to external storage.",
        })

    # Top extensions by size
    top_ext = sorted(size_by_ext.items(), key=lambda x: x[1], reverse=True)[:5]
    ext_summary = ", ".join(f"{ext}: {sz/(1024**2):.0f}MB" for ext, sz in top_ext)
    logs.append(f"[INFO] Top types: {ext_summary}")

    if not findings:
        findings.append({
            "id": "f0", "severity": "low",
            "title": "Directory Looks Clean",
            "details": f"{total_files} files totaling {total_bytes / (1024**3):.1f} GB. No unusually large files detected.",
        })

    logs.append("[INFO] File analysis complete.")
    return {"logs": logs, "findings": findings}


async def _llm_analyze(prompt: str, logs: list[str]) -> list[dict]:
    """Ask the LLM to produce structured findings."""
    try:
        raw = await ollama.generate(prompt, tier="medium")
        # Try to parse JSON from the response
        # Strip markdown code fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```\w*\n?", "", cleaned)
            cleaned = re.sub(r"\n?```$", "", cleaned)
        findings = json.loads(cleaned)
        if isinstance(findings, list):
            return findings
    except (json.JSONDecodeError, Exception) as e:
        logger.warning("LLM analysis failed to produce valid JSON: %s", e)
        logs.append("[WARN] AI analysis produced non-standard output")

    return []


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/environment")
async def get_environment():
    """Auto-discover local networks and devices."""
    networks = _discover_networks()
    devices, seen_ips, next_id = _discover_devices(networks)
    for discovered in await _discover_subnet_hosts(networks, set(seen_ips)):
        next_id = _merge_discovered_device(devices, discovered, next_id)
    return {"networks": networks, "devices": devices}


class ScanRequest(BaseModel):
    target: str
    type: str


@router.post("/scan")
async def run_scan(req: ScanRequest):
    """Run an investigation scan on a target."""
    scan_fn = {
        "device_health": _scan_device_health,
        "hardware_compat": _scan_hardware_compat,
        "network_audit": _scan_network_audit,
        "file_analysis": _scan_file_analysis,
    }.get(req.type)

    if not scan_fn:
        raise HTTPException(status_code=400, detail=f"Unknown scan type: {req.type}")

    result = await scan_fn(req.target)
    return {
        "status": "complete",
        "logs": result.get("logs", []),
        "findings": result.get("findings", []),
    }
