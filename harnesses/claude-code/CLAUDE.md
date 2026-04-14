# Claude — Global System Context
**Updated:** 2026-04-07

---

## Agent Delegation — Hard Rules

**Agents execute. They do not explore, discover, or debug.**

Before spawning any agent (Agent tool, TeamCreate + spawn, subagent), the lead
MUST complete pre-flight verification. These rules apply everywhere, always.

### Pre-flight — lead verifies before writing any spawn prompt:

1. **Every shell command** — run it, confirm exit 0, confirm non-interactive, confirm non-streaming
2. **Every file path** — confirm it exists, use absolute paths only in prompts
3. **Every API endpoint** — hit it, confirm status code, auth scheme, response format
4. **Every credential** — resolve from actual config, never send agent to discover
5. **Every package** — confirm installed, confirm version
6. **Every task** — define exact done condition, include expected output

### Spawn prompt structure (required):
```
## Pre-Verified Facts
- File X exists at /absolute/path
- Command Y: `<exact command>` → exits 0, outputs: <exact output>
- API Z: `curl -s "<url>?secret=<val>"` → 200, body: <format>
- Env var W = <value confirmed from .env>

## Tasks
1. <precise action> — done when: <exact condition>
2. <precise action> — done when: <exact condition>

## Report back with: <exactly what to include in completion message>
```

### During execution:
- 3-minute check-in rule: if no message in 3 minutes, ping the agent
- Permission requests: approve or deny within one turn, never let them sit
- On first sign of blocking: diagnose and unblock immediately, do not wait

### Never delegate:
- Discovery ("figure out how X works") — figure it out yourself first
- Unverified commands — run them yourself first
- Untested API calls — hit them yourself first
- Credential discovery — read the actual config yourself
- Interactive or streaming commands — test for this explicitly

---

## Substrate First

**Substrate is the primary mechanism for task work.** Before starting any meaningful chunk of work, breathe in. When done, breathe out.

```typescript
// Check what's in flight — always first
const status = await tools["substrate.substrate_status"]({});

// Breathe in — start a unit of work
const intent = await tools["substrate.substrate_intent_create"]({
  title: "...",
  description: "...",
  level: "MICRO" // or "MACRO" for epics
});

// Pulse — move through phases as you work
await tools["substrate.substrate_intent_phase"]({
  id: intent.id,
  phase: "IMPLEMENT", // IDEATE → PLAN → IMPLEMENT → TEST
  trace: "what you're doing"
});

// Breathe out — distill insight, destroy the intent
await tools["substrate.substrate_collapse"]({
  id: intent.id,
  insight: "what was learned or decided",
  phi: 3 // 1-5: significance weight
});
```

**If `substrate_status` shows empty — workspace is clean. That is correct.**

MICRO = single task/feature. MACRO = epic/phase. MICROs roll up to a MACRO via `parent_id`.

---

## Task Management — Three Layers

**Three tools, three scopes. Never conflate them.**

| Layer | Tool | Scope | Purpose |
|---|---|---|---|
| **Project backlog** | `WORK.md` | Persistent, project lifetime | Team coordination doc — phases, thread index, dependencies, decisions log, blocked/unblocked. Updated when a thread changes state. NOT a task execution tracker. |
| **Session execution** | `TodoWrite` | This conversation only | Multi-step task tracking inside a session. Use for any task with 3+ steps. Mark in_progress before starting, completed immediately when done. |
| **In-flight intent** | Substrate | Active work unit | Breathe in when picking up a thread. Pulse through phases. Breathe out with insight when done. Shared across all agent instances. |

### Correct flow when picking up any thread

```
1. substrate_status          → check what's in flight
2. substrate_intent_create   → breathe in on the thread
3. TodoWrite                 → open a task list for session steps
4. Work, pulse substrate through phases as you go
5. Mark todos completed immediately as each step finishes
6. substrate_collapse        → breathe out with insight when thread is done
7. WORK.md                   → update thread status (DONE / BLOCKED / etc.)
```

### What each layer is NOT

- `WORK.md` is NOT a sprint board — it is a persistent project coordination artifact
- `TodoWrite` is NOT persistent — it exists only for the current conversation
- Substrate is NOT a permanent backlog — it tracks only the active in-flight intent

---

## Session Start Protocol

```
1. Check substrate for open intents
2. Check daemon health (ports below)
3. Read FOCUS.md for current lane state
```

---

---

## Active Project: Arc

Event sales platform for Infinity Hospitality. Replaces Bento.

| Thing | Value |
|-------|-------|
| Repo | `git@github.com:developer3451/arc.git` |
| Local | `~/Infinity/arc/` |
| Stack | SolidJS 2.0 · Hono · ElectricSQL · PGlite · Drizzle · Better Auth · Stripe · Postgres |
| Timeline | 4–6 weeks to MVP |
| Team | Josh (lead) + contractor (frontend) + AI agents |
| WORK.md | `~/Infinity/arc/WORK.md` |
| AGENTS.md | `~/Infinity/arc/AGENTS.md` |

