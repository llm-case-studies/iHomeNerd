"""Control plane domain — managed nodes, SSH preflight, promotion, and lifecycle actions."""

from __future__ import annotations

import os
import shlex
import subprocess
from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .. import nodes
from ..config import settings

router = APIRouter(prefix="/v1/control", tags=["control-plane"])


class PreflightRequest(BaseModel):
    host: str
    sshUser: str = Field(..., min_length=1)
    sshPort: int = 22


class PromoteRequest(PreflightRequest):
    installNow: bool = True
    installPath: str = "~/.ihomenerd"
    runtimeKind: str | None = None
    nodeName: str | None = None


class NodeActionRequest(BaseModel):
    action: Literal["start", "stop", "restart", "status"]


def _ssh_base(user: str, host: str, port: int) -> list[str]:
    return [
        "ssh",
        "-o",
        "BatchMode=yes",
        "-o",
        "ConnectTimeout=5",
        "-o",
        "StrictHostKeyChecking=accept-new",
        "-p",
        str(port),
        f"{user}@{host}",
    ]


def _run_ssh(user: str, host: str, port: int, script: str, timeout: int = 20) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            [*_ssh_base(user, host, port), f"sh -lc {shlex.quote(script)}"],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail="ssh client is not installed on this gateway") from exc


def _run_scp(local_path: Path, user: str, host: str, port: int, remote_path: str) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            [
                "scp",
                "-P",
                str(port),
                "-o",
                "BatchMode=yes",
                "-o",
                "ConnectTimeout=5",
                "-o",
                "StrictHostKeyChecking=accept-new",
                str(local_path),
                f"{user}@{host}:{remote_path}",
            ],
            capture_output=True,
            text=True,
            timeout=20,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail="scp client is not installed on this gateway") from exc


def _kv_parse(raw: str) -> dict[str, str]:
    result: dict[str, str] = {}
    for line in raw.splitlines():
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        result[key.strip()] = value.strip()
    return result


def _remote_path_bootstrap(var_name: str, raw_path: str) -> str:
    quoted = shlex.quote(raw_path)
    return (
        f'{var_name}={quoted}\n'
        f'case "${var_name}" in\n'
        f'  "~") {var_name}="$HOME" ;;\n'
        f'  "~/"*) {var_name}="$HOME/${{{var_name}#~/}}" ;;\n'
        f'esac\n'
    )


