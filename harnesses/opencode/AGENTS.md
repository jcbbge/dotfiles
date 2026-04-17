# AGENTS.md — Global Agent Context
**Updated:** 2026-04-17

This file is loaded by every harness (Claude Code, OpenCode, Pi) as global context.
It describes the actual current tooling stack. Do not guess — use what is documented here.

---

## Stack Reality

| Tool | Status | How to access |
|------|--------|---------------|
| KotaDB | **active** | MCP stdio — `mcp__kotadb__<tool>` |
| Coraline | **active** | MCP stdio — `coraline_*` / CLI — `coraline` |
| Substrate | **active** | MCP tools — `mcp__substrate__*` |
| Composto | **active** | CLI — `/opt/homebrew/bin/composto` |

---

## Search Tool Priority — 3-Layer Routing

Route before you reach for `Grep` or `Read`:

| Layer | Tool | When |
|-------|------|------|
| **1 — colgrep** | `colgrep` (Bash) | Project source — "what does X do in this repo?" Semantic + hybrid. |
| **2 — KotaDB** | `mcp__kotadb__search` et al. | JS/TS libraries, dependencies, cross-repo, symbol graphs. |
| **3 — Coraline** | `coraline_*` (MCP) or CLI | Rust, Zig, Python, Swift, Go, C/C++ repos in ~/source. |
| **4 — ripgrep** | `Grep` tool | Exact regex, literal verification, fallback. |

**Auto-route heuristics:**
- JS/TS dependency question → **KotaDB first**
- Rust/Zig/Python/Swift/Go/C repo in ~/source → **Coraline first**
- Regex or exact literal pattern → **ripgrep first**
- Everything else → **colgrep first**

**Never jump to `Read` on a library file. Use KotaDB (JS/TS) or Coraline (Rust/Zig/etc).**

---

## Coraline — Multi-Language Code Intelligence

**What:** Semantic code indexing. 33 languages including Rust, Zig, Python, Swift, Go, C/C++.
**Binary:** `~/.cargo/bin/coraline`
**MCP:** `coraline serve --mcp`

### Indexed Repos (~/source/)

| Repo | Nodes | Language |
|------|-------|----------|
| `surrealdb` | 24,237 | Rust |
| `zig` | 148,024 | Zig |

### Key Tools

| Tool | Description |
|------|-------------|
| `coraline_search` | Find symbols by name |
| `coraline_callers` | What calls this symbol |
| `coraline_callees` | What this symbol calls |
| `coraline_impact` | Change impact analysis |
| `coraline_find_references` | All references to a symbol |

### CLI

```bash
cd ~/source/<repo>
coraline init && coraline index   # Index a repo
coraline query "async fn"         # Search symbols
coraline callers <node-id>        # Find callers
```

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


<!-- agent-core: rule/commit-convention -->
# Commit Convention

Every commit follows this format. No exceptions.

```
<type>(<scope>): <summary>

PHASE: <current phase — Ideate | Plan | Implement | Verify>
DONE: <what was completed this session, comma-separated>
TODO: <what remains active, comma-separated>
BLOCKED: <what is blocked and why — omit if none>

Co-Authored-By: <Model Name> <noreply@provider.com>
```

## Types

| Type | When |
|------|------|
| `feat` | New capability added |
| `fix` | Bug resolved |
| `refactor` | Code restructured, behavior unchanged |
| `docs` | Documentation only |
| `test` | Tests added or modified |
| `chore` | Build, deps, tooling |
| `session` | Session handoff commit (no code change) |

## Scope

The area of the codebase. Use the directory or feature name:
`arc/quotes`, `arc/auth`, `arc/contracts`, `agent-core`, `infra`

## The PHASE line

Every commit declares which phase the work was in.
This is how session-start knows where you are in the four-phase cycle.

## The TODO line

**This is the handoff.** The next session reads this line first.
It must be accurate. It must be specific. It is the contract between sessions.

Bad:  `TODO: finish feature`
Good: `TODO: integration test for price lock, API endpoint handler, stripe webhook`

## Example

```
feat(arc/quotes): implement price lock snapshot on quote creation

PHASE: Implement
DONE: schema migration, Drizzle model, snapshot creation on quote-add, unit tests
TODO: integration test, API endpoint handler
BLOCKED: —

Co-Authored-By: Claude Opus 4 <noreply@anthropic.com>
```

## Never

- `git add -A` — stage files explicitly
- Vague summaries — "fix stuff", "updates", "wip"
- Missing TODO line — even if everything is done, write `TODO: —`

<!-- /agent-core: rule/commit-convention -->

<!-- agent-core: rule/work-file-format -->
# Work File Format (WORK.md)

Every project has a `WORK.md` at the git root. It is the three-tier dashboard.
It is tracked in git. It is human-readable. It requires no tooling to use.

## Structure

```markdown
# WORK — <project name>
Updated: <date>
Phase: <Ideate | Plan | Implement | Verify>

---

## PROJECT
<!-- Tier 1: The whole endeavor. Changes at milestone scale — weeks to months. -->

Status: <one line — what phase the project is in overall>
Next milestone: <what ships next and roughly when>

---

## ACTIVE
<!-- Tier 2: What is scoped and in motion right now. PM layer. -->
<!-- Tasks: defined, active, a path exists. Doing these now. -->

- [ ] <task> [<scope>]
- [ ] <task> [<scope>]

---

## BLOCKED
<!-- Active tasks that cannot proceed. Always include why and what unblocks it. -->

- [ ] <task> — <why blocked> — <what unblocks it>

---

## BACKLOG
<!-- Tier 2+3: Captured, not yet scheduled. Will become tasks. -->
<!-- Todos: known, important, no path yet. -->

- [ ] <todo> [<scope>]
- [ ] <todo> [<scope>]

---

## DONE
<!-- Completed tasks, most recent first. Date when moved here. -->

- [x] <task> — <date>
- [x] <task> — <date>
```

## The Distinction That Matters

**Task** — defined pathway, doing it now or this session. Lives in ACTIVE.
**Todo** — captured, will become a task eventually. Lives in BACKLOG.

The move from BACKLOG → ACTIVE is a deliberate decision. It means: this has a path now, I'm picking it up. Not automatic. Not date-driven. Deliberate.

The move from ACTIVE → DONE is the session-end action. It means: this is complete, verified, committed.

## Rules

- One WORK.md per project at git root
- Update ACTIVE and DONE at every session end
- BLOCKED must always explain why — never just "blocked"
- PROJECT section changes rarely — only at milestone boundaries
- BACKLOG is for capture, not planning — don't over-organize it
- Items in ACTIVE should have a scope tag: `[arc/quotes]`, `[arc/auth]`, etc.

## What This Is Not

- Not a sprint board
- Not a Jira replacement
- Not a kanban system
- Not exhaustive — if it's not worth writing down, don't
- Not permanent — DONE items can be pruned after a milestone ships

## The Four Phases in WORK.md

The `Phase:` header at the top reflects where the project currently is
in the four-phase cycle (Ideate → Plan → Implement → Verify).

Individual tasks can be in different phases — a feature in Implement
while another is in Verify. The top-level Phase is the dominant mode
of the project right now.

<!-- /agent-core: rule/work-file-format -->
