import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

/**
 * executor — pi extension
 *
 * Registers `execute` and `resume` as LLM-callable tools in pi.
 *
 * Executor is the gateway. All MCP servers (anima, devbrain, kotadb, substrate,
 * subagent, and any registered source) are reachable exclusively through it.
 *
 * The two tools exposed by executor MCP:
 *   execute({ code })  — run TypeScript in sandbox, call tools.* inside
 *   resume({ resumePayload, response? }) — resume a paused execution
 *
 * Inside `code`, the full tool catalog is available via tools.*:
 *   tools["executor.primitives.bootstrap"]({})
 *   tools["anima.anima_store"]({ content, resonance_phi })
 *   tools["anima.anima_query"]({ query })
 *   tools["anima.anima_session_close"]({ trajectory, warmth })
 *   tools["devbrain.get_recent_context"]({})
 *   tools["devbrain.create_todo"]({ title, project })
 *   tools["substrate.substrate_status"]({})
 *   tools["substrate.substrate_intent_create"]({ name, goal })
 *   tools["substrate.substrate_collapse"]({ intent_id, outcome })
 *   tools["kotadb.semantic_search"]({ query })
 *   tools["kotadb.find_usages"]({ symbol })
 *   tools.discover({ query, limit })
 *   ... and everything else registered to the workspace
 *
 * Executor MCP server: http://127.0.0.1:8788/mcp
 * Never call brain-layer ports directly. Always go through executor.
 */

const EXECUTOR_URL = "http://127.0.0.1:8788/mcp";
const INIT_TIMEOUT_MS = 5_000;
const CALL_TIMEOUT_MS = 60_000;

async function executorCall(method: string, params: unknown): Promise<unknown> {
  // Initialize MCP session
  const initRes = await fetch(EXECUTOR_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "pi-executor", version: "1.0.0" },
      },
    }),
    signal: AbortSignal.timeout(INIT_TIMEOUT_MS),
  });

  const sessionId = initRes.headers.get("mcp-session-id");
  if (!sessionId) throw new Error("Executor did not return mcp-session-id");

  const res = await fetch(EXECUTOR_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "mcp-session-id": sessionId,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: method, arguments: params },
    }),
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
  });

  const data = (await res.json()) as any;
  if (data.error) throw new Error(data.error.message);

  const result = data.result;
  if (!result) return null;

  // If isError, throw so the LLM sees it as a tool error
  if (result.isError) {
    const msg = result.content?.[0]?.text ?? "Execution failed";
    throw new Error(msg);
  }

  // Return structured content if available, otherwise text
  return result.structuredContent ?? result.content?.[0]?.text ?? result;
}

export default function (pi: ExtensionAPI) {
  // ── execute ────────────────────────────────────────────────────────────────
  pi.registerTool({
    name: "execute",
    label: "Execute",
    description: [
      "Execute TypeScript in the executor sandbox. This is the ONLY way to call brain-layer MCP servers.",
      "",
      "Executor is the gateway. All MCP servers are accessible inside `code` via tools.*:",
      "  tools[\"executor.primitives.bootstrap\"]({})           — identity + context + capability map",
      "  tools[\"anima.anima_store\"]({ content, resonance_phi }) — store memory",
      "  tools[\"anima.anima_query\"]({ query })                 — search memory",
      "  tools[\"anima.anima_session_close\"]({ trajectory, warmth }) — close session",
      "  tools[\"devbrain.get_recent_context\"]({})              — workspace context",
      "  tools[\"devbrain.create_todo\"]({ title, project })     — create task",
      "  tools[\"substrate.substrate_status\"]({})               — open intents + memories",
      "  tools[\"substrate.substrate_intent_create\"]({ name, goal }) — begin structured work",
      "  tools[\"substrate.substrate_collapse\"]({ intent_id, outcome }) — complete intent",
      "  tools[\"kotadb.semantic_search\"]({ query })            — code intelligence search",
      "  tools[\"kotadb.find_usages\"]({ symbol })               — symbol usage graph",
      "  tools.discover({ query, limit })                       — discover available tools",
      "",
      "Rules:",
      "  - Do NOT use fetch inside code. Use tools.* only.",
      "  - Do NOT call brain-layer ports directly (3097, 3098, 3099, 8011).",
      "  - Return values from code are surfaced as the tool result.",
      "  - If execution pauses for interaction, use `resume` with the returned resumePayload.",
    ].join("\n"),
    parameters: Type.Object({
      code: Type.String({
        description: "TypeScript code to execute in the sandbox. Use tools.* to call MCP servers.",
      }),
    }),
    async execute(_toolCallId, { code }) {
      const result = await executorCall("execute", { code });
      if (typeof result === "string") return result;
      return JSON.stringify(result, null, 2);
    },
  });

  // ── resume ─────────────────────────────────────────────────────────────────
  pi.registerTool({
    name: "resume",
    label: "Resume",
    description: [
      "Resume a paused executor execution.",
      "Only call this after the user approves, unless they have explicitly granted blanket permission.",
      "Use the resumePayload returned by a previous `execute` call.",
    ].join("\n"),
    parameters: Type.Object({
      resumePayload: Type.Object({
        executionId: Type.String({ description: "Execution ID to resume" }),
      }),
      response: Type.Optional(
        Type.Object({
          action: Type.Union([
            Type.Literal("accept"),
            Type.Literal("decline"),
            Type.Literal("cancel"),
          ]),
          content: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
        })
      ),
    }),
    async execute(_toolCallId, { resumePayload, response }) {
      const result = await executorCall("resume", { resumePayload, response });
      if (typeof result === "string") return result;
      return JSON.stringify(result, null, 2);
    },
  });
}
