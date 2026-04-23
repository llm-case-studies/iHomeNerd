#!/usr/bin/env bash
# ============================================================================
#  get-ihomenerd.sh — Install the iHomeNerd Brain on this machine
#
#  Usage:  curl -sSL https://get.ihomenerd.com | bash
#     or:  bash get-ihomenerd.sh
#
#  What it does:
#    1. Checks your hardware (GPU, RAM, disk)
#    2. Installs Docker if needed
#    3. Installs nvidia-container-toolkit if you have an NVIDIA GPU
#    4. Downloads the iHomeNerd repo archive
#    5. Builds and starts iHomeNerd + Ollama
#    6. Downloads the right AI models for your GPU
#    7. Opens the Command Center in your browser
# ============================================================================

set -euo pipefail

# --- Colors & Symbols ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

BRAIN="🧠"
EYES="👀"
GEAR="⚙️"
ROCKET="🚀"
CHECK="✅"
WARN="⚠️"
COFFEE="☕"
HOUSE="🏠"
PLUG="🔌"
MAG="🔍"

# --- Helper functions ---
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
        ssh "$ssh_host" 'cd ~/.ihomenerd && docker compose exec -T brain sh -lc "cat /data/certs/ca.crt"' > "${ca_dir}/ca.crt"
        ssh "$ssh_host" 'cd ~/.ihomenerd && docker compose exec -T brain sh -lc "cat /data/certs/ca.key"' > "${ca_dir}/ca.key"
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

# --- Banner ---
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
say "Hello! I'm going to set up an AI brain on this machine."
say "Don't worry — everything stays local. No cloud, no tracking, no nonsense."
echo ""

# ============================================================================
# Step 1: Check the hardware
# ============================================================================
step "${EYES} Checking what we're working with..."

# OS
OS="$(uname -s)"
if [[ "$OS" != "Linux" ]]; then
    warn "You're on ${OS}. This installer is for Linux."
    warn "macOS support: use install-ihomenerd-macos.sh or the gateway Promote flow"
    warn "Windows support: see https://ihomenerd.com/windows"
    exit 1
fi
ok "Operating system: Linux"

# Architecture
ARCH="$(uname -m)"
ok "Architecture: ${ARCH}"

# RAM
RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
RAM_GB=$((RAM_KB / 1024 / 1024))
if [[ $RAM_GB -lt 4 ]]; then
    fail "Only ${RAM_GB}GB RAM detected. iHomeNerd needs at least 4GB."
fi
ok "RAM: ${RAM_GB}GB"

# Disk space
DISK_AVAIL=$(df -BG / | tail -1 | awk '{print $4}' | tr -d 'G')
if [[ $DISK_AVAIL -lt 10 ]]; then
    warn "Only ${DISK_AVAIL}GB disk free. We'll need ~8GB for models."
    confirm_or_exit "Continue anyway?"
fi
ok "Disk: ${DISK_AVAIL}GB available"

# GPU detection
GPU_NAME=""
GPU_VRAM_MB=0
if command -v nvidia-smi &>/dev/null; then
    GPU_INFO=$(nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits 2>/dev/null || true)
    if [[ -n "$GPU_INFO" ]]; then
        GPU_NAME=$(echo "$GPU_INFO" | head -1 | cut -d',' -f1 | xargs)
        GPU_VRAM_MB=$(echo "$GPU_INFO" | head -1 | cut -d',' -f2 | xargs)
        ok "GPU: ${GPU_NAME} (${GPU_VRAM_MB}MB VRAM) — excellent!"
    fi
fi

if [[ -z "$GPU_NAME" ]]; then
    warn "No NVIDIA GPU detected."
    say "iHomeNerd can run on CPU, but it'll be like thinking through molasses."
    say "If you have a machine with a GPU, install there instead!"
    confirm_or_exit "Continue with CPU-only mode?"
fi

# ============================================================================
# Step 2: Docker
# ============================================================================
step "${PLUG} Checking Docker..."

if ! command -v docker &>/dev/null; then
    say "Docker not found. Let me install it for you..."
    say "(This is how all the cool AI projects run these days)"
    echo ""
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker "$USER"
    ok "Docker installed"
    warn "You may need to log out and back in for Docker access."
else
    ok "Docker is ready"
fi

if ! docker info &>/dev/null; then
    fail "Docker is installed but this shell cannot use it yet. Log out and back in, or run Docker with the right permissions, then re-run this installer."
fi

# Check Docker Compose
if ! docker compose version &>/dev/null; then
    fail "Docker Compose not available. Please update Docker."
fi
ok "Docker Compose is ready"

