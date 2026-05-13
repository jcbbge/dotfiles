# Port Registry

One source of truth for every port in the dev environment.
When you add a new service, add it here first.

## Convention

| Range       | Purpose                          |
|-------------|----------------------------------|
| 3000–3099   | Local web dev (SolidJS, Hono…)   |
| 4000–4099   | Secondary / staging / test       |
| 5432        | Postgres (standard)              |
| 6000–6099   | Databases & data services        |
| 7000–7099   | MCP servers                      |
| 7200–7299   | AI services (TTS, embeddings…)   |
| 8000–8099   | Misc / legacy / docker-exposed   |
| 8800–8899   | Project-specific LLM servers     |
| 9000–9099   | Docker / compose stacks          |
| 10240       | System LLM (mlx-omni-server)     |
| 11434       | Ollama (upstream default)        |

---

## Registry

| Port  | Service          | Tier    | How it starts                        | Notes                                  |
|-------|------------------|---------|--------------------------------------|----------------------------------------|
| 3000  | web dev          | project | `bun dev` / `npm dev`                | default for SolidJS, Vite              |
| 4000  | web dev alt      | project | varies                               | secondary app / API                    |
| 5432  | Postgres         | system  | varies                               | standard — do not reassign             |
| 6000  | SurrealDB        | system  | launchd `com.surrealdb.server.plist` | persistent, auto-start. was :8002      |
| 7200  | Belvedere TTS    | project | launchd `com.belvedere.tts-server.plist` | CosyVoice3 TTS with summarization  |
| 8800  | Belvedere LLM    | project | launchd `com.belvedere.llm-server.plist` | MLX SuperGemma4-26B inference      |
| 10240 | System LLM       | system  | launchd `com.localllm.server.plist`  | mlx-omni-server, OpenAI-compat. See LOCALLLM.md |
| 11434 | Ollama           | project | `ollama serve`                       | upstream default, leave it             |

**Tier:**
- **system** — global, plug-and-play, every project on this machine connects to these. Touch only via dotfiles.
- **project** — owned by a specific project. May come and go. Don't depend on these from another project.

---

## Active Services

| Port  | Service       | Tier    | How it starts | Notes                                       |
|-------|---------------|---------|---------------|---------------------------------------------|
| 6000  | SurrealDB     | system  | launchd       | persistent memory store — see SURREALDB.md  |
| 7200  | Belvedere TTS | project | launchd       | text-to-speech (CosyVoice3)                 |
| 8800  | Belvedere LLM | project | launchd       | SuperGemma4-26B inference                   |
| 10240 | System LLM    | system  | launchd       | embeddings + chat + audio + image — see LOCALLLM.md |
| 11434 | Ollama        | project | launchd       | local AI models                             |

---

## Adding a new service

1. Pick a port in the right range above
2. Add a row to the registry
3. Start the service on that port
