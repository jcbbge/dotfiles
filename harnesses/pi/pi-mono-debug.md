# pi-mono Debugging Reference
**Updated:** 2026-04-14

---

## Repo

- **Path:** `~/source/pi-mono`
- **Run pi from source:** `./pi-test.sh -e ~/.pi/agent/extensions/perplexity`
- **Default model:** `anthropic/claude-sonnet-4-6` via Perplexity Agent API

---

## The Two-Layer Build Problem (most common time-waster)

`./pi-test.sh` runs the coding-agent from TypeScript source via `tsx`. But the perplexity
extension at `~/.pi/agent/extensions/perplexity/index.ts` imports from **built npm package dists**:

- `@mariozechner/pi-ai` → `packages/ai/dist/`
- `@mariozechner/pi-coding-agent` → `packages/coding-agent/dist/`

**If you change source and don't see the effect, rebuild the dists.**

If DIAG logs you added to source aren't appearing, the extension is still running the old dist.
Rebuild first, then test.

```bash
# From ~/source/pi-mono — run all three after any source change to ai, agent, or coding-agent
node_modules/.bin/tsgo -p packages/ai/tsconfig.build.json
node_modules/.bin/tsgo -p packages/agent/tsconfig.build.json
node_modules/.bin/tsgo -p packages/coding-agent/tsconfig.build.json
```

Each command is silent on success. Any output means a type error — fix before testing.

After rebuilding, also run the type checker:

```bash
npm run check   # from ~/source/pi-mono — fix ALL errors, warnings, and infos before committing
```

**Never run:** `npm run dev`, `npm run build`, `npm test`

---

## Key Files

| File | Role |
|------|------|
| `packages/ai/src/providers/openai-responses-shared.ts` | Core Perplexity/OpenAI Responses streaming logic — where most provider bugs get fixed |
| `packages/coding-agent/src/modes/interactive/interactive-mode.ts` | TUI event handler — `message_update`, `message_end`, `tool_execution_start` |
| `packages/coding-agent/src/modes/interactive/components/tool-execution.ts` | `ToolExecutionComponent` — renders tool calls in the TUI |
| `packages/coding-agent/src/modes/interactive/components/assistant-message.ts` | `AssistantMessageComponent` — renders text/thinking only, deliberately skips `toolCall` content items |
| `packages/agent/src/agent-loop.ts` | Agent event loop — translates AI stream events into `message_update` / `message_end` |
| `~/.pi/agent/extensions/perplexity/index.ts` | Perplexity provider extension — delegates to `streamSimpleOpenAIResponses` |

---

## Perplexity Agent API Quirks (provider-side bugs, not pi bugs)

### 1. No streaming delta events for tool call arguments

Arguments arrive **fully-formed** in `item.arguments` on the `response.output_item.added` SSE
event. There are no subsequent `function_call_arguments.delta` events. The fix: parse and emit
args immediately at `added` time in `openai-responses-shared.ts`, not later.

### 2. Empty tool call arguments

Perplexity sometimes sends `function_call` items with `item.arguments = ""` (empty string). This
caused an infinite validation retry loop before it was fixed. The fix: at `output_item.done`, if
both `blockPartialJson` and `item.arguments` are empty, drop the block from output content and
skip `toolcall_end` entirely — never execute or retry it.

### 3. HTML entity encoding

Perplexity HTML-encodes content in transit. Both tool call argument JSON and text output can
contain `&quot;`, `&#39;`, `&lt;`, `&gt;`, `&amp;`. These must be decoded before parsing or
displaying. The fix: `decodeHtmlEntities()` helper applied at every ingestion point in
`openai-responses-shared.ts` — at `output_item.added`, in delta events, and at `output_item.done`.

---

## Tool Display Architecture (how `$ command` gets rendered)

Understanding this flow is essential for diagnosing display bugs:

1. `openai-responses-shared.ts` fires `toolcall_start` with fully-parsed args at `output_item.added`.
2. `agent-loop.ts` receives `toolcall_start` and wraps it as `message_update`, emitting upstream.
3. `interactive-mode.ts` `message_update` handler (line ~2373) creates a `ToolExecutionComponent`,
   adds it to `chatContainer`, and stores it in `pendingTools` map keyed by `toolCallId`.
4. At `message_end` (line ~2430), the handler calls `updateArgs(finalArgs)` then `setArgsComplete()`
   on each pending component — this triggers diff computation for edit tools.
5. `tool_execution_start` fires after `message_end`. It checks `pendingTools` first. If the
   component already exists (normal case), it reuses it and calls `markExecutionStarted()`.
   It only creates a new component if the toolCallId is missing from `pendingTools` (edge case).
6. `AssistantMessageComponent` does **not** render `toolCall` content items — it skips them
   entirely. Tool display is 100% owned by `ToolExecutionComponent`.

### Double `$ command` display

Investigated but not confirmed reproduced after the args-at-`added` fix landed. If it reappears:
check whether `pendingTools.get(toolCallId)` is missing at `tool_execution_start`, which would
cause a second `ToolExecutionComponent` to be created and added to `chatContainer`. This would
happen if the `toolCallId` used in `message_update` doesn't match the one in `tool_execution_start`.

---

## Debugging Workflow

1. Reproduce the bug with `./pi-test.sh -e ~/.pi/agent/extensions/perplexity`
2. Add `console.error("[DIAG:label] ...")` logs to source (stderr goes to terminal, not TUI)
3. **Rebuild the relevant dist** before testing — this is the step most likely to be forgotten
4. Verify logs are appearing; if not, rebuild again (wrong package)
5. Remove all DIAG logs before committing — grep for `DIAG` across the repo to confirm clean

```bash
# Verify no DIAG logs remain
grep -r "DIAG" packages/*/src/
```

---

## Fixes Applied (session ending 2026-04-14)

All fixes are in `packages/ai/src/providers/openai-responses-shared.ts`:

- **Empty args infinite loop** — drop tool call block at `output_item.done` when both
  `blockPartialJson` and `item.arguments` are empty; skip `toolcall_end`
- **HTML entity decoding** — `decodeHtmlEntities()` applied at all ingestion points
- **`$ ...` placeholder display** — args parsed and emitted at `output_item.added` instead of
  waiting for deltas that never come; `interactive-mode.ts` `message_end` handler updates each
  pending component's args with final values before `setArgsComplete()`
