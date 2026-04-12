# AI Stack Notes

## Python
- Use `pyenv` Python 3.11.9 in `~/ai-env/` virtual environment.
- ML packages currently do not provide wheels for Python 3.14.

## WhisperKit
- Models download on first transcription run.
- Invocation:

```bash
swift run whisperkit-cli transcribe \
  --audio-path FILE \
  --model whisper-large-v3_turbo \
  --download-model-path ~/whisperkit-models
```

## Kokoro v1.0
- Model file: `~/kokoro-models/kokoro-v1.0.onnx`
- Voices file: `~/kokoro-models/voices-v1.0.bin`
- Activate the virtual environment before running Kokoro:

```bash
source ~/ai-env/bin/activate
```

## Model Sizes
- `qwen3:8b`: ~5GB
- `mxbai-embed-large`: ~670MB
- `whisper`: ~3GB
- `kokoro`: ~350MB
- Total: ~9GB
