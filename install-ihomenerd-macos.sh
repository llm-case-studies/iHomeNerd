#!/usr/bin/env bash
# ============================================================================
#  install-ihomenerd-macos.sh — Install the iHomeNerd Brain on this Mac
#
#  What it does:
#    1. Checks your Mac hardware and Python runtime
#    2. Downloads the iHomeNerd repo archive
#    3. Reuses or creates the household Home CA
#    4. Creates a Python venv and installs the backend
#    5. Registers iHomeNerd as a launchd agent
#    6. Reuses Ollama if it is already installed on this Mac
# ============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

BRAIN="🧠"
CHECK="✅"
WARN="⚠️"
HOUSE="🏠"
ROCKET="🚀"
GEAR="⚙️"
PLUG="🔌"

say()  { echo -e "${BLUE}${BRAIN} ${NC}$1"; }
ok()   { echo -e "  ${GREEN}${CHECK} $1${NC}"; }
warn() { echo -e "  ${YELLOW}${WARN}  $1${NC}"; }
fail() { echo -e "  ${RED}✘  $1${NC}"; exit 1; }
step() { echo -e "\n${CYAN}${BOLD}── $1 ──${NC}"; }

confirm_or_exit() {
    local prompt="$1"
    if [[ "${IHN_AUTO_YES:-0}" == "1" ]]; then
        ok "${prompt} — auto-accepted"
        return 0
    fi
    read -p "   ${prompt} (y/N) " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]] || exit 1
}

copy_ca_file_from_ssh() {
    local ssh_host="$1"
    local remote_command="$2"
    local dest_path="$3"
    ssh "$ssh_host" "$remote_command" > "$dest_path"
}

import_home_ca_from_ssh() {
    local ssh_host="$1"
    local ca_dir="$2"

    say "Importing Home CA from ${ssh_host}..."
    mkdir -p "$ca_dir"

    if ssh "$ssh_host" 'test -f ~/.ihomenerd/home-ca/ca.crt && test -f ~/.ihomenerd/home-ca/ca.key'; then
        copy_ca_file_from_ssh "$ssh_host" 'cat "$HOME/.ihomenerd/home-ca/ca.crt"' "${ca_dir}/ca.crt"
        copy_ca_file_from_ssh "$ssh_host" 'cat "$HOME/.ihomenerd/home-ca/ca.key"' "${ca_dir}/ca.key"
    else
        fail "Could not find a reusable Home CA on ${ssh_host}"
    fi

    chmod 600 "${ca_dir}/ca.key"
    ok "Imported shared Home CA"
}

generate_home_ca() {
    local ca_dir="$1"
    local subject="${IHN_HOME_CA_SUBJECT:-/CN=iHomeNerd Home CA/O=iHomeNerd}"

    command -v openssl &>/dev/null || fail "OpenSSL is required to generate a Home CA."
    mkdir -p "$ca_dir"
    umask 077

    say "Generating a new Home CA for this iHomeNerd household..."
    openssl genrsa -out "${ca_dir}/ca.key" 4096 >/dev/null 2>&1
    openssl req -x509 -new -nodes \
        -key "${ca_dir}/ca.key" \
        -sha256 \
        -days 3650 \
        -subj "$subject" \
        -addext "basicConstraints=critical,CA:TRUE,pathlen:0" \
        -addext "keyUsage=critical,keyCertSign,cRLSign" \
        -out "${ca_dir}/ca.crt" >/dev/null 2>&1
    ok "Created Home CA"
}

find_ollama_cli() {
    if command -v ollama >/dev/null 2>&1; then
        command -v ollama
        return 0
    fi
    if [[ -x /Applications/Ollama.app/Contents/Resources/ollama ]]; then
        echo "/Applications/Ollama.app/Contents/Resources/ollama"
        return 0
    fi
    if [[ -x "$HOME/Applications/Ollama.app/Contents/Resources/ollama" ]]; then
        echo "$HOME/Applications/Ollama.app/Contents/Resources/ollama"
        return 0
    fi
    return 1
}

python_is_311_or_newer() {
    local candidate="$1"
    "$candidate" - <<'PY' >/dev/null 2>&1
import sys
raise SystemExit(0 if sys.version_info >= (3, 11) else 1)
PY
}

