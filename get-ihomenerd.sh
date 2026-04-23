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
    warn "macOS support: brew install ihomenerd (coming soon)"
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
    read -p "   Continue anyway? (y/N) " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]] || exit 1
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
    read -p "   Continue with CPU-only mode? (y/N) " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]] || exit 1
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

INSTALL_DIR="${HOME}/.ihomenerd"
REPO_REF="${IHN_REPO_REF:-main}"
ARCHIVE_URL="https://github.com/llm-case-studies/iHomeNerd/archive/refs/heads/${REPO_REF}.tar.gz"
mkdir -p "$INSTALL_DIR"

# Download the repo archive so Docker has the real build context.
say "Downloading iHomeNerd ${REPO_REF}..."
curl -fsSL "$ARCHIVE_URL" | tar -xz --strip-components=1 -C "$INSTALL_DIR"

ok "iHomeNerd files saved to ${INSTALL_DIR}/"

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

# Get the LAN IP
LAN_IP=$(hostname -I | awk '{print $1}')

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
if command -v xdg-open &>/dev/null; then
    xdg-open "https://localhost:17777" 2>/dev/null &
fi

say "Enjoy your new Brain! ${HOUSE}"
