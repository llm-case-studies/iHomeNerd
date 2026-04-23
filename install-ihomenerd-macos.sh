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
command -v python3 >/dev/null 2>&1 || fail "python3 is required."
python3 - <<'PY' >/dev/null 2>&1
import venv
print("ok")
PY
ok "Python 3 with venv support is ready"

step "Choosing the right starter model pack"

MODELS_TO_PULL=()
if [[ "$ARCH" == "arm64" && $RAM_GB -ge 24 ]]; then
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

step "Setting up the Nerd Cave"

INSTALL_DIR="${IHN_INSTALL_DIR:-${HOME}/.ihomenerd}"
if [[ "$INSTALL_DIR" == "~/"* ]]; then
    INSTALL_DIR="${HOME}/${INSTALL_DIR#~/}"
elif [[ "$INSTALL_DIR" == "~" ]]; then
    INSTALL_DIR="${HOME}"
fi
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
export IHN_OLLAMA_URL="http://127.0.0.1:11434"
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

python3 -m venv "${INSTALL_DIR}/backend/.venv"
"${INSTALL_DIR}/backend/.venv/bin/pip" install --upgrade pip >/dev/null
"${INSTALL_DIR}/backend/.venv/bin/pip" install "${INSTALL_DIR}/backend"
ok "Python environment is ready"

step "Registering launchd services"

cat > "${LAUNCH_AGENTS_DIR}/com.ihomenerd.brain.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.ihomenerd.brain</string>
  <key>ProgramArguments</key>
  <array>
    <string>${INSTALL_DIR}/run-ihomenerd.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${INSTALL_DIR}/backend</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/ihomenerd.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/ihomenerd.err</string>
</dict>
</plist>
EOF

load_launch_agent "com.ihomenerd.brain" "${LAUNCH_AGENTS_DIR}/com.ihomenerd.brain.plist"
ok "iHomeNerd launchd agent loaded"

OLLAMA_CLI="$(find_ollama_cli || true)"
if [[ -n "$OLLAMA_CLI" ]]; then
    cat > "${INSTALL_DIR}/run-ollama.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:\$PATH"
exec "${OLLAMA_CLI}" serve
EOF
    chmod +x "${INSTALL_DIR}/run-ollama.sh"

    cat > "${LAUNCH_AGENTS_DIR}/com.ihomenerd.ollama.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.ihomenerd.ollama</string>
  <key>ProgramArguments</key>
  <array>
    <string>${INSTALL_DIR}/run-ollama.sh</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/ihomenerd-ollama.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/ihomenerd-ollama.err</string>
</dict>
</plist>
EOF

    load_launch_agent "com.ihomenerd.ollama" "${LAUNCH_AGENTS_DIR}/com.ihomenerd.ollama.plist"
    ok "Ollama launchd agent loaded"

    say "Pulling starter models into Ollama..."
    for model in "${MODELS_TO_PULL[@]}"; do
        say "Pulling ${model}..."
        "${OLLAMA_CLI}" pull "$model" 2>&1 | tail -1
        ok "${model} ready"
    done
else
    warn "Ollama was not found on this Mac."
    warn "Install the Ollama app, then re-run this script or let the gateway manage this node as a light controller first."
fi

step "Almost there"

say "Waiting for the Brain to wake up..."
for i in $(seq 1 30); do
    if curl -sk https://localhost:17777/discover >/dev/null 2>&1; then
        break
    fi
    sleep 2
done

DISCOVER_PAYLOAD="$(curl -sk https://localhost:17777/discover 2>/dev/null || true)"
HEALTH_PAYLOAD="$(curl -sk https://localhost:17777/health 2>/dev/null || true)"
if [[ -n "$DISCOVER_PAYLOAD" ]]; then
    ok "iHomeNerd Brain is up on this Mac"
else
    fail "iHomeNerd did not respond on https://localhost:17777"
fi

if echo "$HEALTH_PAYLOAD" | grep -q '"ok":true'; then
    ok "Model backend is reachable too"
else
    warn "The Brain is up, but Ollama is not ready yet."
fi

echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║                                                      ║${NC}"
echo -e "${BOLD}${GREEN}║   ${BRAIN}  iHomeNerd Brain is ready on this Mac!       ║${NC}"
echo -e "${BOLD}${GREEN}║                                                      ║${NC}"
echo -e "${BOLD}${GREEN}║   Local:   https://localhost:17777                    ║${NC}"
echo -e "${BOLD}${GREEN}║   LAN:     https://${LAN_IP}:17777$(printf '%*s' $((21 - ${#LAN_IP})) '')║${NC}"
echo -e "${BOLD}${GREEN}║                                                      ║${NC}"
echo -e "${BOLD}${GREEN}║   ${DIM}Install the iHomeNerd trust profile or CA${NC}${BOLD}${GREEN}      ║${NC}"
echo -e "${BOLD}${GREEN}║   ${DIM}once per household to avoid browser warnings.${NC}${BOLD}${GREEN}  ║${NC}"
echo -e "${BOLD}${GREEN}║                                                      ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
say "Commands:"
echo -e "  ${DIM}Status:${NC}   launchctl print user/$(id -u)/com.ihomenerd.brain"
echo -e "  ${DIM}Stop:${NC}     launchctl bootout user/$(id -u)/com.ihomenerd.brain"
echo -e "  ${DIM}Start:${NC}    launchctl bootstrap user/$(id -u) ~/Library/LaunchAgents/com.ihomenerd.brain.plist"
echo ""

if [[ "${IHN_SKIP_OPEN:-0}" != "1" ]] && command -v open >/dev/null 2>&1; then
    open "https://localhost:17777" >/dev/null 2>&1 || true
fi

say "Enjoy your new Brain! ${HOUSE}"
