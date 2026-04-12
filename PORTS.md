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
| 8000–8099   | Misc / legacy / docker-exposed   |
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
| 11434 | Ollama       | `ollama serve`                       | upstream default, leave it   |

---

## MCP Servers (7000–7099)

| Port  | Server       | How it starts | Notes |
|-------|--------------|---------------|-------|
| —     | (none yet)   | —             | add here as you wire them up |

---

## Adding a new service

1. Pick a port in the right range above
2. Add a row to the registry
3. Start the service on that port
