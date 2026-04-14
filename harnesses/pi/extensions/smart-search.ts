import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { execSync, spawnSync } from "child_process";
import { Type } from "@sinclair/typebox";

/**
 * smart-search — 3-layer hybrid search extension for pi.
 *
 * Routing logic:
 *   Layer 1 (colgrep)  — project code, semantic + hybrid. Primary.
 *   Layer 2 (kotadb)   — dependencies, structural queries, cross-repo, "what breaks if…"
 *   Layer 3 (ripgrep)  — exact regex, verification, fallback when layers 1+2 are weak.
 *
 * kotadb is called directly via HTTP at localhost:3000/mcp (stdio mode via Claude Code MCP config).
 */

const KOTADB_URL = "http://127.0.0.1:3000/mcp";
const COLGREP_BIN = "colgrep";
const RG_BIN = "rg";
// ── helpers ──────────────────────────────────────────────────────────────────

function binaryAvailable(bin: string): boolean {
  try {
    execSync(`which ${bin}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function kotadbSearch(query: string, limit: number): Promise<string> {
  const initRes = await fetch(KOTADB_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "smart-search", version: "1.0.0" },
      },
    }),
    signal: AbortSignal.timeout(5000),
  });

  const sessionId = initRes.headers.get("mcp-session-id");
  if (!sessionId) throw new Error("kotadb initialize failed: missing mcp-session-id");

  const code = `const r = await tools["kotadb.search"](${JSON.stringify({
    query,
    scope: ["code", "symbols"],
    output: "snippet",
    limit,
  })}); return r;`;

  const callRes = await fetch(KOTADB_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
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

  const data = (await callRes.json()) as any;
  if (data?.error || data?.result?.isError) return "";

  const text = data?.result?.content?.[0]?.text ?? "";
  const parseMaybeJson = (value: any): any => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  const parsed = parseMaybeJson(text);
  const unwrapped = parseMaybeJson(parsed?.content?.[0]?.text ?? parsed);
  const results = unwrapped?.results?.code ?? unwrapped?.results ?? [];

  if (!Array.isArray(results) || results.length === 0) {
    return typeof text === "string" ? text : "";
  }

  return results
    .slice(0, limit)
    .map((r: any) => `[${r.file ?? r.path ?? "?"}]\n${r.snippet ?? r.content ?? ""}`)
    .join("\n\n");
}
function colgrep(query: string, args: string[]): string {
  const result = spawnSync(COLGREP_BIN, [query, "--json", ...args], {
    encoding: "utf8",
    timeout: 10_000,
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
  const result = spawnSync(RG_BIN, [pattern, "--max-count=5", "--context=3", ...extra], {
    encoding: "utf8",
    timeout: 8_000,
    cwd,
  });
  return result.stdout?.trim() ?? "";
}

// ── routing logic ─────────────────────────────────────────────────────────────

/**
 * Classify the query to pick starting layer.
 * Heuristics — not magic:
 *   - "node_modules", "vendor", "depends", "import", "what breaks", "dependency"
 *     → start with kotadb
 *   - regex chars or "exact" / file extension patterns
 *     → start with ripgrep
 *   - everything else → colgrep
 */
function classifyScope(query: string): "project" | "deps" | "exact" {
  const q = query.toLowerCase();
  if (/node_modules|vendor|depend|import|what breaks|impact|usage across|cross.repo/.test(q)) {
    return "deps";
  }
  if (/exact|regex|pattern|literal|\\\w|\.ts$|\.rs$|\.go$/.test(q)) {
    return "exact";
  }
  return "project";
}

// ── extension ─────────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  const hasCG = binaryAvailable(COLGREP_BIN);
  const hasRG = binaryAvailable(RG_BIN);

  pi.registerTool({
    name: "smart_search",
    label: "Smart Search",
    description: [
      "Unified 3-layer code search. Auto-routes based on query intent:",
      "• Layer 1 (colgrep) — project source code, semantic + hybrid. Best for 'what does X do?' in your repo.",
      "• Layer 2 (kotadb) — dependencies, node_modules, cross-repo structural queries, impact analysis.",
      "• Layer 3 (ripgrep) — exact regex, verification, fallback.",
      "",
      "For exact/regex patterns use the `pattern` field alongside the natural-language `query`.",
      "Set `scope` to force a specific layer: 'project' | 'deps' | 'exact' | 'auto' (default).",
    ].join("\n"),
    parameters: Type.Object({
      query: Type.String({ description: "Natural language search query" }),
      pattern: Type.Optional(Type.String({ description: "Regex/literal pattern for ripgrep hybrid" })),
      scope: Type.Optional(
        Type.Union(
          [
            Type.Literal("auto"),
            Type.Literal("project"),
            Type.Literal("deps"),
            Type.Literal("exact"),
          ],
          { description: "Force a specific layer. Defaults to 'auto' (inferred from query)." }
        )
      ),
      limit: Type.Optional(Type.Number({ description: "Max results per layer (default 10)" })),
    }),
    execute: async (params, _ctx) => {
      const { query, pattern, scope: forceScope, limit = 10 } = params;
      const scope = forceScope ?? "auto";
      const effective = scope === "auto" ? classifyScope(query) : scope;

      const sections: string[] = [];

      // ── Layer 1: colgrep (project) ──
      if (effective === "project" || effective === "auto") {
        if (hasCG) {
          const cgArgs = ["--exclude-dir=node_modules", "--exclude-dir=vendor", `-k`, String(limit)];
          if (pattern) cgArgs.push("-e", pattern);
          const out = colgrep(query, cgArgs);
          if (out) sections.push(`## colgrep (project semantic)\n\n${out}`);
        }
      }

      // ── Layer 2: kotadb (deps / structural) ──
      if (effective === "deps" || (effective === "auto" && sections.length === 0)) {
        try {
          const out = await kotadbSearch(query, limit);
          if (out) sections.push(`## kotadb (structural / dependency)\n\n${out}`);
        } catch {
          // fall through to ripgrep fallback
        }
      }
      // ── Layer 3: ripgrep (exact / fallback) ──
      const needsRg = effective === "exact" || pattern !== undefined || sections.length === 0;
      if (needsRg && hasRG) {
        const rgPattern = pattern ?? query;
        const extra = ["--glob=!node_modules/**", "--glob=!vendor/**", "--glob=!dist/**"];
        const out = ripgrep(rgPattern, process.cwd(), extra);
        if (out) sections.push(`## ripgrep (exact / fallback)\n\n${out}`);
      }

      if (sections.length === 0) {
        return `No results found across all layers for: "${query}"`;
      }

      return sections.join("\n\n---\n\n");
    },
  });
}
