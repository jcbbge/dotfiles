# AGENTS.md — Global Agent Context
**Updated:** 2026-04-17

This file is loaded by every harness (Claude Code, OpenCode, Pi) as global context.
It describes the actual current tooling stack. Do not guess — use what is documented here.

---

## Stack Reality

| Tool | Status | How to access |
|------|--------|---------------|
| KotaDB | **active** | MCP stdio — `mcp__kotadb__<tool>` |
| Coraline | **active** | MCP stdio — `coraline_*` (33 languages incl. Rust, Zig, Python, Swift) |
| Substrate | **active** | MCP tools — `mcp__substrate__*` |
| Composto | **active** | CLI — `/opt/homebrew/bin/composto` |
| Executor | **REMOVED** | Does not exist. Never reference it. |
| Anima | **REMOVED** | Does not exist. Never reference it. |
| Dev-Brain | **REMOVED** | Does not exist. Never reference it. |
| SurrealDB | **REMOVED** | Does not exist. Never reference it. |

---

## Search Tool Priority — 4-Layer Routing

Route before you reach for `Grep` or `Read`:

| Layer | Tool | When |
|-------|------|------|
| **1 — colgrep** | `colgrep` (Bash) | Project source — "what does X do in this repo?" Semantic + hybrid. |
| **2 — KotaDB** | `mcp__kotadb__search` et al. | JS/TS libraries, dependencies, cross-repo, symbol graphs, "what breaks if…" |
| **3 — Coraline** | `coraline_*` (MCP) | Rust, Zig, Python, Swift, Go, C/C++ — structural AST search, callers, callees, impact. |
| **4 — ripgrep** | `Grep` tool | Exact regex, literal verification, fallback. |

**Auto-route heuristics:**
- JS/TS dependency question → **KotaDB first**
- Rust/Zig/Python/Swift/Go/C project → **Coraline first**
- Regex or exact literal pattern → **ripgrep first**
- Everything else → **colgrep first**

**Never jump to `Read` on a library file. Use KotaDB (JS/TS) or Coraline (Rust/Zig/etc).**

---

## KotaDB — Code Intelligence

**KotaDB is the primary reference manual for all external libraries and packages.** It is live source-code documentation — not a search engine. When you need to understand how a library works, query KotaDB first.

**What:** Structural code analysis. Indexes repos at the AST level — symbols, references, dependencies.
**DB:** `~/.kotadb/kota.db` (SQLite, fixed path)
**MCP config:** `~/.claude/mcp.json` — auto-started by Claude Code via stdio.

### `~/source/` — Canonical clone location for KotaDB repos

All repos intended for KotaDB indexing live in `~/source/`. When a library is needed and not indexed:
1. `git clone <repo> ~/source/<name>`
2. `mcp__kotadb__index_repository { repository: "owner/repo", localPath: "/Users/jrg/source/<name>" }`
3. Query via KotaDB

Never read `~/source/` files directly — index them and query through KotaDB.

### When to use KotaDB

| You want to... | Tool |
|----------------|------|
| Find every call site of a function | `mcp__kotadb__find_usages` |
| Know what a file depends on | `mcp__kotadb__search_dependencies` |
| Know what breaks if you change a file | `mcp__kotadb__analyze_change_impact` |
| Search code by meaning, not pattern | `mcp__kotadb__search` |
| Get full context for a task (deps + tests) | `mcp__kotadb__generate_task_context` |
| Check what's indexed | `mcp__kotadb__get_index_statistics` |
| Index a new repo | `mcp__kotadb__index_repository` |
| Record an architectural decision | `mcp__kotadb__record_decision` |
| Record a dead end / failed approach | `mcp__kotadb__record_failure` |
| Record a pattern or insight | `mcp__kotadb__record_insight` |

### Indexed repos

| Repo | Local path |
|------|-----------|
| `solidjs/solid` | `~/source/solid` |
| `ziglang/zig` (JS/TS only — .zig not supported) | `~/source/zig` |

### Exact tool signatures (required params)

```
search                  query (string), scope? (auto|project|deps|exact), limit? (int)
search_dependencies     file_path (string), direction? (dependents|dependencies), depth? (int)
find_usages             symbol (string), file? (string)
analyze_change_impact   files_to_modify? (array), change_type (feature|refactor|fix|chore), description? (string)
record_decision         title, context, decision (all strings)
record_failure          title, problem, approach, failure_reason (all strings)
record_insight          content (string), insight_type (string)
index_repository        repository (string, e.g. "owner/repo"), localPath (string, absolute)
```

