import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { spawnSync } from "child_process";

/**
 * RTK rewrite extension for pi.
 *
 * Intercepts bash tool calls and rewrites commands through `rtk rewrite`
 * before execution — identical to what the Claude Code / OpenCode hooks do.
 *
 * rtk binary: ~/.local/bin/rtk (v0.34.3+)
 */

const RTK_BIN = "/Users/jcbbge/.local/bin/rtk";

function rtkAvailable(): boolean {
  const result = spawnSync(RTK_BIN, ["--version"], { stdio: "ignore" });
  return result.status === 0;
}

function rewrite(command: string): string {
  // rtk rewrite exits 0 + prints rewritten command if supported, exits 1 if no rewrite.
  const result = spawnSync(RTK_BIN, ["rewrite", command], {
    encoding: "utf8",
    timeout: 2000,
  });
  if (result.status !== 0 || !result.stdout) return command;
  const out = result.stdout.trim();
  return out.length > 0 ? out : command;
}

export default function (pi: ExtensionAPI) {
  if (!rtkAvailable()) {
    console.warn("[rtk-rewrite] rtk not found at", RTK_BIN, "— extension disabled");
    return;
  }

  pi.on("tool_call", async (event, _ctx) => {
    if (event.toolName !== "bash") return undefined;

    const original = event.input.command as string;
    if (!original) return undefined;

    const rewritten = rewrite(original);
    if (rewritten !== original) {
      event.input.command = rewritten;
    }

    return undefined;
  });
}
