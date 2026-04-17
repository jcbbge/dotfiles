# Search & Code Reference Tools

This guide covers when to use each tool for searching code and getting code references.

## Ports Configuration

| Service | Port | Notes |
|--------|------|-------|
| KotaDB (HTTP, optional) | 3000 | `cd ~/kotadb/app && bun run src/index.ts` |

KotaDB is primarily accessed via **stdio** (Claude Code MCP) or directly via the HTTP server.
No executor needed — KotaDB is wired directly.

---

## 1. rtk — Token-Efficient CLI Output

**Purpose:** Filters/compresses CLI command output before it reaches LLM context. 60-90% token savings.

### Installation
```bash
brew install rtk
rtk init -g  # For Claude Code / pi
```

### Commands
```bash
rtk ls .              # Token-optimized directory tree
rtk read file.rs      # Smart file reading  
rtk find "*.rs" .     # Compact find results
rtk grep "pattern" .  # Grouped search results
rtk git status       # Compact status
rtk git log -n 10    # One-line commits
rtk test cargo test  # Failures only (-90%)
rtk gain             # Show token savings stats
```

### When to Use

- Any CLI command output that would otherwise flood context
- git operations (status, log, diff, push)
- test output (failures only)
- build/lint output (errors only)
- ls/tree for directory listing

### What It Does

1. **Smart Filtering** - Removes noise (comments, whitespace, boilerplate)
2. **Grouping** - Aggregates similar items
3. **Truncation** - Keeps relevant context
4. **Deduplication** - Collapses repeated log lines

---

## 2. composto — Code-to-IR Compression

**Purpose:** Compress source code files into token-efficient IR before giving to LLM.

### When to Use

| Use Case | IR Layer | Why |
|---------|---------|-----|
| Understanding module structure before modification | **L0** | Just exports, function signatures, type names (~10 tokens) |
| Reading a file to understand what it does | **L1** | Full IR with inferred types + call graph (~85 tokens) |
| Building context for a task within budget | `context` | Stay within token budget |
| Scanning directory for structural summary | `scan` | Get module shapes |
| Getting quick benchmark | `benchmark` | Show token savings |

### IR Layer Guide

| Layer | What You Get | Token Cost | When to Use |
|-------|-----------|----------|-----------|
| **L0** | Structure only — exports, function signatures, type names | ~10 tokens | Quick triage: is this the file I need? |
| **L1** | Full IR — signatures + inferred types + call graph | ~85 tokens | Understanding a module before modifying |
| **L2** | Git delta — only what changed vs HEAD | minimal | Reviewing diff in context |
| **L3** | Raw source | full | Editing, searching literals, comments |

### CLI Examples

```bash
# Triage a file before reading
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

### Key Nuances

- **DO use** for understanding code structure before editing
- **DO NOT use** when you need exact string literals, comments, or will edit the file
- **DO NOT use** for Swift or Zig — read those files directly
- Uses LLM inference to reconstruct code — not exact match

### As Pi Tool

```
composto ir apps/api/src/routes/quotes.ts L1
```

---

## 3. smart_search — 4-Layer Hybrid Search (Pi Tool)

**Purpose:** Unified code search. Registered as a pi tool — call it as a tool, not a CLI command.

**No external services required.** All layers run locally via binaries.

### When to Use

| Layer | What It Searches | Trigger |
|-------|----------------|---------|
| **Layer 1 (colgrep)** | Current project, semantic + hybrid | Default; project queries |
| **Layer 2 (coraline)** | Rust, Zig, Python, Swift, Go, C in ~/source | `repo: "zig"` or `scope: "source"` |
| **Layer 3 (pickbrain)** | Past sessions, agent memory, context | `scope: "memory"` |
| **Layer 4 (ripgrep)** | Exact regex, fallback | `pattern: "..."` or no other results |

### How to Call

```
smart_search(query: "std.mem.Allocator alloc", repo: "zig")    # coraline — Zig repo
smart_search(query: "quote creation")                          # colgrep — project
smart_search(query: "dispatch pattern", scope: "memory")       # pickbrain — memory
smart_search(pattern: "function.*validate")                    # ripgrep — exact
```

### Parameters

| Param | Type | Notes |
|-------|------|-------|
| `query` | string | Required. Natural language. |
| `repo` | string? | Repo in ~/source (e.g. `"zig"`, `"surrealdb"`) — forces coraline |
| `scope` | string? | `auto` \| `project` \| `source` \| `exact` \| `memory` |
| `pattern` | string? | Exact regex — forces ripgrep |
| `limit` | number? | Max results (default 10) |

### Indexed repos for coraline (~/source/)

| Repo | Nodes | Language |
|------|-------|----------|
| `zig` | 148,024 | Zig |
| `surrealdb` | 24,237 | Rust |

### Key Nuances

- **No services required** — coraline, colgrep, pickbrain, ripgrep are all CLI binaries
- `repo:` param routes directly to coraline — primary way to search Zig/Rust source
- Auto-routing detects zig/surrealdb keywords and routes to coraline automatically
- Most effective for "what does X do?" (colgrep) and symbol lookups (coraline)

---

## 4. KotaDB — Code Intelligence (MCP)

**Purpose:** Structural code analysis — dependencies, impact analysis, symbol search, memory layer.

### MCP Config (Claude Code)

Located at `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "kotadb": {
      "command": "/Users/jrg/.bun/bin/bun",
      "args": ["run", "/Users/jrg/kotadb/app/src/cli.ts", "--stdio", "--toolset", "full"],
      "env": {
        "KOTADB_PATH": "/Users/jrg/.kotadb/kota.db"
      }
    }
  }
}
```

### Toolset Tiers

| Tier | Tools | When to Use |
|------|-------|-------------|
| `default` | 8 tools (core + sync) | Standard sessions |
| `core` | 6 tools | Minimal footprint |
| `memory` | 14 tools | + decision/insight recording |
| `full` | 20 tools | All capabilities |

### Indexing a Repo

```bash
# Index a local repo (required before searching)
KOTADB_PATH=~/.kotadb/kota.db bun run ~/kotadb/app/src/cli.ts --stdio
# then call: index_repository { repository: "owner/repo", localPath: "/abs/path" }
```

### Key Tools

| Tool | Use Case |
|------|---------|
| `index_repository` | Index a local codebase |
| `search` | Semantic + code search |
| `search_dependencies` | Find what a file depends on |
| `find_usages` | Find what uses a symbol/file |
| `analyze_change_impact` | What breaks if I change X? |
| `generate_task_context` | Context pack for a task |
| `get_index_statistics` | Check what's indexed |
| `record_decision` | Persist architectural decisions |
| `record_insight` | Persist learnings |

### Indexed Repos

| Repo | DB Path |
|------|---------|
| `solidjs/solid` (`~/source/solid`) | `~/.kotadb/kota.db` |

### Starting HTTP Server (Optional)

```bash
cd ~/kotadb/app && KOTADB_PATH=~/.kotadb/kota.db bun run src/index.ts
# Health: http://localhost:3000/health
```

---

## 5. ripgrep — Exact Pattern Matching

**Purpose:** Binary verification, exact matches, regex patterns.

### When to Use

| Use Case | Why |
|---------|-----|
| Finding exact string literals | "exactly this string in the codebase" |
| Regex pattern searches | `/function\s+\w+/` type patterns |
| Verification | "confirm this exact code exists" |
| When IR/reconstruction won't work | Need exact match, not LLM inference |

### CLI Examples

```bash
# Exact string
rg "must have required property"
rg "Validation failed for tool"

