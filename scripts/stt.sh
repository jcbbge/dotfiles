#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: stt.sh /path/to/audio-file" >&2
  exit 1
fi

AUDIO_PATH="$1"
MODEL_NAME="whisper-large-v3_turbo"
DOWNLOAD_PATH="$HOME/whisperkit-models"

if [[ ! -f "$AUDIO_PATH" ]]; then
  echo "Error: audio file not found: $AUDIO_PATH" >&2
  exit 1
fi

swift run whisperkit-cli transcribe \
  --audio-path "$AUDIO_PATH" \
  --model "$MODEL_NAME" \
  --download-model-path "$DOWNLOAD_PATH"
