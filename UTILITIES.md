# System Utilities — What's Always Available on This Machine

The plug-and-play infrastructure every project on this machine can rely on. If you (or an agent acting on your behalf) need any of these capabilities, **do not provision your own**. Connect to the system service.

> If a project depends on its own private database, its own LLM server, etc., that's a project decision — but it's almost always wrong. Use the system tier first.

---

## Quick reference

| Need | Use this | Endpoint | Single source of truth |
|---|---|---|---|
| **Store anything** (records, documents, graphs, embeddings, time-series, audit logs) | SurrealDB | `http://127.0.0.1:6000` (HTTP), `ws://127.0.0.1:6000/rpc` (WS) | [`launchagents/SURREALDB.md`](./launchagents/SURREALDB.md) |
| **Local LLM inference** (embeddings, categorization, summarization, light reasoning, TTS, image gen) | mlx-omni-server | `http://127.0.0.1:10240/v1` (OpenAI-compatible) | [`launchagents/LOCALLLM.md`](./launchagents/LOCALLLM.md) |

Both are launchd-managed, RunAtLoad, restart-resilient. No project needs to start them.

---

## SurrealDB — the all-encompassing data substrate

**Use it for everything that needs persistence**, regardless of shape:

- Document store, relational rows, graph edges, vector embeddings, time-series, audit logs — one engine, one connection, one query language.
- Each project gets its own **namespace** (`belvedere`, `strudel`, `arc`, …). That's the tenant boundary.
- Within a namespace, carve out databases (`db=bakery`, `db=oven`, …) as needed.
- If you find yourself spinning up SQLite, Postgres, Redis, Chroma, Qdrant, Neo4j, etc. *just because* — stop. Use Surreal.

```bash
# Quick health check
curl http://127.0.0.1:6000/health
```

Full reference: [`launchagents/SURREALDB.md`](./launchagents/SURREALDB.md).

---

## Local LLM — the all-purpose inference utility

**Use it for any LLM workload that doesn't need a frontier model**:

- Text embeddings (semantic search, RAG, vector indexes)
- Categorization, classification, tagging
- Summarization (long → short)
- Structured-output extraction (JSON, schemas)
- Light reasoning (simple decisions, transformations)
- TTS via `/v1/audio/speech`, transcription via `/v1/audio/transcriptions`
- Image generation via `/v1/images/generations`

**Do NOT use it for:** heavy code generation, long reasoning chains, latency-critical hot paths, concurrent multi-user serving. For those, use a real coding agent or a dedicated server.

```bash
# Quick health check
curl http://127.0.0.1:10240/v1/models | jq
```

Full reference: [`launchagents/LOCALLLM.md`](./launchagents/LOCALLLM.md).

---

## Project vs. system

Some projects (e.g. Belvedere) run their **own** LLM / TTS / data services on different ports. Those are project-private. Don't import them from another project. The system services on this index are the only safe cross-project endpoints.

The full port-by-port breakdown lives in [`PORTS.md`](./PORTS.md).

---

## Adding a new system utility

If you find yourself standing up infrastructure across multiple projects, promote it to the system tier:

1. Write the launchd plist into `~/Library/LaunchAgents/com.<name>.server.plist` (RunAtLoad: true).
2. Mirror the plist into `launchagents/com.<name>.server.plist`.
3. Write a `launchagents/<NAME>.md` doc following the SURREALDB.md / LOCALLLM.md template.
4. Add a row to `PORTS.md` (tier = system) and to this file.
5. `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.<name>.server.plist`.

---

*Last updated: 2026-05-13*