def _preflight_script() -> str:
    return r'''
OS="$(uname -s 2>/dev/null | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m 2>/dev/null || true)"
HOSTNAME="$(hostname -s 2>/dev/null || hostname || true)"
DISTRO="$OS"
IP=""
RAM_BYTES=""
DISK_BYTES="$(df -Pk "$HOME" 2>/dev/null | awk 'NR==2 {print $4 * 1024}')"
DOCKER_VERSION=""
DOCKER_READY="false"
CURL_READY="false"
SUDO_NOPASS="false"
GPU_NAME=""
GPU_VRAM_MB=""
RUNTIME_KIND=""
IHN_RUNNING="false"

if [ "$OS" = "linux" ]; then
  [ -r /etc/os-release ] && . /etc/os-release && DISTRO="${ID:-linux}"
  IP="$(ip route get 1.1.1.1 2>/dev/null | awk '{for (i=1; i<=NF; i++) if ($i == "src") { print $(i+1); exit }}')"
  [ -z "$IP" ] && IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
  RAM_BYTES="$(awk '/MemTotal:/ {print $2 * 1024}' /proc/meminfo 2>/dev/null)"
elif [ "$OS" = "darwin" ]; then
  DISTRO="macos"
  IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
  RAM_BYTES="$(sysctl -n hw.memsize 2>/dev/null || true)"
fi

if command -v curl >/dev/null 2>&1; then
  CURL_READY="true"
fi
if command -v docker >/dev/null 2>&1; then
  DOCKER_VERSION="$(docker --version 2>/dev/null | sed 's/Docker version //; s/,.*//')"
  if docker info >/dev/null 2>&1; then
    DOCKER_READY="true"
  fi
fi
if sudo -n true >/dev/null 2>&1; then
  SUDO_NOPASS="true"
fi
if command -v nvidia-smi >/dev/null 2>&1; then
  GPU_LINE="$(nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits 2>/dev/null | head -1)"
  GPU_NAME="$(printf '%s' "$GPU_LINE" | cut -d',' -f1 | xargs)"
  GPU_VRAM_MB="$(printf '%s' "$GPU_LINE" | cut -d',' -f2 | xargs)"
fi

if [ -d "$HOME/.ihomenerd" ] && [ -f "$HOME/.ihomenerd/docker-compose.yml" ]; then
  RUNTIME_KIND="docker_compose"
fi
if [ "$OS" = "darwin" ] && launchctl list 2>/dev/null | grep -q "com\.ihomenerd"; then
  RUNTIME_KIND="launchd"
fi
if curl -sk --max-time 2 https://127.0.0.1:17777/discover 2>/dev/null | grep -q '"product":"iHomeNerd"'; then
  IHN_RUNNING="true"
fi

printf 'OS=%s\n' "$OS"
printf 'ARCH=%s\n' "$ARCH"
printf 'HOSTNAME=%s\n' "$HOSTNAME"
printf 'IP=%s\n' "$IP"
printf 'DISTRO=%s\n' "$DISTRO"
printf 'RAM_BYTES=%s\n' "$RAM_BYTES"
printf 'DISK_BYTES=%s\n' "$DISK_BYTES"
printf 'DOCKER_VERSION=%s\n' "$DOCKER_VERSION"
printf 'DOCKER_READY=%s\n' "$DOCKER_READY"
printf 'CURL_READY=%s\n' "$CURL_READY"
printf 'SUDO_NOPASS=%s\n' "$SUDO_NOPASS"
printf 'GPU_NAME=%s\n' "$GPU_NAME"
printf 'GPU_VRAM_MB=%s\n' "$GPU_VRAM_MB"
printf 'RUNTIME_KIND=%s\n' "$RUNTIME_KIND"
printf 'IHN_RUNNING=%s\n' "$IHN_RUNNING"
'''


def _runtime_guess(os_name: str, docker_ready: bool, runtime_kind: str) -> str:
    if runtime_kind:
        return runtime_kind
    if docker_ready:
        return "docker_compose"
    if os_name == "darwin":
        return "launchd"
    return "host_process"


def _recommended_roles(gpu_name: str, ram_bytes: int) -> list[str]:
    if gpu_name:
        return ["llm-worker", "vision-worker"]
    if ram_bytes >= 16 * 1024**3:
        return ["gateway", "automation", "docs"]
    return ["light-specialist", "automation"]


def _recommended_models(gpu_vram_mb: int, ram_bytes: int) -> list[str]:
    if gpu_vram_mb >= 8000:
        return ["gemma4:e4b", "gemma3:12b", "llama3:8b"]
    if gpu_vram_mb >= 4000:
        return ["gemma4:e2b", "gemma3:4b", "llama3.2:3b"]
    if ram_bytes >= 16 * 1024**3:
        return ["gemma3:1b", "llama3.2:3b"]
    return ["gemma3:1b", "llama3.2:1b"]


def _recommended_strengths(gpu_name: str, ram_bytes: int) -> list[str]:
    if gpu_name:
        return ["larger local reasoning models", "multimodal and image-heavy workloads"]
    if ram_bytes >= 16 * 1024**3:
        return ["always-on routing and orchestration", "document ingestion and background tools"]
    return ["lightweight automation", "speech, OCR, and utility workloads"]


