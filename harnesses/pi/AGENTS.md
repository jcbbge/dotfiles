# AGENTS.md — Global Agent Context
**Updated:** 2026-04-17

This file is loaded by every harness (Claude Code, OpenCode, Pi) as global context.
It describes the actual current tooling stack. Do not guess — use what is documented here.

---

## Stack Reality

| Tool | Status | How to access |
|------|--------|---------------|
| KotaDB | **active** | MCP stdio — `mcp__kotadb__<tool>` |
| Coraline | **active** | CLI — `coraline` (33 languages incl. Rust, Zig, Python, Swift) |
| Substrate | **active** | MCP tools — `mcp__substrate__*` |
| Composto | **active** | CLI — `/opt/homebrew/bin/composto` |

---

## Search Tool Priority — 4-Layer Routing

In pi, `smart_search` is a registered tool that handles all 4 layers automatically.
Use it instead of raw Bash search.

| Layer | Tool | When |
|-------|------|------|
| **1 — colgrep** | Layer 1 of `smart_search` | Project source — "what does X do in this repo?" |
| **2 — coraline** | `smart_search(repo: "zig")` | Rust, Zig, Python, Swift, Go, C/C++ repos in ~/source. |
| **3 — pickbrain** | `smart_search(scope: "memory")` | Past sessions, agent memory, context. |
| **4 — ripgrep** | `smart_search(pattern: "...")` | Exact regex, fallback. |

**Calling `smart_search`:**
```
smart_search(query: "std.mem.Allocator", repo: "zig")   # Coraline — Zig repo
smart_search(query: "quote creation")                   # colgrep — project
smart_search(pattern: "function.*validate")             # ripgrep — exact
smart_search(query: "what we decided last session", scope: "memory")  # pickbrain
```

**Parameters:** `query` (required), `repo?`, `scope?` (auto|project|source|exact|memory), `pattern?`, `limit?`

---

## Coraline — Multi-Language Code Intelligence

**What:** Semantic code indexing. 33 languages including Rust, Zig, Python, Swift, Go, C/C++.
**Binary:** `~/.cargo/bin/coraline`
**Access in pi:** via `smart_search` tool with `repo:` param

### Indexed Repos (~/source/)

| Repo | Nodes | Language |
|------|-------|----------|
| `surrealdb` | 24,237 | Rust |
| `zig` | 148,024 | Zig |

### Adding a New Repo

```bash
cd ~/source/<repo>
coraline init && coraline index
```

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

**Note:** For `.zig` source files, use `smart_search(repo: "zig")` which routes to Coraline — not KotaDB.

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
