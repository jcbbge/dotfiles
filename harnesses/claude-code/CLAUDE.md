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

## MCP Servers

All harnesses connect to ONE gateway: the executor at `http://127.0.0.1:8788/mcp`.
Brain-layer services are internal infrastructure — never called directly by harnesses.

### Claude Desktop
Config: `~/Library/Application Support/Claude/claude_desktop_config.json`
Transport: **stdio** — executor binary launched as local process.
```json
{
  "mcpServers": {
    "executor": {
      "command": "executor",
      "args": ["mcp", "--scope", "$HOME/.executor"]
    }
  }
}
```

### Claude Code CLI
Config: `~/.claude.json` (user scope)
Transport: **HTTP**
```bash
claude mcp add --transport http --scope user executor http://localhost:8788/mcp
```

### opencode
Config: `~/.config/opencode/opencode.json`
Transport: **remote HTTP**
```json
{ "mcp": { "executor": { "type": "remote", "url": "http://localhost:8788/mcp" } } }
```

### pi.dev
No native MCP — uses executor extension at `~/.pi/agent/extensions/executor.ts`.
Registers `execute` and `resume` tools pointing to `http://127.0.0.1:8788/mcp`.

### Brain-layer services (internal only)
| Service | Port | Access |
|---------|------|--------|
| Anima | 3098 | via executor only |
| Dev-Brain | 3097 | via executor only |
| KotaDB | 3099 | via executor only |
| Substrate | 8011 | via executor only |
| Subagent | 3096 | via executor only |
| SurrealDB | 8002 | internal to brain stack |

**If a service is down**, restart via launchctl:
```bash
launchctl load ~/Library/LaunchAgents/<plist-name>.plist
```
Plist names: `com.jcbbge.anima-mcp.plist` · `com.jcbbge.dev-brain-mcp.plist` · `com.jcbbge.kotadb-app.plist` · `dev.substrate.mcp.plist` · `dev.brain.subagent-mcp.plist`
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

## Agent-Core Tooling

| Tool | Repo |
|------|------|
| kotadb | `github.com/jcbbge/kotadb` |
| agent-core (schema, skills, tools) | `github.com/jcbbge/agent-core` |

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