def _local_ca_paths() -> tuple[Path, Path]:
    candidates = [
        (os.environ.get("IHN_CA_CERT_PATH", ""), os.environ.get("IHN_CA_KEY_PATH", "")),
        ("/authority/ca.crt", "/authority/ca.key"),
        (str(settings.data_dir / "home-ca" / "ca.crt"), str(settings.data_dir / "home-ca" / "ca.key")),
        (str(settings.data_dir / "certs" / "ca.crt"), str(settings.data_dir / "certs" / "ca.key")),
    ]
    for cert_raw, key_raw in candidates:
        cert = Path(cert_raw)
        key = Path(key_raw)
        if cert.exists() and key.exists():
            return cert, key
    raise HTTPException(status_code=500, detail="Home CA material is not available on this gateway")


def _run_preflight(req: PreflightRequest) -> dict[str, Any]:
    try:
        result = _run_ssh(req.sshUser, req.host, req.sshPort, _preflight_script(), timeout=20)
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(status_code=504, detail=f"SSH preflight timed out for {req.host}") from exc
    if result.returncode != 0:
        raise HTTPException(
            status_code=400,
            detail={
                "message": f"SSH preflight failed for {req.host}",
                "stderr": result.stderr.strip(),
            },
        )

    kv = _kv_parse(result.stdout)
    os_name = kv.get("OS", "")
    ram_bytes = int(kv.get("RAM_BYTES") or 0)
    gpu_name = kv.get("GPU_NAME", "")
    gpu_vram_mb = int(kv.get("GPU_VRAM_MB") or 0)
    docker_ready = kv.get("DOCKER_READY") == "true"
    curl_ready = kv.get("CURL_READY") == "true"
    sudo_nopass = kv.get("SUDO_NOPASS") == "true"
    runtime_kind = _runtime_guess(os_name, docker_ready, kv.get("RUNTIME_KIND", ""))

    blockers: list[str] = []
    promote_supported = False

    if os_name == "linux":
        if not curl_ready:
            blockers.append("curl is not available on the target")
        if not docker_ready and not sudo_nopass:
            blockers.append("Docker is not ready and passwordless sudo is not available")
        if not blockers:
            promote_supported = True
    elif os_name == "darwin":
        blockers.append("automatic install is not enabled for macOS yet; add a macOS runtime adapter first")
    else:
        blockers.append(f"unsupported target platform: {os_name or 'unknown'}")

    manage_supported = runtime_kind in {"docker_compose", "systemd", "launchd", "host_process"}

    return {
        "host": req.host,
        "sshUser": req.sshUser,
        "sshPort": req.sshPort,
        "hostname": kv.get("HOSTNAME", req.host),
        "ip": kv.get("IP", req.host),
        "os": os_name,
        "distro": kv.get("DISTRO", os_name),
        "arch": kv.get("ARCH", ""),
        "ramBytes": ram_bytes,
        "diskBytes": int(kv.get("DISK_BYTES") or 0),
        "docker": {
            "installed": bool(kv.get("DOCKER_VERSION")),
            "ready": docker_ready,
            "version": kv.get("DOCKER_VERSION", ""),
        },
        "sudoNoPass": sudo_nopass,
        "curlReady": curl_ready,
        "gpu": {"name": gpu_name, "vramMb": gpu_vram_mb} if gpu_name else None,
        "runtimeKind": runtime_kind,
        "ihnRunning": kv.get("IHN_RUNNING") == "true",
        "recommendedRoles": _recommended_roles(gpu_name, ram_bytes),
        "recommendedStrengths": _recommended_strengths(gpu_name, ram_bytes),
        "recommendedModels": _recommended_models(gpu_vram_mb, ram_bytes),
        "support": {
            "promote": promote_supported,
            "manage": manage_supported,
        },
        "blockers": blockers,
    }


def _node_to_payload(node: nodes.ManagedNode) -> dict[str, Any]:
    return {
        "id": node.id,
        "hostname": node.hostname,
        "ip": node.ip,
        "controlHost": node.control_host,
        "sshUser": node.ssh_user,
        "sshPort": node.ssh_port,
        "platform": node.platform,
        "arch": node.arch,
        "runtimeKind": node.runtime_kind,
        "installPath": node.install_path,
        "serviceName": node.service_name,
        "state": node.state,
        "managed": node.managed,
        "installSupported": node.install_supported,
        "lastSeen": node.last_seen,
        "createdAt": node.created_at,
        "updatedAt": node.updated_at,
        "metadata": node.metadata or {},
    }


