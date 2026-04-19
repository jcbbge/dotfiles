# Belvedere Services — Single Source of Truth

Belvedere is a personal cognitive assistant with three persistent services.

---

## Service Architecture

| Service | Port | Purpose | Model |
|---------|------|---------|-------|
| **LLM Server** | 8800 | Inference | SuperGemma4-26B (MLX) |
| **TTS Server** | 7200 | Text-to-speech | CosyVoice3 + Summarization |
| **Memory** | 6000 | Persistent storage | SurrealDB (see SURREALDB.md) |

---

## LLM Server (Port 8800)

OpenAI-compatible inference server running MLX.

### Connection

```bash
# Environment variable
export OLLAMA_API_BASE=http://localhost:8800/v1

# Health check
curl http://localhost:8800/v1/models
```

### Python Connection

```python
import openai
client = openai.OpenAI(
    base_url="http://localhost:8800/v1",
    api_key="placeholder"  # not validated
)
```

### Service Management

```bash
# Check if running
launchctl list | grep belvedere.llm

# Start
launchctl start com.belvedere.llm-server

# Stop
launchctl stop com.belvedere.llm-server

# Logs
tail -f /tmp/belvedere-llm.log
```

### Configuration

- **Location:** `~/Library/LaunchAgents/com.belvedere.llm-server.plist`
- **Model:** Jiunsong/supergemma4-26b-uncensored-mlx-4bit-v2
- **Python:** `/Users/jrg/tts/.venv/bin/python`
- **Command:** `python -m mlx_lm.server --model <model> --port 8800`

---

## TTS Server (Port 7200)

Text-to-speech with automatic summarization for long inputs.

### Endpoint

```bash
POST http://localhost:7200/speak
Content-Type: application/json

{
  "text": "Your text here"
}
```

### Response

```json
{
  "success": true,
  "summary": "Short summary of what was spoken",
  "elapsed_ms": 4203
}
```

### Behavior

- **Short text (≤150 chars):** Speaks directly
- **Long text (>150 chars):** Summarizes using LLM first, then speaks
- **Voices:** david (default), charles
- **Speed:** 1.1x
- **Model:** CosyVoice3 (reference-based voice cloning)

### Service Management

```bash
# Check if running
launchctl list | grep belvedere.tts

# Start
launchctl start com.belvedere.tts-server

# Stop
launchctl stop com.belvedere.tts-server

# Logs
tail -f /tmp/belvedere-tts-server.log
```

### Configuration

- **Location:** `~/Library/LaunchAgents/com.belvedere.tts-server.plist`
- **Script:** `/Users/jrg/belvedere/services/tts-server.py`
- **Python:** `/Users/jrg/tts/.venv/bin/python3`
- **Working Dir:** `/Users/jrg/belvedere/services`

---

## Memory System

Belvedere uses SurrealDB on port 6000. See [SURREALDB.md](./SURREALDB.md).

### Schema

- **Namespace:** `belvedere`
- **Database:** `belvedere`
- **Tables:**
  - `heartprints` — Emotional context (60% weight)
  - `entities` — People, projects, concepts (30% weight)
  - `patterns` — What's worked before (10% weight)
  - `relates_to` — Entity relationships

### Python Connection

```python
from surrealdb import Surreal

db = Surreal("ws://127.0.0.1:6000/rpc")
db.signin({"username": "root", "password": "surreal"})
db.use("belvedere", "belvedere")

# Query heartprints
heartprints = db.query("""
    SELECT * FROM heartprints
    WHERE resonance > 0.7
    ORDER BY resonance DESC
    LIMIT 5
""")
```

---

## CLI Usage

```bash
# Run Belvedere
belvedere

# With specific message
echo "your message" | belvedere --print

# No session saving
belvedere --no-session
```

### Environment Variables

The `belvedere` script automatically sets:

```bash
PI_CODING_AGENT_DIR=/Users/jrg/belvedere/.pi/agent
OLLAMA_API_BASE=http://localhost:8800/v1
```

---

## Pi Extension

Belvedere includes a TTS extension that hooks into Pi's `message_end` event.

**Location:** `/Users/jrg/belvedere/.pi/agent/extensions/tts.ts`

**Behavior:**
- Triggers on every assistant message
- Strips ANSI codes and `<think>` tags
- Calls TTS server (non-blocking)
- Silent on failure (doesn't interrupt agent)

**Installation:**
```bash
pi install /Users/jrg/belvedere/.pi/agent/extensions/tts.ts -l
```

---

## Troubleshooting

### LLM Server won't start

```bash
# Check if port is in use
lsof -i :8800

# Check Python environment
/Users/jrg/tts/.venv/bin/python -m mlx_lm.server --help

# Verify model is downloaded
ls -lh ~/.cache/huggingface/hub/models--Jiunsong--*
```

### TTS Server errors

```bash
# Check logs for model loading issues
tail -100 /tmp/belvedere-tts-server.log

# Test direct call
curl -X POST http://localhost:7200/speak \
  -H "Content-Type: application/json" \
  -d '{"text":"test"}'
```

### Memory not working

```bash
# Verify SurrealDB is running
curl http://localhost:6000/health

# Check namespace/database
echo "INFO FOR ROOT;" | surreal sql \
  --endpoint http://127.0.0.1:6000 \
  --username root --password surreal
```

---

## Port Assignment Rationale

- **8800:** LLM inference range (8800-8899)
- **7200:** AI services range (7200-7299)
- **6000:** Database range (6000-6099)

See [PORTS.md](../PORTS.md) for full registry.

---

*Last updated: 2026-04-19*