find_python311() {
    local candidates=()
    if [[ -n "${IHN_PYTHON_BIN:-}" ]]; then
        candidates+=("${IHN_PYTHON_BIN}")
    fi
    candidates+=(
        python3.13
        python3.12
        python3.11
        /opt/homebrew/bin/python3.13
        /opt/homebrew/bin/python3.12
        /opt/homebrew/bin/python3.11
        /usr/local/bin/python3.13
        /usr/local/bin/python3.12
        /usr/local/bin/python3.11
        python3
    )

    local candidate
    for candidate in "${candidates[@]}"; do
        if command -v "$candidate" >/dev/null 2>&1 && python_is_311_or_newer "$candidate"; then
            command -v "$candidate"
            return 0
        fi
        if [[ -x "$candidate" ]] && python_is_311_or_newer "$candidate"; then
            echo "$candidate"
            return 0
        fi
    done
    return 1
}

load_launch_agent() {
    local label="$1"
    local plist_path="$2"
    launchctl bootout "gui/$(id -u)/${label}" >/dev/null 2>&1 || true
    launchctl bootout "user/$(id -u)/${label}" >/dev/null 2>&1 || true
    launchctl bootstrap "gui/$(id -u)" "$plist_path" >/dev/null 2>&1 || launchctl bootstrap "user/$(id -u)" "$plist_path"
}