def _service_command(node: nodes.ManagedNode, action: str) -> str:
    install_path = node.install_path or "~/.ihomenerd"
    if node.runtime_kind == "docker_compose":
        path_bootstrap = _remote_path_bootstrap("INSTALL_PATH", install_path)
        return {
            "start": path_bootstrap + 'cd "$INSTALL_PATH" && docker compose up -d',
            "stop": path_bootstrap + 'cd "$INSTALL_PATH" && docker compose stop',
            "restart": path_bootstrap + 'cd "$INSTALL_PATH" && docker compose restart',
            "status": path_bootstrap + 'cd "$INSTALL_PATH" && docker compose ps',
        }[action]
    if node.runtime_kind == "systemd":
        service = shlex.quote(node.service_name or "ihomenerd")
        return {
            "start": f"systemctl --user start {service}",
            "stop": f"systemctl --user stop {service}",
            "restart": f"systemctl --user restart {service}",
            "status": f"systemctl --user status {service} --no-pager",
        }[action]
    if node.runtime_kind == "launchd":
        service = shlex.quote(node.service_name or "com.ihomenerd.brain")
        return {
            "start": f"launchctl kickstart -k gui/$(id -u)/{service}",
            "stop": f"launchctl bootout gui/$(id -u) {service}",
            "restart": f"launchctl bootout gui/$(id -u) {service} >/dev/null 2>&1 || true; launchctl kickstart -k gui/$(id -u)/{service}",
            "status": f"launchctl print gui/$(id -u)/{service}",
        }[action]
    if node.runtime_kind == "host_process":
        path_bootstrap = _remote_path_bootstrap("INSTALL_PATH", node.install_path or "~/Projects/iHomeNerd")
        return {
            "start": path_bootstrap + 'cd "$INSTALL_PATH/backend" && nohup env IHN_LAN_MODE=1 .venv/bin/python -m app.main >/tmp/ihomenerd.log 2>&1 & disown',
            "stop": "pkill -f 'python -m app.main' || true",
            "restart": path_bootstrap + 'pkill -f \'python -m app.main\' || true; cd "$INSTALL_PATH/backend" && nohup env IHN_LAN_MODE=1 .venv/bin/python -m app.main >/tmp/ihomenerd.log 2>&1 & disown',
            "status": "((command -v ss >/dev/null 2>&1 && ss -ltn '( sport = :17777 or sport = :17778 )') || (command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:17777 -sTCP:LISTEN)) || true",
        }[action]
    raise HTTPException(status_code=400, detail=f"Unsupported runtime kind: {node.runtime_kind}")