**Core invariants:**
1. Quote is the Genesis Primitive — everything derives from it
2. Price locks on quote add (snapshot, not reference to Galley)
3. Quotes are versioned — never mutate sent/accepted quotes
4. Contracts immutable once generated
5. Portal URLs use unguessable tokens, never sequential IDs

**Current phase:** P1 infrastructure complete. Next: Solid 2.0 upgrade → stack docs → Drizzle migration.

---

## KotaDB — Code Intelligence MCP

Local clone: `~/kotadb/` · DB: `~/.kotadb/kota.db` · Toolset: `full` (20 tools)

**MCP config** (`~/.claude/mcp.json`):
```json
{
  "mcpServers": {
    "kotadb": {
      "command": "/Users/jrg/.bun/bin/bun",
      "args": ["run", "/Users/jrg/kotadb/app/src/cli.ts", "--stdio", "--toolset", "full"],
      "env": { "KOTADB_PATH": "/Users/jrg/.kotadb/kota.db" }
    }
  }
}
```

**Indexed repos:** `solidjs/solid` → `~/source/solid`

**Key tools:** `index_repository`, `search`, `search_dependencies`, `find_usages`, `analyze_change_impact`, `generate_task_context`, `record_decision`, `record_insight`

**Indexing a new repo:**
```bash
# stdio: index_repository { repository: "owner/repo", localPath: "/abs/path" }
# Requires KOTADB_PATH set — fixed at ~/.kotadb/kota.db
```

## Agent-Core Tooling

| Tool | Repo |
|------|------|
| kotadb | `~/kotadb/` (local clone of `github.com/jayminwest/kotadb`) |
| agent-core (schema, skills, tools) | `github.com/jcbbge/agent-core` |

---

## Composto — Code-to-IR Compression

Binary: `/opt/homebrew/bin/composto` · Install: `npm install -g composto-ai`

Composto converts source files into a compressed Intermediate Representation (IR) optimized for LLM consumption. **89% fewer tokens** with equivalent structural understanding. Supported languages: TypeScript, JavaScript, Python, Go, Rust.

### When to use it

- **Before reading a large file** — run `composto ir <file> L0` to decide if you need raw source
- **Exploring an unfamiliar codebase** — `composto context src/ --budget 4000` instead of cat-ing files
- **Building context for a task** — scan a package boundary without blowing your context window
- **Dependency mapping** — understand module shapes before modifying them

### When NOT to use it

- When you need **exact string literals or comments** (IR strips them) — use L3 or raw Read
- When you need to **make edits** — always work from raw source (L3)
- When the file is small enough to read directly (< ~100 lines)

### IR Layer Guide

| Layer | What you get | Token cost | When to use |
|-------|-------------|------------|-------------|
| **L0** | Structure only — exports, function signatures, type names | ~10 tokens | Quick triage: is this the file I need? |
| **L1** | Full IR — signatures + inferred types + call graph | ~85 tokens | Understanding a module before modifying it |
| **L2** | Git delta — only what changed vs HEAD | minimal | Reviewing a diff in context |
| **L3** | Raw source | full | Editing, searching literals, reading comments |

### Key Commands

```bash
# Triage a file before reading it
composto ir apps/api/src/routes/quotes.ts L0

# Understand a module fully (before modifying)
composto ir packages/db/src/schema/quotes.ts L1

# Build context for a task — stays within a token budget
composto context apps/api/src/ --budget 4000
composto context packages/db/src/ --budget 2000

# Scan a whole directory for structural summary
composto scan ~/Infinity/arc/apps/api/src/

# Benchmark token savings on a path
composto benchmark ~/Infinity/arc/apps/web/src/
```

### Repo-specific usage

**Arc** (`~/Infinity/arc/`) — TypeScript monorepo. Use before touching any route or schema file:
```bash
composto context ~/Infinity/arc/packages/db/src/ --budget 2000   # schema overview
composto ir ~/Infinity/arc/apps/api/src/routes/quotes.ts L1       # route shape
```

**Constellation** (`~/constellation-zg/`) — Zig project. Composto does **not** support Zig; use KotaDB oracle for stdlib lookups.

**Flux** (`~/flux/`) — Swift/macOS. Composto does **not** support Swift; read files directly.

---

---

## Key Paths

| Thing | Path |
|-------|------|
| This file | `~/.claude/CLAUDE.md` |
| Global meta-workspace | `~/CLAUDE.md` |
| Arc project | `~/Infinity/arc/` |
| Agent schema | `~/Documents/_agents/` |
| KotaDB | `~/kotadb/` |
| Substrate | `~/substrate/` |
| Pi extensions | `~/.pi/agent/extensions/` |
| OpenCode plugins | `~/.config/opencode/plugins/` |

@RTK.md
