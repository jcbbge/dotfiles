/**
 * perplexity-search — pi extension
 *
 * Web search primitive powered by Perplexity Search API.
 * Surfaced as both a slash command (/perplexity) and a registered LLM tool
 * so any agent can invoke it autonomously.
 *
 * Usage (human):
 *   /perplexity what is the latest on SolidJS?
 *   /perplexity --recent SolidJS v2 release
 *   /perplexity --deep what caused the 2025 OpenAI leadership change
 *
 * Usage (LLM tool call):
 *   The agent calls web_search({ query, recency?, depth? }) directly.
 *
 * Requires: PERPLEXITY_API_KEY env var
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

const SEARCH_API_URL = "https://api.perplexity.ai/search";

// ─── types ────────────────────────────────────────────────────────────────────

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  date?: string;
  last_updated?: string;
}

interface SearchResponse {
  id: string;
  results: SearchResult[];
}

interface SearchOptions {
  query: string;
  /** low | medium | high — controls result depth. Default: medium */
  search_context_size?: "low" | "medium" | "high";
  /** hour | day | week | month | year — filter by recency. Default: none */
  recency_filter?: "hour" | "day" | "week" | "month" | "year";
  /** Max results to return in formatted output. Default: 5 */
  limit?: number;
}

// ─── core search function ─────────────────────────────────────────────────────

async function search(opts: SearchOptions): Promise<SearchResult[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error("PERPLEXITY_API_KEY not set");

  const body: Record<string, unknown> = {
    query: opts.query,
    search_context_size: opts.search_context_size ?? "medium",
  };

  if (opts.recency_filter) {
    body.recency_filter = opts.recency_filter;
  }

  const res = await fetch(SEARCH_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Perplexity Search API ${res.status}: ${err}`);
  }

  const data = (await res.json()) as SearchResponse;
  const limit = opts.limit ?? 5;
  return (data.results ?? []).slice(0, limit);
}

// ─── format results for display ───────────────────────────────────────────────

function formatResults(results: SearchResult[], query: string): string {
  if (results.length === 0) return `No results found for: ${query}`;

  const lines: string[] = [
    `◈ Web Search: ${query}`,
    `  ${results.length} result${results.length !== 1 ? "s" : ""}`,
    "",
  ];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const date = r.date || r.last_updated;
    const dateStr = date ? ` · ${date.slice(0, 10)}` : "";
    lines.push(`${i + 1}. **${r.title}**${dateStr}`);
    lines.push(`   ${r.url}`);
    if (r.snippet) {
      const preview = r.snippet.replace(/\n+/g, " ").trim();
      const truncated = preview.length > 200 ? preview.slice(0, 200) + "…" : preview;
      lines.push(`   ${truncated}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

// ─── parse command args ────────────────────────────────────────────────────────

function parseArgs(raw: string): SearchOptions {
  let query = raw.trim();
  let recency: SearchOptions["recency_filter"] | undefined;
  let depth: SearchOptions["search_context_size"] = "medium";

  // --recent / -r  → week
  if (/--recent|-r\b/.test(query)) {
    recency = "week";
    query = query.replace(/--recent|-r\b/, "").trim();
  }

  // --today  → day
  if (/--today/.test(query)) {
    recency = "day";
    query = query.replace(/--today/, "").trim();
  }

  // --month  → month
  if (/--month/.test(query)) {
    recency = "month";
    query = query.replace(/--month/, "").trim();
  }

  // --deep / -d  → high context
  if (/--deep|-d\b/.test(query)) {
    depth = "high";
    query = query.replace(/--deep|-d\b/, "").trim();
  }

  // --fast / -f  → low context
  if (/--fast|-f\b/.test(query)) {
    depth = "low";
    query = query.replace(/--fast|-f\b/, "").trim();
  }

  return { query, recency_filter: recency, search_context_size: depth };
}

// ─── extension ────────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  // ── /perplexity command (human-invoked) ────────────────────────────────────
  pi.registerCommand("perplexity", {
    description: [
      "Web search via Perplexity Search API.",
      "Usage: /perplexity [--recent|--today|--month] [--deep|--fast] <query>",
      "Flags: --recent (past week), --today (past day), --month (past month), --deep (more results), --fast (quick scan)",
    ].join(" "),
    handler: async (args, ctx) => {
      if (!args?.trim()) {
        ctx.ui.notify("Usage: /perplexity <query> [--recent] [--deep]", "info");
        return;
      }

      const opts = parseArgs(args);

      if (!opts.query) {
        ctx.ui.notify("Please provide a search query.", "error");
        return;
      }

      ctx.ui.setStatus("perplexity-search", `◈ searching: ${opts.query.slice(0, 40)}…`);

      try {
        const results = await search(opts);
        const formatted = formatResults(results, opts.query);

        ctx.ui.setStatus("perplexity-search", undefined);

        // Inject results as a message — LLM can see and reason over them
        pi.sendMessage(
          {
            customType: "web-search-results",
            content: formatted,
            display: true,
          },
          { triggerTurn: true, deliverAs: "followUp" },
        );
      } catch (e) {
        ctx.ui.setStatus("perplexity-search", undefined);
        ctx.ui.notify(`Search failed: ${(e as Error).message}`, "error");
      }
    },
  });

  // ── web_search tool (LLM-invoked) ─────────────────────────────────────────
  pi.registerTool({
    name: "web_search",
    label: "Web Search",
    description: [
      "Search the web using Perplexity Search API. Returns ranked results with titles, URLs, and snippets.",
      "Use this when you need current information, recent events, documentation, or any external knowledge.",
      "Prefer this over making assumptions about things that may have changed recently.",
    ].join(" "),
    parameters: Type.Object({
      query: Type.String({
        description: "The search query. Be specific for better results.",
      }),
      recency: Type.Optional(
        Type.Union(
          [
            Type.Literal("hour"),
            Type.Literal("day"),
            Type.Literal("week"),
            Type.Literal("month"),
            Type.Literal("year"),
          ],
          {
            description:
              "Filter results by recency. Use 'day' or 'week' for current events. Omit for general queries.",
          },
        ),
      ),
      depth: Type.Optional(
        Type.Union([Type.Literal("low"), Type.Literal("medium"), Type.Literal("high")], {
          description:
            "Search depth. 'low' for quick facts, 'medium' for most queries (default), 'high' for deep research.",
        }),
      ),
      limit: Type.Optional(
        Type.Number({
          description: "Max results to return (1-10). Default: 5.",
          minimum: 1,
          maximum: 10,
        }),
      ),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const opts: SearchOptions = {
        query: params.query,
        recency_filter: params.recency,
        search_context_size: params.depth ?? "medium",
        limit: params.limit ?? 5,
      };

      try {
        const results = await search(opts);
        const formatted = formatResults(results, opts.query);

        return {
          content: [{ type: "text", text: formatted }],
          details: {
            query: opts.query,
            resultCount: results.length,
            recency: opts.recency_filter,
            depth: opts.search_context_size,
            results: results.map((r) => ({ title: r.title, url: r.url })),
          },
        };
      } catch (e) {
        return {
          content: [{ type: "text", text: `Search failed: ${(e as Error).message}` }],
          details: {},
          isError: true,
        };
      }
    },

    renderCall(args, theme) {
      const query = args.query as string || "";
      const recency = args.recency ? ` [${args.recency}]` : "";
      const depth = args.depth && args.depth !== "medium" ? ` [${args.depth}]` : "";
      return undefined; // use default rendering
    },
  });
}