def _check_updates(node: nodes.ManagedNode) -> dict[str, Any]:
    script = (
        _remote_path_bootstrap("INSTALL_PATH", node.install_path or "~/.ihomenerd")
        + r'''
OS="$(uname -s 2>/dev/null | tr '[:upper:]' '[:lower:]')"
printf 'OS=%s\n' "$OS"
if [ "$OS" = "linux" ]; then
  if command -v apt >/dev/null 2>&1; then
    printf 'OS_PM=apt\n'
    sudo -n apt-get update -qq >/dev/null 2>&1 || true
    printf 'OS_UPDATES_BEGIN\n'
    apt list --upgradable 2>/dev/null | sed -n '2,12p'
    printf 'OS_UPDATES_END\n'
  elif command -v dnf >/dev/null 2>&1; then
    printf 'OS_PM=dnf\n'
    printf 'OS_UPDATES_BEGIN\n'
    dnf check-update -q 2>/dev/null | sed -n '1,12p' || true
    printf 'OS_UPDATES_END\n'
  fi
elif [ "$OS" = "darwin" ]; then
  printf 'OS_PM=softwareupdate\n'
  printf 'OS_UPDATES_BEGIN\n'
  softwareupdate -l 2>&1 | sed -n '1,12p' || true
  printf 'OS_UPDATES_END\n'
fi

if [ -n "$INSTALL_PATH" ] && [ -d "$INSTALL_PATH/.git" ]; then
  printf 'IHN_GIT=true\n'
  printf 'IHN_HEAD=%s\n' "$(cd "$INSTALL_PATH" && git rev-parse --short HEAD 2>/dev/null || true)"
else
  printf 'IHN_GIT=false\n'
fi
'''
    )
    try:
        result = _run_ssh(node.ssh_user, node.control_host or node.ip, node.ssh_port, script, timeout=25)
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(status_code=504, detail=f"Update check timed out for {node.hostname}") from exc
    if result.returncode != 0:
        raise HTTPException(status_code=400, detail=result.stderr.strip() or "Update check failed")

    lines = result.stdout.splitlines()
    kv = _kv_parse("\n".join(line for line in lines if "=" in line))
    os_updates: list[str] = []
    capture = False
    for line in lines:
        if line == "OS_UPDATES_BEGIN":
            capture = True
            continue
        if line == "OS_UPDATES_END":
            capture = False
            continue
        if capture and line.strip():
            os_updates.append(line.strip())

    return {
        "nodeId": node.id,
        "hostname": node.hostname,
        "os": {
            "platform": kv.get("OS", node.platform),
            "packageManager": kv.get("OS_PM", ""),
            "updates": os_updates,
        },
        "ihn": {
            "gitManaged": kv.get("IHN_GIT") == "true",
            "head": kv.get("IHN_HEAD", ""),
            "version": "0.1.0",
        },
    }


@router.get("/nodes")
async def list_managed_nodes():
    return {"nodes": [_node_to_payload(node) for node in nodes.list_nodes()]}


@router.post("/preflight")
async def preflight(req: PreflightRequest):
    return _run_preflight(req)


