/**
 * composto — Code-to-IR compression plugin for OpenCode.
 *
 * Registers a `composto` tool that shells out to /opt/homebrew/bin/composto.
 *
 * Subcommands:
 *   ir <file> [L0|L1|L2|L3]          — compress a single file to IR
 *   context <path> --budget <N>       — build context for a directory within token budget
 *   scan <path>                       — structural summary of a directory
 *   benchmark <path>                  — show token savings for a path
 *   trends <path>                     — show IR trend data
 *
 * Binary: /opt/homebrew/bin/composto (npm install -g composto-ai)
 */

import type { Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin";
import { z } from "zod";
import { spawnSync } from "child_process";

const COMPOSTO_BIN = "/opt/homebrew/bin/composto";

function runComposto(args: string[], cwd: string): string {
  const result = spawnSync(COMPOSTO_BIN, args, {
    encoding: "utf8",
    timeout: 30_000,
    cwd,
  });

  if (result.error) {
    return `composto error: ${result.error.message}`;
  }

  const out = result.stdout?.trim() ?? "";
  const err = result.stderr?.trim() ?? "";

  if (result.status !== 0) {
    return `composto exited ${result.status}${err ? `\n${err}` : ""}`;
  }

  return out || err || "(no output)";
}

const plugin: Plugin = async (_input) => {
  return {
    tool: {
      composto: tool({
        description: [
          "Compress source files to a token-efficient IR for LLM consumption (89% fewer tokens).",
          "Supported languages: TypeScript, JavaScript, Python, Go, Rust.",
          "Subcommands:",
          "  ir <file> [L0|L1|L2|L3]  — compress a file. L0=structure only, L1=full IR, L2=git delta, L3=raw source.",
          "  context <path> --budget <N>  — build context for a directory within a token budget.",
          "  scan <path>  — structural summary of a directory.",
          "  benchmark <path>  — show token savings.",
          "When NOT to use: when you need exact string literals, comments, or plan to make edits (use raw Read instead).",
        ].join(" "),
        args: {
          subcommand: z
            .enum(["ir", "context", "scan", "benchmark", "trends"])
            .describe("Composto subcommand to run"),
          path: z.string().describe("File or directory path to operate on"),
          layer: z
            .enum(["L0", "L1", "L2", "L3"])
            .optional()
            .describe("IR layer for the `ir` subcommand (default: L1)"),
          budget: z
            .number()
            .optional()
            .describe("Token budget for the `context` subcommand"),
        },
        async execute({ subcommand, path, layer, budget }, ctx) {
          const cwd = ctx.directory ?? process.cwd();
          const args: string[] = [subcommand, path];

          if (subcommand === "ir" && layer) {
            args.push(layer);
          }

          if (subcommand === "context" && budget !== undefined) {
            args.push("--budget", String(budget));
          }

          return runComposto(args, cwd);
        },
      }),
    },
  };
};

export default plugin;
