import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

/**
 * session-lifecycle — pi extension.
 *
 * Mirrors the opencode session-lifecycle plugin:
 *   session_start    → executor.primitives.bootstrap (Anima identity + dev-brain context)
 *   session_shutdown → anima.anima_session_close (write session reflection)
 *
 * All calls route through the executor gateway at :8788 (MCP HTTP).
 * Never calls Anima/Dev-Brain ports directly.
 */

const EXECUTOR_URL = "http://127.0.0.1:8788/mcp";

async function executorCall(code: string): Promise<unknown> {
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
        clientInfo: { name: "pi-session-lifecycle", version: "1.0.0" },
      },
    }),
    signal: AbortSignal.timeout(5000),
  });

  const mcpSessionId = initRes.headers.get("mcp-session-id");
  if (!mcpSessionId) throw new Error("Executor did not return mcp-session-id");

  const res = await fetch(EXECUTOR_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "mcp-session-id": mcpSessionId,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "execute", arguments: { code } },
    }),
    signal: AbortSignal.timeout(15000),
  });

  const data = (await res.json()) as any;
  if (data.error) throw new Error(data.error.message);
  return data.result?.structuredContent?.result ?? data.result?.content?.[0]?.text;
}

export default function (pi: ExtensionAPI) {
  // session_start — bootstrap Anima + dev-brain
  pi.on("session_start", async (_event, ctx) => {
    try {
      await executorCall(
        `const r = await tools["executor.primitives.bootstrap"]({}); return r?.identity ?? r;`
      );
      ctx.ui.notify("Anima bootstrapped", "info");
    } catch (e) {
      // Non-fatal — executor may be down, pi still works
      ctx.ui.notify(`[session-lifecycle] bootstrap failed: ${(e as Error).message}`, "error");
    }
  });

  // session_shutdown — write Anima session reflection
  pi.on("session_shutdown", async (_event, _ctx) => {
    try {
      await executorCall(
        `const r = await tools["anima.anima_session_close"]({ trajectory: "pi session ended", warmth: 3 }); return r;`
      );
    } catch {
      // Best-effort — shutdown is happening anyway
    }
  });
}
