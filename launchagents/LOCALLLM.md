# Local LLM — Single Source of Truth

**System-level LLM inference for any project on this machine.**

Independent of any one project. Plug-and-play. Always-on at login. If a project, script, workflow, agent, or pipeline needs local LLM inference for any purpose — embeddings, categorization, summarization, classification, light reasoning — it points here.

> Belvedere has its own LLM server (`com.belvedere.llm-server`, port 8800). That is project-specific. **This** (`com.localllm.server`, port 10240) is the system service. Do not conflate the two.

---

## Connection Details

| Key | Value |
|-----|-------|
| **Host** | `127.0.0.1` |
| **Port** | `10240` |
| **Base URL** | `http://127.0.0.1:10240/v1` |
| **API style** | OpenAI-compatible (`/v1/chat/completions`, `/v1/embeddings`, `/v1/models`, `/v1/audio/*`, `/v1/images/*`) |
| **API key** | not validated (any non-empty string) |
| **Engine** | [`mlx-omni-server`](https://github.com/madroidmaq/mlx-omni-server) on Apple Silicon MLX |

---

## Use this for

- **Text embeddings** — semantic search, RAG, vector indexes
- **Categorization / tagging** — auto-classify documents, ingredients, items
- **Summarization** — long-form → short-form
- **Light reasoning** — simple decisions, structured-output extraction (JSON, schemas)
- **Speech** — TTS via `/v1/audio/speech`, transcription via `/v1/audio/transcriptions`
- **Image generation** — Flux-series via `/v1/images/generations`

## Do NOT use this for (yet)

- **Heavy code generation** — the on-disk models are 8B class; use a real coding agent for serious code work
- **Long-form reasoning chains** — small reasoning models burn context fast
- **Latency-critical hot paths** — first-call cold-start can be 1–3s while a model loads
- **Concurrent multi-user serving** — single-process FastAPI; one heavy generation at a time

If your workload outgrows this, run your own dedicated server. Don't make this one bigger.

---

## Available Models

mlx-omni-server auto-discovers MLX-format models in `~/.cache/huggingface/hub/`. Hit `/v1/models` for the live list.

**Currently on disk:**

| Model ID | Purpose |
|---|---|
| `mlx-community/Qwen3-8B-4bit` | General-purpose chat, structured output, light reasoning |
| `mlx-community/Qwen2.5-3B-Instruct-4bit` | Fast/cheap chat, tagging, classification |
| `mlx-community/Qwen3-Embedding-4B-4bit-DWQ` | Text embeddings (2560-dim) |
| `lightonai/LateOn-Code-edge` | Code-edge retrieval embedding |

To add a model: download/convert to MLX format into the HF cache, then it's auto-discovered on the next request. No restart required.

---

## Environment Variables

Recommended exports for any project that consumes the system LLM:

```bash
export LOCAL_LLM_BASE_URL=http://127.0.0.1:10240/v1
export LOCAL_LLM_API_KEY=local
export LOCAL_LLM_CHAT_MODEL=mlx-community/Qwen3-8B-4bit
export LOCAL_LLM_EMBEDDING_MODEL=mlx-community/Qwen3-Embedding-4B-4bit-DWQ
```

Project-specific projects (e.g. strudel) may override via their own env vars (`STRUDEL_LLM_BASE_URL`, `OLLAMA_API_BASE`, etc.) but should default to the system endpoint when unset.

---

## CLI Connection

```bash
# Health check
curl http://127.0.0.1:10240/v1/models | jq

# Chat completion
curl -X POST http://127.0.0.1:10240/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mlx-community/Qwen3-8B-4bit",
    "messages": [{"role": "user", "content": "Reply with: OK"}],
    "max_tokens": 32
  }'

# Embedding
curl -X POST http://127.0.0.1:10240/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mlx-community/Qwen3-Embedding-4B-4bit-DWQ",
    "input": "the quick brown fox"
  }'
```

---

## Python Connection

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://127.0.0.1:10240/v1",
    api_key="local",  # not validated
)

# Chat
resp = client.chat.completions.create(
    model="mlx-community/Qwen3-8B-4bit",
    messages=[{"role": "user", "content": "Summarize: ..."}],
    max_tokens=512,
)

# Embedding
emb = client.embeddings.create(
    model="mlx-community/Qwen3-Embedding-4B-4bit-DWQ",
    input="quick brown fox",
)
vector = emb.data[0].embedding  # 2560-dim
```

---

## Node / TypeScript Connection

```typescript
const baseUrl = process.env.LOCAL_LLM_BASE_URL ?? "http://127.0.0.1:10240/v1";

const r = await fetch(`${baseUrl}/embeddings`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "mlx-community/Qwen3-Embedding-4B-4bit-DWQ",
    input: "quick brown fox",
  }),
});
const { data } = await r.json();
const vector = data[0].embedding;
```

---

## Reasoning-model gotcha

Qwen3 family models emit `<think>...</think>` blocks before answering. If your call uses a small `max_tokens` budget, the entire response may be consumed by the chain-of-thought. Two coping strategies:

1. **Bump max_tokens** — give the model 1024+ tokens for reasoning + answer.
2. **Strip thinking blocks** — `text.replace(/<think>[\s\S]*?<\/think>/g, "")` before parsing structured output.

Both at once is fine.

---

## Service Management

```bash
# Status
launchctl list com.localllm.server

# Start (if RunAtLoad missed for some reason)
launchctl start com.localllm.server

# Stop (this session only)
launchctl stop com.localllm.server

# Restart (pick up plist edits)
launchctl bootout gui/$(id -u)/com.localllm.server
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.localllm.server.plist

# Logs
tail -f /Users/jrg/local-llm/logs/llm.log
tail -f /Users/jrg/local-llm/logs/llm-error.log
```

---

## Launchctl Config

Location: `~/Library/LaunchAgents/com.localllm.server.plist` (mirrored in this repo at `launchagents/com.localllm.server.plist`).

- Starts on login (`RunAtLoad: true`)
- Binds to `127.0.0.1:10240`
- Runs `mlx-omni-server` from `/Users/jrg/local-llm/venv/` (Python 3.11)
- Inherits `HF_HUB_OFFLINE=1` and `TRANSFORMERS_OFFLINE=1` so it never reaches out at runtime

---

## Disk Layout

```
/Users/jrg/local-llm/
├── venv/              uv-managed Python 3.11 venv with mlx-omni-server
└── logs/
    ├── llm.log        stdout (request/response logging)
    └── llm-error.log  stderr (startup, model loading, errors)
```

---

## Why These Values?

- **Port 10240:** mlx-omni-server's own default; clean of the 3000/4000/5000/6000/7000/8000/8800/9000/11434 ranges already claimed by other services.
- **Engine choice (mlx-omni-server):** Pure MLX (Apple Silicon optimal), single process, full OpenAI surface (chat + embeddings + audio + images), auto-discovers HF cache models, MIT-licensed, actively maintained.

---

## If you see another LLM port anywhere

It's probably **a project's** server, not the system one. The system LLM lives at **`http://127.0.0.1:10240/v1`** and only there. Common project ports to avoid colliding with:

- `8800` — Belvedere LLM (project-specific, see [BELVEDERE.md](./BELVEDERE.md))
- `7200` — Belvedere TTS (project-specific)
- `11434` — Ollama (if running, project-specific)

---

*Last updated: 2026-05-13*