# nvidia-container-toolkit
if [[ -n "$GPU_NAME" ]]; then
    if ! command -v dpkg &>/dev/null || ! command -v apt-get &>/dev/null; then
        warn "NVIDIA GPU detected, but this installer only auto-configures GPU Docker support on Debian/Ubuntu."
        warn "Install nvidia-container-toolkit for your distro, then re-run with GPU support."
        GPU_NAME=""
        GPU_VRAM_MB=0
    elif ! dpkg -l nvidia-container-toolkit &>/dev/null 2>&1; then
        say "Installing NVIDIA container toolkit so Docker can use your GPU..."
        # Add NVIDIA container toolkit repo
        curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
            sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
        curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
            sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
            sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list > /dev/null
        sudo apt-get update -qq
        sudo apt-get install -y -qq nvidia-container-toolkit
        sudo nvidia-ctk runtime configure --runtime=docker
        sudo systemctl restart docker
        ok "NVIDIA container toolkit installed"
    else
        ok "NVIDIA container toolkit ready"
    fi
fi

# ============================================================================
# Step 3: Model selection based on usable Docker acceleration
# ============================================================================
step "${GEAR} Choosing the right brain size..."

MODELS_TO_PULL=()
if [[ $GPU_VRAM_MB -ge 16000 ]]; then
    say "16GB+ VRAM — you get the deluxe brain! Full power."
    MODELS_TO_PULL=("gemma4:e4b" "nomic-embed-text" "gemma4:e2b")
    MODEL_DESC="Gemma 4 (4B + 2B) + embeddings"
elif [[ $GPU_VRAM_MB -ge 8000 ]]; then
    say "8GB VRAM — solid choice. The workhorse configuration."
    MODELS_TO_PULL=("gemma4:e2b" "nomic-embed-text")
    MODEL_DESC="Gemma 4 (2B) + embeddings"
elif [[ $GPU_VRAM_MB -ge 4000 ]]; then
    say "4GB VRAM — compact but capable. Like a Swiss Army knife."
    MODELS_TO_PULL=("gemma3:1b" "nomic-embed-text")
    MODEL_DESC="Gemma 3 (1B) + embeddings"
else
    say "CPU mode — we'll use the lightest model. Be patient with it."
    MODELS_TO_PULL=("gemma3:1b")
    MODEL_DESC="Gemma 3 (1B) — lightweight"
fi

ok "Selected: ${MODEL_DESC}"

# ============================================================================
# Step 4: Download and start iHomeNerd
# ============================================================================
step "${HOUSE} Setting up the Nerd Cave..."

INSTALL_DIR="${IHN_INSTALL_DIR:-${HOME}/.ihomenerd}"
if [[ "$INSTALL_DIR" == "~/"* ]]; then
    INSTALL_DIR="${HOME}/${INSTALL_DIR#~/}"
elif [[ "$INSTALL_DIR" == "~" ]]; then
    INSTALL_DIR="${HOME}"
fi
REPO_REF="${IHN_REPO_REF:-main}"
ARCHIVE_URL="https://github.com/llm-case-studies/iHomeNerd/archive/refs/heads/${REPO_REF}.tar.gz"
HOME_CA_DIR="${INSTALL_DIR}/home-ca"
mkdir -p "$INSTALL_DIR"

# Download the repo archive so Docker has the real build context.
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

LAN_ROUTE=$(ip route get 1.1.1.1 2>/dev/null || true)
LAN_IP=$(printf '%s\n' "$LAN_ROUTE" | awk '{for (i=1; i<=NF; i++) if ($i == "src") { print $(i+1); exit }}')
if [[ -z "$LAN_IP" ]]; then
    LAN_IP=$(hostname -I | awk '{print $1}')
fi
LAN_IFACE=$(printf '%s\n' "$LAN_ROUTE" | awk '{for (i=1; i<=NF; i++) if ($i == "dev") { print $(i+1); exit }}')
LAN_SUBNET=""
if [[ -n "$LAN_IFACE" ]]; then
    LAN_SUBNET=$(ip route show dev "$LAN_IFACE" scope link 2>/dev/null | awk '$1 ~ /\// {print $1; exit}')
    if [[ -z "$LAN_SUBNET" ]]; then
        LAN_SUBNET=$(ip -o -f inet addr show dev "$LAN_IFACE" 2>/dev/null | awk '{print $4; exit}')
    fi
fi
HOST_SHORT=$(hostname -s 2>/dev/null || hostname)
HOST_FQDN=$(hostname -f 2>/dev/null || true)
HOSTNAME_LIST="$HOST_SHORT"
if [[ -n "$HOST_FQDN" && "$HOST_FQDN" != "$HOST_SHORT" ]]; then
    HOSTNAME_LIST="${HOSTNAME_LIST},${HOST_FQDN}"
fi
if [[ -n "$HOST_SHORT" && "$HOST_SHORT" != *.local ]]; then
    HOSTNAME_LIST="${HOSTNAME_LIST},${HOST_SHORT}.local"
