#!/usr/bin/env bash
set -euo pipefail

VENV_PATH="$HOME/ai-env/bin/activate"
MODEL_PATH="$HOME/kokoro-models/kokoro-v1.0.onnx"
VOICES_PATH="$HOME/kokoro-models/voices-v1.0.bin"
VOICE="af_bella"
LANG="en-us"

if [[ ! -f "$VENV_PATH" ]]; then
  echo "Error: missing virtualenv activation script at $VENV_PATH" >&2
  exit 1
fi

if [[ ! -f "$MODEL_PATH" ]]; then
  echo "Error: missing Kokoro model at $MODEL_PATH" >&2
  exit 1
fi

if [[ ! -f "$VOICES_PATH" ]]; then
  echo "Error: missing Kokoro voices file at $VOICES_PATH" >&2
  exit 1
fi

if [[ $# -gt 0 ]]; then
  TEXT="$*"
elif [[ ! -t 0 ]]; then
  TEXT="$(cat)"
else
  echo "Usage: tts.sh \"text to speak\"  OR  echo \"text\" | tts.sh" >&2
  exit 1
fi

if [[ -z "${TEXT//[[:space:]]/}" ]]; then
  echo "Error: no text provided" >&2
  exit 1
fi

source "$VENV_PATH"

python -m kokoro_onnx \
  --model "$MODEL_PATH" \
  --voices "$VOICES_PATH" \
  --voice "$VOICE" \
  --lang "$LANG" \
  "$TEXT"
