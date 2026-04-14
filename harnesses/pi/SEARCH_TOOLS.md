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

## 3. smart-search — 3-Layer Hybrid Search

**Purpose:** Search across your codebase with semantic intelligence.

**Requirements:**
- KotaDB running on port 3000 (`cd ~/kotadb/app && bun run src/index.ts`)
- No executor needed

### When to Use

| Layer | What It Searches | Use When |
|-------|----------------|---------|
| **Layer 1 (colgrep)** | Project code, semantic + hybrid | Primary search — "where is X implemented?" |
| **Layer 2 (kotadb)** | Dependencies, structural, cross-repo | "what breaks if I change X?" |
| **Layer 3 (ripgrep)** | Exact regex, verification | Fallback when layers 1+2 are weak |

### How It Works

1. First tries colgrep (project code, semantic)
2. Falls back to kotadb (Layer 2 - hits `http://localhost:3000` directly)
3. Finally ripgrep for exact matches

### CLI Examples

```bash
# Primary search (colgrep first)
smart-search "token savings"
smart-search "quote generation"
smart-search "what does the validateToolCall function do"

# Cross-repo / dependency queries
smart-search "KotaDB oracle"
smart-search "what breaks if I remove the parseStreamingJson"

# Verification (exact)
smart-search --regex "function.*validate.*"
```

### Key Nuances

- KotaDB runs on port 3000, started via `cd ~/kotadb/app && bun run src/index.ts`
- No executor — smart-search hits KotaDB directly at `http://localhost:3000`
- Most effective for "what does X do?" and "where is X?"
- Falls back to ripgrep for exact regex matching

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
    │   ├─ My project code → smart-search
    │   ├─ Dependencies / cross-repo → smart-search (Layer 2 / kotadb MCP)
    │   └─ Exact match / verify → ripgrep
    └─ No → Need WEB info?
        ├─ Yes → perplexity-search
        └─ No → Plain Read or ls
```

---

## Quick Reference

| Task | Tool | Command |
|------|------|--------|
| CLI output compression | rtk | `rtk git status`, `rtk test cargo test` |
| Understand file before editing | composto | `composto ir src/file.ts L1` |
| Understand module structure | composto | `composto context src/ --budget 4000` |
| Scan directory | composto | `composto scan src/` |
| Find code in project | smart-search | `smart-search "function name"` |
| Cross-repo / dependency | KotaDB MCP | `analyze_change_impact`, `find_usages` |
| Exact verification | ripgrep | `rg "exact string"` |
| Web research | perplexity | `/perplexity query` |

---

## Service Startup

```bash
# KotaDB HTTP (optional, for smart-search Layer 2):
cd ~/kotadb/app && KOTADB_PATH=~/.kotadb/kota.db bun run src/index.ts

# KotaDB stdio (Claude Code MCP — auto-started by claude):
# Configured in ~/.claude/mcp.json — no manual start needed
```

---

## Nuances for Agents

1. **rtk for CLI output**: Use `rtk <command>` for any shell command output — git, tests, builds.

2. **composto L1 vs raw Read:** L1 gives structure + types but reconstructs via LLM. If you need to verify exact code exists, use ripgrep.

3. **smart-search vs composto:** smart-search finds WHERE code IS. composto tells you WHAT code DOES (structure).

4. **KotaDB MCP vs HTTP:** MCP (stdio) is the primary path in Claude Code — auto-started. HTTP server is optional, used by smart-search Layer 2. Both use `KOTADB_PATH=~/.kotadb/kota.db`.

5. **Verification ALWAYS uses ripgrep:** After any IR-based search, if making changes, verify with ripgrep.

6. **Tool precedence:** rtk → smart-search → composto → ripgrep.

7. **No executor:** Executor has been removed. KotaDB is wired directly — no intermediary.
