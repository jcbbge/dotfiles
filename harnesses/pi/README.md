# Pi Coding Agent

## Running from Source

Pi is forked from badlogic/pi-mono and runs from `~/source/pi-mono`:

```bash
cd ~/source/pi-mono
npm install --ignore-scripts
npm run build
node packages/coding-agent/dist/cli.js
```

Or link to run from anywhere:
```bash
ln -sf ~/source/pi-mono/packages/coding-agent/dist/cli.js /opt/homebrew/bin/pi
```

## Bug Fix: Tool Arguments Empty

**Issue:** Tool calls fail with "must have required property" despite LLM generating correct arguments.

**Root Cause:** Tool calls stream with `partialJson` containing the JSON. The `transformMessages()` function strips `partialJson` but loses the parsed `arguments` in the process. Validation receives empty `{}` and fails.

**Fix (applied to source):**

1. **types.ts** - Add partialJson field:
```typescript
partialJson?: string; // Internal: accumulates JSON during streaming
```

2. **validation.ts** - Recover from partialJson:
```typescript
const partialJson = (toolCall as any).partialJson;
if ((!toolCall.arguments || Object.keys(toolCall.arguments).length === 0) && partialJson) {
  return parseStreamingJson(partialJson);
}
```

3. **transform-messages.ts** - Preserve arguments when stripping partialJson:
```typescript
if ((normalizedToolCall as any).partialJson) {
  normalizedToolCall = { ...normalizedToolCall };
  delete (normalizedToolCall as any).partialJson;
}
```

## Syncing with Upstream

```bash
cd ~/source/pi-mono
# Add upstream if not done
git remote add upstream https://github.com/badlogic/pi-mono.git

# Fetch updates
git fetch upstream

# Rebase on main
git rebase upstream/main

# Fix conflicts in above files if any
# Rebuild
npm run build
```

## Extensions Location

User extensions are in `~/.pi/agent/extensions/`:
- ~/.pi/agent/extensions/composto.ts
- ~/.pi/agent/extensions/install.ts
- ~/.pi/agent/extensions/peer-session.ts
- ~/.pi/agent/extensions/perplexity/
- etc.

## Tool Reference

### composto (code compression)
```
composto ir <file> L0|L1|L2|L3
composto context <path> --budget <N>
composto scan <path>
```
See: [SEARCH_TOOLS.md](./SEARCH_TOOLS.md)

### smart-search (3-layer search)
```
smart-search "query"
smart-search --regex "pattern"
```
See: [SEARCH_TOOLS.md](./SEARCH_TOOLS.md)

### perplexity-search (web search)
```
/perplexity <query>
web_search({ query, recency?, depth? })
```