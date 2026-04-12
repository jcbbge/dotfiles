/**
 * smart-search — 3-layer hybrid search plugin for OpenCode.
 *
 * Routing:
 *   Layer 1 (colgrep)  — project source, semantic + hybrid. Primary.
 *   Layer 2 (kotadb)   — deps, node_modules, structural, impact analysis.
 *   Layer 3 (ripgrep)  — exact regex, verification, fallback.
 *
 * kotadb is routed through executor MCP gateway at :8788/mcp.
 */

import type { Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin";
import { z } from "zod";
import { spawnSync } from "child_process";

const EXECUTOR_MCP_URL = "http://127.0.0.1:8788/mcp";

// Health cache — avoids 1.5s timeout on every call when executor is down
let _kotadbHealthy: boolean | null = null;
let _kotadbHealthCheckedAt = 0;
const HEALTH_TTL_MS = 30_000;

// ── helpers ───────────────────────────────────────────────────────────────────

async function executorInitializeSession(): Promise<string> {
  const initRes = await fetch(EXECUTOR_MCP_URL, {
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
        clientInfo: { name: "opencode-smart-search", version: "1.0.0" },
      },
    }),
    signal: AbortSignal.timeout(1500),
  });

  const sessionId = initRes.headers.get("mcp-session-id");
  if (!sessionId) throw new Error("Executor did not return mcp-session-id");
  return sessionId;
}

async function kotadbHealth(): Promise<boolean> {
  const now = Date.now();
  if (_kotadbHealthy !== null && now - _kotadbHealthCheckedAt < HEALTH_TTL_MS) {
    return _kotadbHealthy;
  }
  try {
    await executorInitializeSession();
    _kotadbHealthy = true;
  } catch {
    _kotadbHealthy = false;
  }
  _kotadbHealthCheckedAt = Date.now();
  return _kotadbHealthy;
}

async function kotadbSearch(query: string, limit: number): Promise<string> {
  const sessionId = await executorInitializeSession();

  const code = [
    "const result = await tools[\"kotadb.search\"]({",
    `  query: ${JSON.stringify(query)},`,
    '  scope: ["code", "symbols"],',
    '  output: "snippet",',
    `  limit: ${limit},`,
    "});",
    "return result;",
  ].join("\n");

  const res = await fetch(EXECUTOR_MCP_URL, {
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
      params: {
        name: "execute",
        arguments: { code },
      },
    }),
    signal: AbortSignal.timeout(8000),
  });

  const data = (await res.json()) as any;
  const result = data?.result;
  if (!result || result?.isError || data?.error) return "";

  const structured = result?.structuredContent;
  const text = result?.content?.[0]?.text ?? "";
  const payload = structured ?? (() => {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  })();

  const results = payload?.results?.code ?? payload?.results ?? [];
  if (!Array.isArray(results) || results.length === 0) {
    return typeof payload === "string" ? payload : "";
  }

  return results
    .slice(0, limit)
    .map((r: any) => `[${r.file ?? r.path ?? "?"}]\n${r.snippet ?? r.content ?? ""}`)
    .join("\n\n");
}
function colgrep(query: string, args: string[], cwd: string): string {
  const result = spawnSync("colgrep", [query, "--json", ...args], {
    encoding: "utf8",
    timeout: 10_000,
    cwd,
  });
  if (result.status !== 0 || !result.stdout) return "";
  try {
    const hits = JSON.parse(result.stdout) as any[];
    if (!Array.isArray(hits) || hits.length === 0) return "";
    return hits
      .map((h: any) => {
        const file = h?.unit?.file ?? h?.file ?? "?";
        const snippet = h?.unit?.content ?? h?.content ?? "";
        return `[${file}]\n${snippet}`;
      })
      .join("\n\n");
  } catch {
    return result.stdout.trim();
  }
}

function ripgrep(pattern: string, cwd: string, extra: string[]): string {
  const result = spawnSync("rg", [pattern, "--max-count=5", "--context=3", ...extra], {
    encoding: "utf8",
    timeout: 8_000,
    cwd,
  });
  return result.stdout?.trim() ?? "";
}

function classifyScope(query: string): "project" | "deps" | "exact" {
  const q = query.toLowerCase();
  if (/node_modules|vendor|depend|import|what breaks|impact|usage across|cross.repo/.test(q)) {
    return "deps";
  }
  if (/exact|regex|pattern|literal|\\\w/.test(q)) {
    return "exact";
  }
  return "project";
}

// ── plugin ────────────────────────────────────────────────────────────────────

const plugin: Plugin = async (_input) => {
  return {
    tool: {
      smart_search: tool({
        description: [
          "Unified 3-layer code search. Auto-routes based on query intent.",
          "Layer 1 (colgrep): project source code — semantic + hybrid. Best for intent-based 'what does X do?'",
          "Layer 2 (kotadb): dependencies, node_modules, structural queries, impact analysis, cross-repo.",
          "Layer 3 (ripgrep): exact regex, verification, fallback when other layers are weak.",
          "Use `pattern` for regex/literal alongside natural language `query`.",
          "Use `scope` to force a layer: 'auto' (default) | 'project' | 'deps' | 'exact'.",
        ].join(" "),
        args: {
          query: z.string().describe("Natural language search query"),
          pattern: z.string().optional().describe("Regex or literal pattern (for ripgrep layer)"),
          scope: z
            .enum(["auto", "project", "deps", "exact"])
            .optional()
            .default("auto")
            .describe("Force a specific layer or let the tool auto-route"),
          limit: z.number().optional().default(10).describe("Max results per layer"),
        },
        async execute({ query, pattern, scope = "auto", limit = 10 }, ctx) {
          const cwd = ctx.directory ?? process.cwd();
          const effective = scope === "auto" ? classifyScope(query) : scope;
          const sections: string[] = [];

          // Layer 1: colgrep
          if (effective === "project" || effective === "auto") {
            const args = [
              "--exclude-dir=node_modules",
              "--exclude-dir=vendor",
              "-k",
              String(limit),
            ];
            if (pattern) args.push("-e", pattern);
            const out = colgrep(query, args, cwd);
            if (out) sections.push(`## colgrep (project semantic)\n\n${out}`);
          }

          // Layer 2: kotadb
          if (effective === "deps" || (effective === "auto" && sections.length === 0)) {
            const healthy = await kotadbHealth();
            if (healthy) {
              const out = await kotadbSearch(query, limit).catch(() => "");
              if (out) sections.push(`## kotadb (structural / dependency)\n\n${out}`);
            } else {
              sections.push(`## kotadb\n\n⚠️ executor/kotadb not reachable at 127.0.0.1:8788/mcp`);
            }
          }

          // Layer 3: ripgrep
          const needsRg =
            effective === "exact" || pattern !== undefined || sections.length === 0;
          if (needsRg) {
            const rgPattern = pattern ?? query;
            const extra = [
              "--glob=!node_modules/**",
              "--glob=!vendor/**",
              "--glob=!dist/**",
            ];
            const out = ripgrep(rgPattern, cwd, extra);
            if (out) sections.push(`## ripgrep (exact / fallback)\n\n${out}`);
          }

          if (sections.length === 0) {
            return `No results found across all layers for: "${query}"`;
          }

          return sections.join("\n\n---\n\n");
        },
      }),
    },
  };
};

export default plugin;
