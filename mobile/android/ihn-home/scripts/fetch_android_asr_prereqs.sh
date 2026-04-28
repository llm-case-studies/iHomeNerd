#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LIBS_DIR="$ROOT_DIR/app/libs"
CACHE_DIR="$ROOT_DIR/app/src/main/assets/asr-cache"
MODELS_DIR="$ROOT_DIR/app/src/main/assets/asr-models"

SHERPA_VERSION="${SHERPA_VERSION:-1.12.40}"
SHERPA_AAR="sherpa-onnx-${SHERPA_VERSION}.aar"
SHERPA_AAR_URL="https://github.com/k2-fsa/sherpa-onnx/releases/download/v${SHERPA_VERSION}/${SHERPA_AAR}"

download_if_missing() {
  local url="$1"
  local output="$2"
  if [[ -f "$output" ]]; then
    echo "Using existing $(basename "$output")"
    return
  fi
  echo "Downloading $(basename "$output")"
  curl -L --fail -o "$output" "$url"
}

extract_tar_dir() {
  local archive="$1"
  local target_dir="$2"
  mkdir -p "$target_dir"
  tar -xjf "$archive" --strip-components=1 -C "$target_dir"
}

mkdir -p "$LIBS_DIR" "$CACHE_DIR" "$MODELS_DIR"

download_if_missing "$SHERPA_AAR_URL" "$LIBS_DIR/$SHERPA_AAR"
download_if_missing \
  "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-moonshine-base-en-quantized-2026-02-27.tar.bz2" \
  "$CACHE_DIR/moonshine-base-en.tar.bz2"
download_if_missing \
  "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-moonshine-base-es-quantized-2026-02-27.tar.bz2" \
  "$CACHE_DIR/moonshine-base-es.tar.bz2"

extract_tar_dir "$CACHE_DIR/moonshine-base-en.tar.bz2" "$MODELS_DIR/moonshine-base-en"
extract_tar_dir "$CACHE_DIR/moonshine-base-es.tar.bz2" "$MODELS_DIR/moonshine-base-es"

echo "Sherpa Android ASR prerequisites are ready."