# Regex
rg "function\s+(\w+)\s*\("
rg "export\s+default\s+function"

# With context
rg -n -C 3 "partialJson"
rg -n "validateToolCall" --no-ignore
```

### When to NOT Use

- Don't use as primary search — smart-search does this better
- Don't use for "understanding" — use composto L1 instead
- Don't use when colgrep/kotadb would work

---

## 6. perplexity-search — Web Search

**Purpose:** Search the web for documentation, issues, solutions.

### When to Use

- Finding docs for a library/framework
- Researching a bug (Stack Overflow, GitHub issues)
- Looking up API changes
- "What's the latest on X?"

### CLI Examples

```bash
/perplexity SolidJS v2 release
/perplexity --recent TypeScript 6.0 new features
/perplexity --deep "OpenAI function calling error handling"
```

### As Tool Call

```typescript
web_search({
  query: "SolidJS v2 migration guide",
  recency: "month",  // hour | day | week | month | year
  depth: "high"   // low | medium | high
})
```

---

## Decision Tree

```
Need to UNDERSTAND code structure?
├─ Yes → composto ir <file> L1
└─ No → Need to FIND code?
    ├─ Yes → What's the scope?
    │   ├─ My project code → smart_search(query: "...")
    │   ├─ Rust/Zig/Go/Python/Swift repo → smart_search(query: "...", repo: "<name>")
    │   ├─ Agent memory / past sessions → smart_search(query: "...", scope: "memory")
    │   └─ Exact match / verify → smart_search(pattern: "...")
    └─ No → Need WEB info?
        ├─ Yes → perplexity-search
        └─ No → Plain Read or ls
```

---

## Quick Reference

| Task | Tool | How |
|------|------|-----|
| CLI output compression | rtk | `rtk git status`, `rtk test cargo test` |
| Understand file before editing | composto | `composto ir src/file.ts L1` |
| Understand module structure | composto | `composto context src/ --budget 4000` |
| Scan directory | composto | `composto scan src/` |
| Find code in project | smart_search | `smart_search(query: "...")` |
| Zig / Rust / Swift source | smart_search | `smart_search(query: "...", repo: "zig")` |
| Agent memory / past context | smart_search | `smart_search(query: "...", scope: "memory")` |
| Exact regex verification | smart_search | `smart_search(pattern: "...")` |
| JS/TS library intelligence | KotaDB MCP | `mcp__kotadb__find_usages`, `analyze_change_impact` |
| Web research | perplexity | `/perplexity query` |

---

## Service Startup

```bash
# KotaDB stdio (auto-started by claude/pi via MCP config):
# Configured in ~/.claude/mcp.json — no manual start needed

# Coraline (no service needed — pure CLI):
# coraline is a binary at ~/.cargo/bin/coraline — smart_search calls it directly
```

---

## Nuances for Agents

1. **rtk for CLI output**: Use `rtk <command>` for any shell command output — git, tests, builds.

2. **composto L1 vs raw Read:** L1 gives structure + types but reconstructs via LLM. If you need to verify exact code exists, use ripgrep via smart_search.

3. **smart_search vs composto:** smart_search finds WHERE code IS. composto tells you WHAT code DOES (structure).

4. **KotaDB for JS/TS, Coraline for everything else:** KotaDB indexes JS/TS at AST level for dep graphs. Coraline handles Rust, Zig, Python, Swift, Go, C/C++. smart_search routes automatically.

5. **Verification ALWAYS uses ripgrep:** After any semantic search, if making changes, verify with `smart_search(pattern: "exact string")`.

6. **Tool precedence in pi:** smart_search → composto → KotaDB MCP (for JS/TS impact analysis).

7. **No executor, no HTTP services:** smart_search layers 1-4 are all local CLI binaries. No ports needed.
