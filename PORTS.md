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
| 8800–8899   | LLM inference servers            |
| 9000–9099   | Docker / compose stacks          |
| 11434       | Ollama (upstream default)        |

---

## Registry

| Port  | Service      | How it starts                        | Notes                        |
|-------|--------------|--------------------------------------|------------------------------|
| 3000  | web dev      | `bun dev` / `npm dev`                | default for SolidJS, Vite    |
| 4000  | web dev alt  | varies                               | secondary app / API          |
| 5432  | Postgres     | varies                               | standard — do not reassign   |
| 6000  | SurrealDB    | launchd `com.surrealdb.server.plist` | persistent, auto-start. was :8002 |
| 7200  | Belvedere TTS | launchd `com.belvedere.tts-server.plist` | CosyVoice3 TTS with summarization |
| 8800  | Belvedere LLM | launchd `com.belvedere.llm-server.plist` | MLX SuperGemma4-26B inference |
| 11434 | Ollama       | `ollama serve`                       | upstream default, leave it   |

---

## Active Services

| Port | Service | How it starts | Notes |
|------|---------|--------------|-------|
| 6000 | SurrealDB | launchd | persistent memory store |
| 7200 | Belvedere TTS | launchd | text-to-speech (CosyVoice3) |
| 8800 | Belvedere LLM | launchd | SuperGemma4-26B inference |
| 11434 | Ollama | launchd | local AI models |

---

## Adding a new service

1. Pick a port in the right range above
2. Add a row to the registry
3. Start the service on that port
