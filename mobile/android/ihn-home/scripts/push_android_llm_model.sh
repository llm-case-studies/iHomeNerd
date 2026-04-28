#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  cat <<'EOF'
Usage:
  push_android_llm_model.sh /path/to/model.litertlm [device_dir]

Pushes a local Gemma LiteRT-LM or .task model into the iHN Android app's
expected llm directory on the attached device.

Default device directory:
  /sdcard/Android/data/com.ihomenerd.home/files/llm
EOF
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ADB="${ADB:-/media/alex/LargeStorage/Projects/iHomeNerd/mobile/android/toolchain/android-sdk/platform-tools/adb}"
MODEL_PATH="$1"
DEVICE_DIR="${2:-/sdcard/Android/data/com.ihomenerd.home/files/llm}"

if [[ ! -f "$MODEL_PATH" ]]; then
  echo "Model file not found: $MODEL_PATH" >&2
  exit 1
fi

MODEL_NAME="$(basename "$MODEL_PATH")"

"$ADB" shell mkdir -p "$DEVICE_DIR"
"$ADB" push "$MODEL_PATH" "$DEVICE_DIR/$MODEL_NAME"

cat <<EOF
Pushed:
  $MODEL_PATH

To:
  $DEVICE_DIR/$MODEL_NAME

Next steps:
  1. Reload or restart iHN Home on Android.
  2. Load the 'Android Gemma Chat Local' pack in the Models screen if needed.
  3. Open https://<phone-ip>:17777 and test Chat / Talk again.
EOF
