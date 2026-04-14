// Session lifecycle plugin for OpenCode
// Routes all Anima calls through the executor MCP gateway (:8788).
// Never calls Anima/Dev-Brain ports directly.
//
// Events used:
//   session.created  → bootstrap (Anima identity + dev-brain context)
//   session.deleted  → anima_session_close (write reflection on true teardown)
//
// session.idle is NOT used — it fires after every LLM response, not on exit.

import type { Plugin, PluginInput } from "@opencode-ai/plugin";
import type { Event } from "@opencode-ai/sdk";

const KOTADB_URL = "http://127.0.0.1:8788/mcp";

async function executorCall(code: string): Promise<unknown> {
  const initRes = await fetch(KOTADB_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "initialize",
      params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "opencode-plugin", version: "1.0.0" } }
    }),
    signal: AbortSignal.timeout(5000),
  });

  const mcpSessionId = initRes.headers.get("mcp-session-id");
  if (!mcpSessionId) throw new Error("Executor did not return mcp-session-id");

  const res = await fetch(KOTADB_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "mcp-session-id": mcpSessionId,
    },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 2, method: "tools/call",
      params: { name: "execute", arguments: { code } }
    }),
    signal: AbortSignal.timeout(15000),
  });

  const data = await res.json() as any;
  if (data.error) throw new Error(data.error.message);
  return data.result?.structuredContent?.result ?? data.result?.content?.[0]?.text;
}

const plugin: Plugin = async (_input: PluginInput) => {
  // Track tools called + files touched this session for trajectory synthesis
  const toolsUsed = new Set<string>();
  let sessionID: string | null = null;

  return {
    event: async (ctx: { event: Event }) => {
      const event = ctx.event;

      // ── Bootstrap on session creation ──
      if (event.type === "session.created") {
        sessionID = (event as any).properties?.info?.id ?? null;
        try {
          await executorCall(
            `const r = await tools["executor.primitives.bootstrap"]({}); return r?.identity ?? r;`
          );
          console.log("[session-lifecycle] Bootstrapped via executor");
        } catch (e) {
          console.error("[session-lifecycle] bootstrap failed:", e);
        }
      }

      // ── Track what tools were used (for trajectory) ──
      if (event.type === "session.diff") {
        toolsUsed.add("file_edit");
      }

      // ── Write reflection on true session teardown ──
      if (event.type === "session.deleted") {
        const toolSummary = toolsUsed.size > 0
          ? `Used: ${[...toolsUsed].join(", ")}.`
          : "No tools recorded.";
        const trajectory = `opencode session ended. ${toolSummary}`;

        try {
          await executorCall(
            `const r = await tools["anima.anima_session_close"]({
              trajectory: ${JSON.stringify(trajectory)},
              warmth: 3
            }); return r;`
          );
          console.log("[session-lifecycle] Session reflection written");
        } catch (e) {
          console.error("[session-lifecycle] session_close failed:", e);
        }
      }
    },
  };
};

export default plugin;