### Session protocol

**Before modifying any code:**
```
mcp__kotadb__find_usages        — who calls this?
mcp__kotadb__search_dependencies — what does this file depend on / what depends on it?
mcp__kotadb__analyze_change_impact — what breaks?
```

**After decisions or dead ends — always write:**
```
mcp__kotadb__record_decision    — architectural choices made
mcp__kotadb__record_failure     — approaches that didn't work
mcp__kotadb__record_insight     — patterns discovered
```

**Indexing a new repo:**
```
mcp__kotadb__index_repository { repository: "owner/repo", localPath: "/absolute/path" }
```
Requires `KOTADB_PATH` to be set — it is, via MCP config env.

---

## Substrate — Breath Lifecycle

**What:** Tracks in-flight work units (intents). Shared state across agent instances.
**When:** Before any meaningful chunk of work — breathe in. When done — breathe out.

```
substrate_status             — check what's in flight (always first)
substrate_intent_create      — breathe in: title, description, level (MICRO|MACRO)
substrate_intent_phase       — pulse: phase (IDEATE|PLAN|IMPLEMENT|TEST), trace
substrate_collapse           — breathe out: insight, phi (1-5)
```

MICRO = single task. MACRO = epic. MICROs nest under MACRO via `parent_id`.
Empty substrate = clean workspace. That is correct.

---

## Coraline — Multi-Language Code Intelligence

**What:** Semantic code indexing with 33 languages. Rust, Zig, Python, Swift, Go, C/C++, and more.
**Binary:** `~/.cargo/bin/coraline` (installed via `cargo install coraline`)
**MCP:** `coraline serve --mcp` — registered in `~/.claude/mcp.json`

### Indexed Repos (in ~/source/)

| Repo | Nodes | Language |
|------|-------|----------|
| `surrealdb` | 24,237 | Rust |
| `zig` | 148,024 | Zig |

### Key MCP Tools

| Tool | Description |
|------|-------------|
| `coraline_search` | Find symbols by name or pattern |
| `coraline_callers` | Find what calls a symbol |
| `coraline_callees` | Find what a symbol calls |
| `coraline_impact` | Analyze change impact radius |
| `coraline_find_symbol` | Find symbols with rich metadata + optional body |
| `coraline_find_references` | Find all references to a symbol |
| `coraline_context` | Build structured context for an AI task |

### CLI Usage

```bash
# Index a new repo
cd ~/source/<repo> && coraline init && coraline index

# Query symbols
coraline query "async fn"

# Find callers
coraline callers <node-id>

# Impact analysis
coraline impact <node-id>
```

### Adding a New Repo

```bash
cd ~/source/<repo>
coraline init
coraline index
# Optional: semantic search
coraline model download
coraline embed
```

---

## Composto — Code-to-IR Compression

**What:** Converts TypeScript/JS source to compressed IR. 89% fewer tokens.
**Binary:** `/opt/homebrew/bin/composto`

```bash
composto ir <file> L0          # structure only — exports, signatures
composto ir <file> L1          # full IR — types + call graph
composto context <dir> --budget 4000   # stay within token budget
composto scan <dir>            # structural summary
```

**Do NOT use** when you need exact strings/comments or are about to edit — use raw Read.
**Do NOT use** for Swift or Zig — read those directly.

---

## Task Tracking — TodoWrite

Use `TodoWrite` for any session task with 3+ steps.
- Mark `in_progress` before starting a task
- Mark `completed` immediately when done — never batch
- One `in_progress` at a time

---

## Active Project: Arc

Event sales platform. `~/Infinity/arc/` — see `~/Infinity/arc/AGENTS.md` for full context.

**Never violate:**
1. Price locks on quote add — snapshot, never reference Galley
2. Quotes are versioned — never mutate sent/accepted quotes
3. Contracts are immutable once generated
4. Internal notes never reach client-visible surfaces
5. Portal URLs use `portal_token`, never sequential IDs

---

## What Does Not Exist

Do not reference, attempt to call, or wait for any of these — they are gone:

- Executor (`:8788`, `tools["executor.*"]`)
- Anima (`:3098`, `tools["anima.*"]`)
- Dev-Brain (`:3097`, `tools["devbrain.*"]`)
- SurrealDB (`:8002`)
- Manifold / UHP / Mesh-OS / IPIT / AIP / Stigmergic Blackboard
- `mesh_viewer.sh`, `MeshLedger`, `mutateArtifactState`
- Any `launchctl` plist for brain-layer services
