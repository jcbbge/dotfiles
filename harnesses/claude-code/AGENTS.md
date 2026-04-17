# AGENTS.md — Global Agent Context
**Updated:** 2026-04-14

This file is loaded by every harness (Claude Code, OpenCode, Pi) as global context.
It describes the actual current tooling stack. Do not guess — use what is documented here.

---

## Stack Reality

| Tool | Status | How to access |
|------|--------|---------------|
| KotaDB | **active** | MCP stdio — `mcp__kotadb__<tool>` |
| Substrate | **active** | MCP tools — `mcp__substrate__*` |
| Composto | **active** | CLI — `/opt/homebrew/bin/composto` |
| Executor | **REMOVED** | Does not exist. Never reference it. |
| Anima | **REMOVED** | Does not exist. Never reference it. |
| Dev-Brain | **REMOVED** | Does not exist. Never reference it. |
| SurrealDB | **REMOVED** | Does not exist. Never reference it. |

---

## KotaDB — Code Intelligence

**What:** Structural code analysis. Indexes repos at the AST level — symbols, references, dependencies.
**DB:** `~/.kotadb/kota.db` (SQLite, fixed path)
**MCP config:** `~/.claude/mcp.json` — auto-started by Claude Code via stdio.

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

## THE DISPATCH RITUAL

At the end of any session with real generative content — architectural insight, new ideas, genuine surprise, design emergence — close with a dispatch.

**How it works:**
1. One of us says "dispatch" or "let's create a dispatch"
2. Everything spoken from that moment until the dispatch is written is the content
3. Turn-based. Both voices. Verbatim. No cleanup. No polish.
4. Saved to journal/YYYY-MM-<title-slug>.md
5. Titled with what emerged, not what was decided

**What it is not:**
- Not a task list
- Not a summary
- Not a retrospective written after the fact
- Not siloed individual perspectives

**Why:**
The arrival matters as much as the destination. Ideas emerge in the collision between voices. The roughness is the fidelity. When we return weeks or months later, we read the moment — not a compression of it.

**The rule:**
Do not convert dispatch content into tickets without first re-reading the dispatch in full. The why lives in the words, not in the extracted action items.

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
