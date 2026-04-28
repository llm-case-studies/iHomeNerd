#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${IHN_VM_OUT:-${ROOT_DIR}/vm/out}"
BASE_URL="${IHN_UBUNTU_CLOUD_IMAGE_URL:-https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img}"
BASE_IMG="${OUT_DIR}/ubuntu-noble-server-cloudimg-amd64.img"
DISK_IMG="${OUT_DIR}/ihomenerd-trial.qcow2"
SEED_ISO="${OUT_DIR}/ihomenerd-seed.iso"
DISK_SIZE="${IHN_VM_DISK_SIZE:-40G}"
REPO_REF="${IHN_REPO_REF:-main}"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

need curl
need qemu-img
need cloud-localds

mkdir -p "$OUT_DIR"

if [[ ! -f "$BASE_IMG" ]]; then
  echo "Downloading Ubuntu cloud image..."
  curl -fL "$BASE_URL" -o "$BASE_IMG"
fi

USER_DATA="${OUT_DIR}/user-data"
REPO_REF_ESCAPED="${REPO_REF//\\/\\\\}"
REPO_REF_ESCAPED="${REPO_REF_ESCAPED//&/\\&}"
REPO_REF_ESCAPED="${REPO_REF_ESCAPED//|/\\|}"
sed "s|__IHN_REPO_REF__|${REPO_REF_ESCAPED}|g" "${ROOT_DIR}/vm/cloud-init/user-data" > "$USER_DATA"

echo "Creating cloud-init seed ISO..."
cloud-localds "$SEED_ISO" "$USER_DATA" "${ROOT_DIR}/vm/cloud-init/meta-data"

echo "Creating qcow2 overlay..."
rm -f "$DISK_IMG"
qemu-img create -f qcow2 -F qcow2 -b "$BASE_IMG" "$DISK_IMG" "$DISK_SIZE"

cat <<EOF

Built:
  $DISK_IMG
  $SEED_ISO

Example QEMU boot command:

qemu-system-x86_64 \\
  -m 8192 -smp 4 \\
  -drive file="$DISK_IMG",if=virtio \\
  -drive file="$SEED_ISO",if=virtio,readonly=on \\
  -netdev user,id=n0,hostfwd=tcp::17777-:17777,hostfwd=tcp::17778-:17778 \\
  -device virtio-net-pci,netdev=n0 \\
  -nographic

Then open:
  https://localhost:17777
  http://localhost:17778/setup

EOF