fi
cat > "${INSTALL_DIR}/.env" <<EOF
IHN_CA_CERT_PATH=/authority/ca.crt
IHN_CA_KEY_PATH=/authority/ca.key
IHN_CERT_LAN_IP=${LAN_IP}
IHN_CERT_HOSTNAMES=${HOSTNAME_LIST}
IHN_LAN_IFACE=${LAN_IFACE}
IHN_LAN_SUBNET=${LAN_SUBNET}
EOF
ok "TLS identity prepared for ${LAN_IP} (${HOSTNAME_LIST})"

COMPOSE_FILES=(-f docker-compose.yml)
if [[ -n "$GPU_NAME" ]]; then
    COMPOSE_FILES+=(-f docker-compose.gpu.yml)
    ok "GPU compose profile enabled"
else
    ok "CPU compose profile enabled"
fi

# Start services
say "Building and starting Ollama and iHomeNerd..."
say "${COFFEE} This is a good time for a coffee. First pull takes a few minutes."
echo ""

cd "$INSTALL_DIR"
docker compose "${COMPOSE_FILES[@]}" pull ollama
docker compose "${COMPOSE_FILES[@]}" up -d --build

ok "Containers are running!"

# ============================================================================
# Step 5: Pull AI models
# ============================================================================
step "${BRAIN} Downloading AI models..."

say "The brain needs knowledge. Downloading models into Ollama..."
say "(These stay on your machine forever — one-time download)"
echo ""

for model in "${MODELS_TO_PULL[@]}"; do
    say "Pulling ${model}..."
    docker exec ihomenerd-ollama ollama pull "$model" 2>&1 | tail -1
    ok "${model} ready"
done

# Also pull Whisper and Kokoro if they're available as Ollama models
# (These are typically installed separately via the iHN backend)

# ============================================================================
# Step 6: Verify and open
# ============================================================================
step "${ROCKET} Almost there..."

# Wait for the brain to be ready
say "Waiting for the Brain to wake up..."
for i in $(seq 1 30); do
    if curl -sk https://localhost:17777/health &>/dev/null; then
        break
    fi
    sleep 2
done

# Verify
HEALTH=$(curl -sk https://localhost:17777/health 2>/dev/null || true)
if echo "$HEALTH" | grep -q '"ok":true'; then
    ok "iHomeNerd Brain is alive and thinking!"
else
    warn "Brain started but Ollama may still be loading models."
    warn "Give it a minute, then check https://localhost:17777"
fi

echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║                                                      ║${NC}"
echo -e "${BOLD}${GREEN}║   ${BRAIN}  iHomeNerd Brain is ready!                      ║${NC}"
echo -e "${BOLD}${GREEN}║                                                      ║${NC}"
echo -e "${BOLD}${GREEN}║   Local:   https://localhost:17777                    ║${NC}"
echo -e "${BOLD}${GREEN}║   LAN:     https://${LAN_IP}:17777$(printf '%*s' $((21 - ${#LAN_IP})) '')║${NC}"
echo -e "${BOLD}${GREEN}║                                                      ║${NC}"
echo -e "${BOLD}${GREEN}║   ${DIM}Your browser will warn about the self-signed${NC}${BOLD}${GREEN}     ║${NC}"
echo -e "${BOLD}${GREEN}║   ${DIM}certificate — that's normal, click 'Advanced'${NC}${BOLD}${GREEN}    ║${NC}"
echo -e "${BOLD}${GREEN}║   ${DIM}and 'Proceed' to continue.${NC}${BOLD}${GREEN}                       ║${NC}"
echo -e "${BOLD}${GREEN}║                                                      ║${NC}"
echo -e "${BOLD}${GREEN}║   Any device on your network can connect!             ║${NC}"
echo -e "${BOLD}${GREEN}║   Open the LAN URL on your phone, tablet, or laptop. ║${NC}"
echo -e "${BOLD}${GREEN}║                                                      ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
say "Commands:"
if [[ -n "$GPU_NAME" ]]; then
    COMPOSE_CMD="docker compose -f docker-compose.yml -f docker-compose.gpu.yml"
else
    COMPOSE_CMD="docker compose"
fi
echo -e "  ${DIM}Start:${NC}   cd ~/.ihomenerd && ${COMPOSE_CMD} up -d"
echo -e "  ${DIM}Stop:${NC}    cd ~/.ihomenerd && ${COMPOSE_CMD} down"
echo -e "  ${DIM}Logs:${NC}    cd ~/.ihomenerd && ${COMPOSE_CMD} logs -f"
echo -e "  ${DIM}Update:${NC}  cd ~/.ihomenerd && bash get-ihomenerd.sh"
echo ""

# Try to open browser
if [[ "${IHN_SKIP_OPEN:-0}" != "1" ]] && command -v xdg-open &>/dev/null; then
    xdg-open "https://localhost:17777" 2>/dev/null &
fi

say "Enjoy your new Brain! ${HOUSE}"