echo ""
echo -e "${BOLD}${CYAN}"
cat << 'BANNER'
  _ _  _                    _  _              _
 (_) || |___  _ __  ___  | \| |___ _ _ __| |
 | | __ / _ \| '  \/ -_) | .` / -_) '_/ _` |
 |_|_||_\___/|_|_|_\___| |_|\_\___|_| \__,_|

         Your Local AI Brain
BANNER
echo -e "${NC}"
say "I'm going to set up iHomeNerd on this Mac."
say "This installs a local launchd service, keeps your data on-device, and reuses your Home CA when available."
echo ""

step "Checking this Mac"

OS="$(uname -s)"
[[ "$OS" == "Darwin" ]] || fail "This installer is for macOS only."
ok "Operating system: macOS"

ARCH="$(uname -m)"
CHIP="$(sysctl -n machdep.cpu.brand_string 2>/dev/null || true)"
ok "Architecture: ${ARCH}${CHIP:+ · ${CHIP}}"

RAM_BYTES="$(sysctl -n hw.memsize 2>/dev/null || echo 0)"
RAM_GB=$((RAM_BYTES / 1024 / 1024 / 1024))
[[ $RAM_GB -ge 8 ]] || fail "Only ${RAM_GB}GB RAM detected. iHomeNerd on macOS needs at least 8GB."
ok "RAM: ${RAM_GB}GB"

DISK_AVAIL=$(df -g "$HOME" | tail -1 | awk '{print $4}')
if [[ "${DISK_AVAIL:-0}" -lt 12 ]]; then
    warn "Only ${DISK_AVAIL}GB free in your home directory."
    confirm_or_exit "Continue anyway?"
fi
ok "Disk: ${DISK_AVAIL}GB available"

command -v curl >/dev/null 2>&1 || fail "curl is required."
PYTHON_BIN="$(find_python311 || true)"
[[ -n "$PYTHON_BIN" ]] || fail "Python 3.11+ is required. Install Homebrew Python with: brew install python@3.12"
"$PYTHON_BIN" - <<'PY' >/dev/null 2>&1
import venv
print("ok")
PY
PYTHON_VERSION="$("$PYTHON_BIN" - <<'PY'
import sys
print(".".join(map(str, sys.version_info[:3])))
PY
)"
ok "Python ${PYTHON_VERSION} with venv support is ready (${PYTHON_BIN})"

step "Choosing the right starter model pack"

MAC_LLM_BACKEND="${IHN_MAC_LLM_BACKEND:-ollama}"
MLX_MODEL="${IHN_MLX_MODEL:-mlx-community/Qwen2.5-1.5B-Instruct-4bit}"
MLX_LM_VERSION="${IHN_MLX_LM_VERSION:-0.31.3}"
MLX_SERVER_PORT="${IHN_MLX_SERVER_PORT:-11435}"
SERVICE_SUFFIX="${IHN_SERVICE_LABEL_SUFFIX:-}"
if [[ -n "$SERVICE_SUFFIX" ]]; then
    IHN_PORT="${IHN_PORT:-18777}"
    if [[ "${IHN_MLX_SERVER_PORT:-}" == "" ]]; then
        MLX_SERVER_PORT=12435
    fi
else
    IHN_PORT="${IHN_PORT:-17777}"
fi
MODELS_TO_PULL=()
if [[ "$MAC_LLM_BACKEND" == "mlx" ]]; then
    [[ "$ARCH" == "arm64" ]] || fail "Native MLX backend requires an Apple Silicon Mac (arm64)."
    MODELS_TO_PULL=()
    MODEL_DESC="MLX native chat (${MLX_MODEL})"
elif [[ "$ARCH" == "arm64" && $RAM_GB -ge 24 ]]; then
    MODELS_TO_PULL=("gemma4:e2b" "nomic-embed-text")
    MODEL_DESC="Gemma 4 (2B) + embeddings"
elif [[ $RAM_GB -ge 16 ]]; then
    MODELS_TO_PULL=("gemma3:1b" "nomic-embed-text")
    MODEL_DESC="Gemma 3 (1B) + embeddings"
else
    MODELS_TO_PULL=("gemma3:1b")
    MODEL_DESC="Gemma 3 (1B) — lightweight"
fi
ok "Selected: ${MODEL_DESC}"

INSTALL_DIR="${IHN_INSTALL_DIR:-${HOME}/.ihomenerd}"
if [[ "$INSTALL_DIR" == "~/"* ]]; then
    INSTALL_DIR="${HOME}/${INSTALL_DIR#~/}"
elif [[ "$INSTALL_DIR" == "~" ]]; then
    INSTALL_DIR="${HOME}"
fi
MLX_VENV_DIR="${IHN_MLX_VENV_DIR:-${INSTALL_DIR}/runtime/mlx-sidecar-venv}"

if [[ "$MAC_LLM_BACKEND" == "mlx" ]]; then
    if [[ "$MLX_MODEL" == *"gemma-4"* ]] && [[ "${IHN_ALLOW_UNVALIDATED_MLX_MODEL:-0}" != "1" ]]; then
        fail "mlx-community/gemma-4-e2b-it-4bit is known incompatible with mlx-lm==${MLX_LM_VERSION}. Set IHN_MLX_MODEL to a validated model (mlx-community/Qwen2.5-1.5B-Instruct-4bit) or IHN_ALLOW_UNVALIDATED_MLX_MODEL=1 to override."
    fi
    if [[ "$MLX_MODEL" == *"gemma-4"* ]] && [[ "${IHN_ALLOW_UNVALIDATED_MLX_MODEL:-0}" == "1" ]]; then
        warn "Overriding known-bad model guard for ${MLX_MODEL}. This model is known incompatible with mlx-lm==${MLX_LM_VERSION}."
    fi
fi

if [[ "${IHN_PREFLIGHT_ONLY:-0}" == "1" ]]; then
    step "Preflight Summary"
    echo ""
    echo -e "  ${BOLD}Install directory:${NC}     ${INSTALL_DIR}"
    echo -e "  ${BOLD}Backend:${NC}               ${MAC_LLM_BACKEND}"
    echo -e "  ${BOLD}Brain port:${NC}            ${IHN_PORT}"
    echo -e "  ${BOLD}MLX model:${NC}             ${MLX_MODEL}"
    echo -e "  ${BOLD}mlx-lm version:${NC}        ${MLX_LM_VERSION}"
    echo -e "  ${BOLD}MLX sidecar venv:${NC}      ${MLX_VENV_DIR}"
    echo -e "  ${BOLD}MLX server port:${NC}       ${MLX_SERVER_PORT}"
    echo -e "  ${BOLD}Backend venv:${NC}           ${INSTALL_DIR}/backend/.venv"
    echo -e "  ${BOLD}Service suffix:${NC}         ${SERVICE_SUFFIX:-"(none)"}"
    echo -e "  ${BOLD}Skip Ollama:${NC}            ${IHN_SKIP_OLLAMA:-0}"
    echo ""
    ok "Preflight checks passed. No downloads, CA creation, venv installs, launchd registration, or service starts were performed."
    exit 0
fi

if [[ "${IHN_MLX_RUNTIME_ONLY:-0}" == "1" ]]; then
    [[ "$MAC_LLM_BACKEND" == "mlx" ]] || fail "IHN_MLX_RUNTIME_ONLY=1 requires IHN_MAC_LLM_BACKEND=mlx."
    step "MLX Runtime-Only Setup"
    if [[ -d "$MLX_VENV_DIR" ]]; then
        ok "Reusing existing MLX sidecar venv at ${MLX_VENV_DIR}"
    else
        say "Creating MLX sidecar venv at ${MLX_VENV_DIR}..."
        "$PYTHON_BIN" -m venv "$MLX_VENV_DIR"
        ok "MLX sidecar venv created"
    fi
    "${MLX_VENV_DIR}/bin/pip" install --upgrade pip >/dev/null
    say "Installing mlx-lm==${MLX_LM_VERSION}..."
    "${MLX_VENV_DIR}/bin/pip" install "mlx-lm==${MLX_LM_VERSION}"
    say "Verifying mlx_lm.server..."
    if "${MLX_VENV_DIR}/bin/mlx_lm.server" --help >/dev/null 2>&1; then
        ok "mlx_lm.server is ready"
    else
        fail "mlx_lm.server could not be started."
    fi
    ok "MLX runtime-only setup complete. No repo download, CA setup, backend venv, launchd, or service start was performed."
    exit 0
fi

step "Setting up the Nerd Cave"

REPO_REF="${IHN_REPO_REF:-main}"
ARCHIVE_URL="https://github.com/llm-case-studies/iHomeNerd/archive/refs/heads/${REPO_REF}.tar.gz"
HOME_CA_DIR="${INSTALL_DIR}/home-ca"
LAUNCH_AGENTS_DIR="${HOME}/Library/LaunchAgents"
mkdir -p "$INSTALL_DIR" "$LAUNCH_AGENTS_DIR"

say "Downloading iHomeNerd ${REPO_REF}..."
curl -fsSL "$ARCHIVE_URL" | tar -xz --strip-components=1 -C "$INSTALL_DIR"
ok "iHomeNerd files saved to ${INSTALL_DIR}/"

if [[ -n "${IHN_HOME_CA_SOURCE_DIR:-}" ]]; then
    say "Reusing Home CA from ${IHN_HOME_CA_SOURCE_DIR}..."
    mkdir -p "$HOME_CA_DIR"
    cp "${IHN_HOME_CA_SOURCE_DIR}/ca.crt" "${HOME_CA_DIR}/ca.crt"
    cp "${IHN_HOME_CA_SOURCE_DIR}/ca.key" "${HOME_CA_DIR}/ca.key"
    chmod 600 "${HOME_CA_DIR}/ca.key"
    ok "Reused Home CA from local directory"
elif [[ -n "${IHN_HOME_CA_SOURCE_SSH:-}" ]]; then
    import_home_ca_from_ssh "${IHN_HOME_CA_SOURCE_SSH}" "$HOME_CA_DIR"
elif [[ -f "${HOME_CA_DIR}/ca.crt" && -f "${HOME_CA_DIR}/ca.key" ]]; then
    ok "Reusing existing Home CA from ${HOME_CA_DIR}"
else
    generate_home_ca "$HOME_CA_DIR"
fi

DEFAULT_IFACE="$(route -n get default 2>/dev/null | awk '/interface:/{print $2; exit}')"
LAN_IP=""
if [[ -n "$DEFAULT_IFACE" ]]; then
    LAN_IP="$(ipconfig getifaddr "$DEFAULT_IFACE" 2>/dev/null || true)"
fi
[[ -n "$LAN_IP" ]] || LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
[[ -n "$LAN_IP" ]] || fail "Could not determine this Mac's LAN IP."

HOST_SHORT="$(scutil --get LocalHostName 2>/dev/null || hostname -s)"
HOST_COMPUTER="$(scutil --get ComputerName 2>/dev/null || true)"
HOSTNAME_LIST="$HOST_SHORT"
if [[ -n "$HOST_COMPUTER" && "$HOST_COMPUTER" != "$HOST_SHORT" ]]; then
    HOSTNAME_LIST="${HOSTNAME_LIST},${HOST_COMPUTER}"
fi
if [[ "$HOST_SHORT" != *.local ]]; then
    HOSTNAME_LIST="${HOSTNAME_LIST},${HOST_SHORT}.local"
fi

cat > "${INSTALL_DIR}/run-ihomenerd.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:\$PATH"
export IHN_DATA_DIR="${INSTALL_DIR}"
export IHN_LAN_MODE=1
export IHN_HOST="127.0.0.1"
export IHN_PORT="${IHN_PORT}"
export IHN_OLLAMA_URL="http://127.0.0.1:11434"
export IHN_LLM_PROVIDER="${MAC_LLM_BACKEND}"
export IHN_MLX_MODEL="${MLX_MODEL}"
export IHN_MLX_SERVER_URL="http://127.0.0.1:${MLX_SERVER_PORT}"
export IHN_CA_CERT_PATH="${HOME_CA_DIR}/ca.crt"
export IHN_CA_KEY_PATH="${HOME_CA_DIR}/ca.key"
export IHN_CERT_LAN_IP="${LAN_IP}"
export IHN_CERT_HOSTNAMES="${HOSTNAME_LIST}"
cd "${INSTALL_DIR}/backend"
exec "${INSTALL_DIR}/backend/.venv/bin/python" -m app.main
EOF
chmod +x "${INSTALL_DIR}/run-ihomenerd.sh"
ok "Runtime launcher prepared for ${LAN_IP} (${HOSTNAME_LIST})"

step "Installing Python environment"

"$PYTHON_BIN" -m venv "${INSTALL_DIR}/backend/.venv"
"${INSTALL_DIR}/backend/.venv/bin/pip" install --upgrade pip >/dev/null
"${INSTALL_DIR}/backend/.venv/bin/pip" install "${INSTALL_DIR}/backend"
ok "Backend Python environment is ready"

if [[ "$MAC_LLM_BACKEND" == "mlx" ]]; then
    step "Installing MLX sidecar runtime"
    if [[ -d "$MLX_VENV_DIR" ]]; then
        ok "Reusing existing MLX sidecar venv at ${MLX_VENV_DIR}"
    else
        "$PYTHON_BIN" -m venv "$MLX_VENV_DIR"
        ok "Created MLX sidecar venv at ${MLX_VENV_DIR}"
    fi
    "${MLX_VENV_DIR}/bin/pip" install --upgrade pip >/dev/null
    "${MLX_VENV_DIR}/bin/pip" install "mlx-lm==${MLX_LM_VERSION}"
    ok "MLX sidecar runtime is ready (mlx-lm==${MLX_LM_VERSION})"
fi

step "Registering launchd services"

BRAIN_LABEL="com.ihomenerd.brain${SERVICE_SUFFIX}"
BRAIN_PLIST="${LAUNCH_AGENTS_DIR}/com.ihomenerd.brain${SERVICE_SUFFIX}.plist"
BRAIN_LOG="/tmp/ihomenerd${SERVICE_SUFFIX}.log"
BRAIN_ERR="/tmp/ihomenerd${SERVICE_SUFFIX}.err"

cat > "${BRAIN_PLIST}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${BRAIN_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${INSTALL_DIR}/run-ihomenerd.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${INSTALL_DIR}/backend</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <true/>
    <key>Crashed</key>
    <true/>
  </dict>
  <key>ThrottleInterval</key>
  <integer>10</integer>
  <key>ExitTimeOut</key>
  <integer>15</integer>
  <key>ProcessType</key>
  <string>Standard</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>SoftResourceLimits</key>
  <dict>
    <key>NumberOfFiles</key>
    <integer>4096</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>${BRAIN_LOG}</string>
  <key>StandardErrorPath</key>
  <string>${BRAIN_ERR}</string>
</dict>
</plist>
EOF

load_launch_agent "${BRAIN_LABEL}" "${BRAIN_PLIST}"
ok "iHomeNerd launchd agent loaded (${BRAIN_LABEL})"

if [[ "$MAC_LLM_BACKEND" == "mlx" ]]; then
    cat > "${INSTALL_DIR}/run-mlx.sh" <<RUNMLX
#!/usr/bin/env bash
set -euo pipefail

log_exit() {
    local code=\$?
    local signal=""
    if [[ \$code -gt 128 ]]; then
        signal=" (signal \$((code - 128)): \$(kill -l \$((code - 128)) 2>/dev/null || echo "SIG?"))"
    fi
    echo "[\$(date -u +%Y-%m-%dT%H:%M:%SZ)] mlx_lm.server exited with code \${code}\${signal}" >&2
}
trap log_exit EXIT

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:\$PATH"
exec "${MLX_VENV_DIR}/bin/mlx_lm.server" --host 127.0.0.1 --port "${MLX_SERVER_PORT}" --model "${MLX_MODEL}"
RUNMLX
    chmod +x "${INSTALL_DIR}/run-mlx.sh"

    MLX_LABEL="com.ihomenerd.mlx${SERVICE_SUFFIX}"
    MLX_PLIST="${LAUNCH_AGENTS_DIR}/com.ihomenerd.mlx${SERVICE_SUFFIX}.plist"
    MLX_LOG="/tmp/ihomenerd-mlx${SERVICE_SUFFIX}.log"
    MLX_ERR="/tmp/ihomenerd-mlx${SERVICE_SUFFIX}.err"

    cat > "${MLX_PLIST}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${MLX_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${INSTALL_DIR}/run-mlx.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${INSTALL_DIR}/runtime</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <true/>
    <key>Crashed</key>
    <true/>
  </dict>
  <key>ThrottleInterval</key>
  <integer>15</integer>
  <key>ExitTimeOut</key>
  <integer>20</integer>
  <key>ProcessType</key>
  <string>Background</string>
  <key>Nice</key>
  <integer>5</integer>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>SoftResourceLimits</key>
  <dict>
    <key>NumberOfFiles</key>
    <integer>4096</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>${MLX_LOG}</string>
  <key>StandardErrorPath</key>
  <string>${MLX_ERR}</string>
</dict>
</plist>
EOF

    load_launch_agent "${MLX_LABEL}" "${MLX_PLIST}"
    ok "MLX launchd agent loaded on 127.0.0.1:${MLX_SERVER_PORT} (${MLX_LABEL})"
fi

OLLAMA_CLI="$(find_ollama_cli || true)"
if [[ "${IHN_SKIP_OLLAMA:-0}" == "1" ]]; then
    ok "Skipping Ollama setup (IHN_SKIP_OLLAMA=1)"
elif [[ -n "$OLLAMA_CLI" ]]; then
    cat > "${INSTALL_DIR}/run-ollama.sh" <<RUNOLLAMA
#!/usr/bin/env bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:\$PATH"
exec "${OLLAMA_CLI}" serve
RUNOLLAMA
    chmod +x "${INSTALL_DIR}/run-ollama.sh"

    OLLAMA_LABEL="com.ihomenerd.ollama${SERVICE_SUFFIX}"
    OLLAMA_PLIST="${LAUNCH_AGENTS_DIR}/com.ihomenerd.ollama${SERVICE_SUFFIX}.plist"
    OLLAMA_LOG="/tmp/ihomenerd-ollama${SERVICE_SUFFIX}.log"
    OLLAMA_ERR="/tmp/ihomenerd-ollama${SERVICE_SUFFIX}.err"

    cat > "${OLLAMA_PLIST}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${OLLAMA_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${INSTALL_DIR}/run-ollama.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${INSTALL_DIR}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <true/>
    <key>Crashed</key>
    <true/>
  </dict>
  <key>ThrottleInterval</key>
  <integer>10</integer>
  <key>ExitTimeOut</key>
  <integer>15</integer>
  <key>ProcessType</key>
  <string>Background</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>SoftResourceLimits</key>
  <dict>
    <key>NumberOfFiles</key>
    <integer>4096</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>${OLLAMA_LOG}</string>
  <key>StandardErrorPath</key>
  <string>${OLLAMA_ERR}</string>
</dict>
</plist>
EOF

    load_launch_agent "${OLLAMA_LABEL}" "${OLLAMA_PLIST}"
    ok "Ollama launchd agent loaded"

    if [[ ${#MODELS_TO_PULL[@]} -gt 0 ]]; then
        say "Pulling starter models into Ollama..."
        for model in "${MODELS_TO_PULL[@]}"; do
            say "Pulling ${model}..."
            "${OLLAMA_CLI}" pull "$model" 2>&1 | tail -1
            ok "${model} ready"
        done
    else
        ok "No Ollama starter models requested for ${MAC_LLM_BACKEND} mode"
    fi
else
    warn "Ollama was not found on this Mac."
    if [[ "$MAC_LLM_BACKEND" == "mlx" ]]; then
        warn "Continuing with native MLX mode. Document RAG embeddings may still need Ollama later."
    else
        warn "Install the Ollama app, then re-run this script or let the gateway manage this node as a light controller first."
    fi
fi

step "Almost there"

say "Waiting for the Brain to wake up..."
for i in $(seq 1 30); do
    if curl -sk "https://localhost:${IHN_PORT}/discover" >/dev/null 2>&1; then
        break
    fi
    sleep 2
done

DISCOVER_PAYLOAD="$(curl -sk "https://localhost:${IHN_PORT}/discover" 2>/dev/null || true)"
HEALTH_PAYLOAD="$(curl -sk "https://localhost:${IHN_PORT}/health" 2>/dev/null || true)"
if [[ -n "$DISCOVER_PAYLOAD" ]]; then
    ok "iHomeNerd Brain is up on this Mac"
else
    fail "iHomeNerd did not respond on https://localhost:${IHN_PORT}"
fi

if echo "$HEALTH_PAYLOAD" | grep -q '"ok":true'; then
    ok "Model backend is reachable too"
elif [[ "$MAC_LLM_BACKEND" == "mlx" ]]; then
    if curl -fsS "http://127.0.0.1:${MLX_SERVER_PORT}/v1/models" >/dev/null 2>&1; then
        ok "MLX sidecar is reachable too"
        ok "iHN is configured to route text chat through MLX"
    else
        warn "The Brain is up, but the MLX sidecar is not ready yet."
    fi
else
    warn "The Brain is up, but Ollama is not ready yet."
fi

echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║                                                      ║${NC}"
echo -e "${BOLD}${GREEN}║   ${BRAIN}  iHomeNerd Brain is ready on this Mac!       ║${NC}"
echo -e "${BOLD}${GREEN}║                                                      ║${NC}"
LAN_URL="https://${LAN_IP}:${IHN_PORT}"
printf "${BOLD}${GREEN}║   Local:   https://localhost:%-5s                    ║${NC}\n" "${IHN_PORT}"
printf "${BOLD}${GREEN}║   LAN:     %-40s ║${NC}\n" "${LAN_URL}"
echo -e "${BOLD}${GREEN}║                                                      ║${NC}"
echo -e "${BOLD}${GREEN}║   ${DIM}Install the iHomeNerd trust profile or CA${NC}${BOLD}${GREEN}      ║${NC}"
echo -e "${BOLD}${GREEN}║   ${DIM}once per household to avoid browser warnings.${NC}${BOLD}${GREEN}  ║${NC}"
echo -e "${BOLD}${GREEN}║                                                      ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
say "Commands:"
echo -e "  ${DIM}Status:${NC}   launchctl print user/$(id -u)/${BRAIN_LABEL}"
echo -e "  ${DIM}Stop:${NC}     launchctl bootout user/$(id -u)/${BRAIN_LABEL}"
echo -e "  ${DIM}Start:${NC}    launchctl bootstrap user/$(id -u) ${BRAIN_PLIST}"
echo ""

if [[ "${IHN_SKIP_OPEN:-0}" != "1" ]] && command -v open >/dev/null 2>&1; then
    open "https://localhost:${IHN_PORT}" >/dev/null 2>&1 || true
fi

say "Enjoy your new Brain! ${HOUSE}"