@router.post("/promote")
async def promote(req: PromoteRequest):
    preflight = _run_preflight(req)
    requested_runtime = req.runtimeKind or preflight["runtimeKind"]

    node_record = nodes.upsert_node(
        {
            "hostname": req.nodeName or preflight["hostname"],
            "ip": preflight["ip"],
            "control_host": req.host,
            "ssh_user": req.sshUser,
            "ssh_port": req.sshPort,
            "platform": preflight["os"],
            "arch": preflight["arch"],
            "runtime_kind": requested_runtime,
            "install_path": req.installPath,
            "service_name": "com.ihomenerd.brain" if requested_runtime == "launchd" else "ihomenerd",
            "state": "candidate" if not req.installNow else "installing",
            "managed": False,
            "install_supported": preflight["support"]["promote"],
            "metadata": {
                "recommendedRoles": preflight["recommendedRoles"],
                "recommendedStrengths": preflight["recommendedStrengths"],
                "recommendedModels": preflight["recommendedModels"],
                "blockers": preflight["blockers"],
            },
        }
    )

    if not req.installNow:
        return {
            "status": "registered",
            "node": _node_to_payload(node_record),
            "preflight": preflight,
        }

    if not preflight["support"]["promote"]:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Automatic promotion is not supported for this target yet",
                "blockers": preflight["blockers"],
                "preflight": preflight,
            },
        )

    ca_cert, ca_key = _local_ca_paths()
    remote_ca_dir = (req.installPath.rstrip("/") if req.installPath else "~/.ihomenerd") + "/home-ca"
    prep = _run_ssh(
        req.sshUser,
        req.host,
        req.sshPort,
        _remote_path_bootstrap("REMOTE_CA_DIR", remote_ca_dir) + 'mkdir -p "$REMOTE_CA_DIR"',
        timeout=10,
    )
    if prep.returncode != 0:
        raise HTTPException(status_code=400, detail=prep.stderr.strip() or "Failed to prepare remote CA directory")

    for local_path, remote_name in ((ca_cert, "ca.crt"), (ca_key, "ca.key")):
        copy = _run_scp(local_path, req.sshUser, req.host, req.sshPort, f"{remote_ca_dir}/{remote_name}")
        if copy.returncode != 0:
            raise HTTPException(status_code=400, detail=copy.stderr.strip() or f"Failed to copy {remote_name}")

    install_script = (
        _remote_path_bootstrap("REMOTE_CA_DIR", remote_ca_dir)
        + f"""
set -e
curl -fsSL https://raw.githubusercontent.com/llm-case-studies/iHomeNerd/main/get-ihomenerd.sh -o /tmp/get-ihomenerd.sh
chmod +x /tmp/get-ihomenerd.sh
IHN_AUTO_YES=1 IHN_SKIP_OPEN=1 IHN_INSTALL_DIR={shlex.quote(req.installPath)} IHN_HOME_CA_SOURCE_DIR="$REMOTE_CA_DIR" IHN_REPO_REF=main bash /tmp/get-ihomenerd.sh
"""
    )
    try:
        result = _run_ssh(req.sshUser, req.host, req.sshPort, install_script, timeout=1800)
    except subprocess.TimeoutExpired as exc:
        nodes.upsert_node(
            {
                "id": node_record.id,
                "state": "degraded",
                "metadata": {
                    **(node_record.metadata or {}),
                    "lastError": "promotion timed out",
                },
            }
        )
        raise HTTPException(status_code=504, detail=f"Promotion timed out for {req.host}") from exc
    if result.returncode != 0:
        nodes.upsert_node(
            {
                "id": node_record.id,
                "state": "degraded",
                "metadata": {
                    **(node_record.metadata or {}),
                    "lastError": result.stderr.strip() or result.stdout.strip(),
                },
            }
        )
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Promotion failed",
                "stderr": result.stderr.strip(),
                "stdoutTail": "\n".join(result.stdout.splitlines()[-20:]),
            },
        )

    node_record = nodes.upsert_node(
        {
            "id": node_record.id,
            "state": "managed",
            "managed": True,
            "install_path": req.installPath,
            "runtime_kind": requested_runtime or "docker_compose",
            "last_seen": nodes.now_iso(),
            "metadata": {
                **(node_record.metadata or {}),
                "lastInstallStdoutTail": "\n".join(result.stdout.splitlines()[-20:]),
            },
        }
    )

    return {
        "status": "promoted",
        "node": _node_to_payload(node_record),
        "preflight": preflight,
    }


@router.post("/nodes/{node_id}/actions")
async def node_action(node_id: str, req: NodeActionRequest):
    node = nodes.get_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail=f"Unknown node: {node_id}")
    if not node.control_host:
        raise HTTPException(status_code=400, detail="Node does not have a control host configured")

    command = _service_command(node, req.action)
    try:
        result = _run_ssh(node.ssh_user, node.control_host, node.ssh_port, command, timeout=60)
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(status_code=504, detail=f"{req.action} timed out for {node.hostname}") from exc
    if result.returncode != 0:
        raise HTTPException(
            status_code=400,
            detail={
                "message": f"{req.action} failed for {node.hostname}",
                "stderr": result.stderr.strip(),
                "stdout": result.stdout.strip(),
            },
        )

    new_state = node.state
    if req.action == "start":
        new_state = "managed"
    elif req.action == "stop":
        new_state = "offline"
    elif req.action == "restart":
        new_state = "managed"

    node = nodes.upsert_node(
        {
            "id": node.id,
            "state": new_state,
            "managed": node.managed,
            "last_seen": nodes.now_iso(),
            "metadata": {
                **(node.metadata or {}),
                "lastAction": req.action,
            },
        }
    )

    return {
        "status": "ok",
        "node": _node_to_payload(node),
        "stdout": result.stdout.strip(),
    }


@router.get("/nodes/{node_id}/updates")
async def node_updates(node_id: str):
    node = nodes.get_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail=f"Unknown node: {node_id}")
    if not node.control_host:
        raise HTTPException(status_code=400, detail="Node does not have a control host configured")
    return _check_updates(node)
