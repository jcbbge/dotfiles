import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { execSync, spawnSync } from "child_process";
import { Type } from "@sinclair/typebox";

/**
 * smart-search — 4-layer hybrid search extension for pi.
 *
 * Routing:
 *   Layer 1 (colgrep)  — current project, semantic + hybrid.
 *   Layer 2 (coraline) — Rust/Zig/Python/Swift/Go/C repos in ~/source.
 *   Layer 3 (pickbrain) — past sessions, memory, context.
 *   Layer 4 (ripgrep)  — exact regex, fallback.
 */

const SOURCE_ROOT = "/Users/jrg/source";
const COLGREP_BIN = "colgrep";
const RG_BIN = "rg";
const PICKBRAIN_BIN = "pickbrain";
const CORALINE_BIN = "coraline";

// ── helpers ──────────────────────────────────────────────────────────────────

function binaryAvailable(bin: string): boolean {
  try {
    execSync(`which ${bin}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
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

function pickbrain(query: string, limit: number): string {
  const result = spawnSync(PICKBRAIN_BIN, [query], {
    encoding: "utf8",
    timeout: 15_000,
  });
  if (result.status !== 0 || !result.stdout) return "";
  const lines = result.stdout.trim().split("\n");
  return lines.slice(0, limit * 15).join("\n");
}

function coraline(query: string, repo: string, limit: number): string {
  const cwd = `${SOURCE_ROOT}/${repo}`;
  const result = spawnSync(CORALINE_BIN, ["query", query], {
    encoding: "utf8",
    timeout: 15_000,
    cwd,
  });
  if (result.status !== 0 || !result.stdout) return "";
  const lines = result.stdout.trim().split("\n");
  return lines.slice(0, limit * 3).join("\n");
}

// ── routing logic ─────────────────────────────────────────────────────────────

function classifyScope(query: string): "project" | "source" | "exact" | "memory" {
  const q = query.toLowerCase();
  if (/exact|regex|pattern|literal|\\\w/.test(q)) {
    return "exact";
  }
  if (/session|conversation|memory|past|previously|chat|discussed/.test(q)) {
    return "memory";
  }
  if (/surrealdb|zig\s|rust\s|in\s+source|~/i.test(q)) {
    return "source";
  }
  return "project";
}

// ── extension ─────────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  const hasCG = binaryAvailable(COLGREP_BIN);
  const hasRG = binaryAvailable(RG_BIN);
  const hasPB = binaryAvailable(PICKBRAIN_BIN);
  const hasCR = binaryAvailable(CORALINE_BIN);

  pi.registerTool({
    name: "smart_search",
    label: "Smart Search",
    description: [
      "Unified 4-layer code search. Auto-routes based on query intent:",
      "• Layer 1 (colgrep) — current project, semantic + hybrid.",
      "• Layer 2 (coraline) — Rust/Zig/Python/Swift/Go/C repos in ~/source.",
      "• Layer 3 (pickbrain) — agent sessions, memory, past context.",
      "• Layer 4 (ripgrep) — exact regex, fallback.",
      "",
      "Use `repo` to search a specific repo in ~/source (e.g. 'surrealdb', 'zig').",
      "Use `pattern` for exact regex search.",
    ].join("\n"),
    parameters: Type.Object({
      query: Type.String({ description: "Natural language search query" }),
      pattern: Type.Optional(Type.String({ description: "Regex/literal pattern for ripgrep" })),
      repo: Type.Optional(Type.String({ description: "Repo name in ~/source (e.g. 'surrealdb', 'zig')" })),
      scope: Type.Optional(
        Type.Union(
          [
            Type.Literal("auto"),
            Type.Literal("project"),
            Type.Literal("source"),
            Type.Literal("exact"),
            Type.Literal("memory"),
          ],
          { description: "Force a specific layer. Defaults to 'auto'." }
        )
      ),
      limit: Type.Optional(Type.Number({ description: "Max results (default 10)" })),
    }),
    execute: async (_toolCallId, params, _signal, _onUpdate, _ctx) => {
      const { query, pattern, repo, scope: forceScope, limit = 10 } = params;
      const scope = forceScope ?? "auto";
      const effective = scope === "auto" ? classifyScope(query) : scope;

      const sections: string[] = [];

      // Layer 2: Coraline (if repo specified or scope is source)
      if (hasCR && repo) {
        const out = coraline(query, repo, limit);
        if (out) sections.push(`## coraline (${repo})\n\n${out}`);
      } else if (hasCR && effective === "source") {
        const repoMatch = query.match(/\b(surrealdb|zig)\b/i);
        if (repoMatch) {
          const out = coraline(query, repoMatch[1].toLowerCase(), limit);
          if (out) sections.push(`## coraline (${repoMatch[1]})\n\n${out}`);
        }
      }

      // Layer 1: colgrep (current project)
      if ((effective === "project" || effective === "auto") && !repo) {
        if (hasCG) {
          const cgArgs = ["--exclude-dir=node_modules", "--exclude-dir=vendor", `-k`, String(limit)];
          if (pattern) cgArgs.push("-e", pattern);
          const out = colgrep(query, cgArgs);
          if (out) sections.push(`## colgrep (project)\n\n${out}`);
        }
      }

      // Layer 3: pickbrain (memory)
      if (effective === "memory" || (effective === "auto" && sections.length === 0)) {
        if (hasPB) {
          const out = pickbrain(query, limit);
          if (out) sections.push(`## pickbrain (memory)\n\n${out}`);
        }
      }

      // Layer 4: ripgrep (exact or fallback)
      const needsRg = effective === "exact" || pattern !== undefined || sections.length === 0;
      if (needsRg && hasRG) {
        const rgPattern = pattern ?? query;
        const searchPath = repo ? `${SOURCE_ROOT}/${repo}` : process.cwd();
        const extra = [
          "--glob=!node_modules/**",
          "--glob=!vendor/**",
          "--glob=!dist/**",
          "--glob=!target/**",
          "--glob=!zig-cache/**",
        ];
        const out = ripgrep(rgPattern, searchPath, extra);
        if (out) sections.push(`## ripgrep (exact)\n\n${out}`);
      }

      const text = sections.length === 0
        ? `No results found for: "${query}"`
        : sections.join("\n\n---\n\n");

      return { content: [{ type: "text", text }], details: null };
    },
  });
}
