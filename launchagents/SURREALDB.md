# SurrealDB — Single Source of Truth

**System-level data store for any project on this machine.**

Independent of any one project. Plug-and-play. Always-on at login. If a project, script, workflow, agent, or pipeline needs to store *anything* — records, documents, graph relationships, vector embeddings, time-series, audit logs — it points here.

> **DO NOT CHANGE THE CONNECTION VALUES.** They are defined in `~/.zshrc` and this launchctl plist. Every project on this machine depends on them.

---

## Use this for

SurrealDB is the **all-encompassing** data substrate. One server, one binary, one connection, every shape of data:

- **Documents** — schemaless or schemafull JSON-style records (`SELECT`, `UPSERT`, `CONTENT`)
- **Relational rows** — fields, indexes, constraints (Postgres-style queries when you need them)
- **Graphs / DAGs** — first-class edges (`RELATE`, multi-hop traversals, recursive queries)
- **Vector embeddings** — HNSW indexes, `vector::similarity::cosine`, hybrid semantic + lexical search
- **Time-series / event streams** — append-only tables with ordered scans
- **Audit logs** — immutable record history when paired with append-only discipline

If you find yourself reaching for SQLite, Postgres, Redis, ChromaDB, Qdrant, Neo4j, or any vendor-specific data store *just because* — stop. Use Surreal first.

## Tenancy

Every project gets its **own namespace**. Cross-namespace queries are not allowed; this is the strongest isolation boundary Surreal offers.

| Namespace | Project |
|---|---|
| `belvedere` | Belvedere agent (heartprints, entities, patterns) |
| `strudel` | Strudel bakery (`db=bakery`: ingredient, cupboard) |
| `arc` | Arc event-sales platform (when migrated) |
| `<your-project>` | Pick a slug, claim it, document it in your project's README |

Within a namespace you may carve out multiple databases (`db=bakery`, `db=oven`, `db=...`). Pick a discipline that matches the project shape.

---

## Connection Details

| Key | Value |
|-----|-------|
| **Host** | `127.0.0.1` |
| **Port** | `6000` |
| **URL (WebSocket)** | `ws://127.0.0.1:6000/rpc` |
| **URL (HTTP)** | `http://127.0.0.1:6000` |
| **Username** | `root` |
| **Password** | `surreal` |

---

## Environment Variables (in ~/.zshrc)

```bash
export SURREAL_URL=ws://127.0.0.1:6000/rpc
export SURREAL_USER=root
export SURREAL_PASS=surreal
```

---

## CLI Connection

```bash
# Interactive SQL shell
surreal sql --endpoint $SURREAL_URL \
  --namespace <ns> --database <db> \
  --username $SURREAL_USER --password $SURREAL_PASS

# Piped query
echo "INFO FOR DB;" | \
  surreal sql --endpoint http://127.0.0.1:6000 \
  --namespace <ns> --database <db> \
  --username root --password surreal
```

---

## Python Connection

```python
import os
from surrealdb import Surreal

async def connect(namespace: str, database: str):
    db = Surreal("ws://127.0.0.1:6000/rpc")
    await db.connect()
    await db.signin({
        "username": os.environ.get("SURREAL_USER", "root"),
        "password": os.environ.get("SURREAL_PASS", "surreal")
    })
    await db.use(namespace, database)
    return db
```

---

## Service Management

```bash
# Check if running
pgrep -lf surreal

# Start
launchctl start com.surrealdb.server

# Stop
launchctl stop com.surrealdb.server

# Logs
tail -f ~/surreal/logs/surreal.log
tail -f ~/surreal/logs/surreal-error.log
```

---

## Launchctl Config

Location: `~/Library/LaunchAgents/com.surrealdb.server.plist`

- Starts on login (RunAtLoad: true)
- Binds to `127.0.0.1:6000`
- Data stored in `rocksdb:///Users/jrg/surreal/data`

---

## Why These Values?

- **Port 6000:** Chosen to avoid conflicts with common ports (8000, 8080, etc.)
- **Password "surreal":** Easy to remember, local-only so security is not critical

---

## If You See Port 8000 Anywhere

**It's wrong.** Fix it to 6000. The only correct port is 6000.

Common mistakes:
- `http://localhost:8000` — WRONG
- `ws://127.0.0.1:8000/rpc` — WRONG
- `--password root` — WRONG (password is `surreal`)

---

*Last updated: 2026-04-17*
