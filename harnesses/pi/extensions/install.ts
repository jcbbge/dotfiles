import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { readFileSync } from "fs";
import { homedir } from "os";

/**
 * install — Register a new tool into the global dev stack.
 *
 * Returns the full /install playbook as a prompt, injected into the pi
 * conversation so the agent executes the 9-step registration process.
 *
 * The playbook is read from ~/.claude/skills/install/SKILL.md so there
 * is a single source of truth — update that file to update all harnesses.
 */

const SKILL_PATH = `${homedir()}/.claude/skills/install/SKILL.md`;

function loadPlaybook(tool: string): string {
  try {
    const raw = readFileSync(SKILL_PATH, "utf8");
    // Strip YAML frontmatter
    const body = raw.replace(/^---[\s\S]*?---\n/, "").trim();
    // Substitute $ARGUMENTS
    return body.replace(/\$ARGUMENTS/g, tool);
  } catch {
    return [
      `Register "${tool}" into the global dev stack.`,
      "",
      `Could not load playbook from ${SKILL_PATH}.`,
      "Ensure ~/.claude/skills/install/SKILL.md exists.",
      "",
      "Minimal fallback steps:",
      "1. Research and install the tool",
      "2. Update /Users/jrg/dotfiles/PORTS.md if it uses a port",
      "3. Add to /Users/jrg/dotfiles/npm/globals.sh or Brewfile",
      "4. Write agent guide and add to /Users/jrg/.claude/CLAUDE.md",
      "5. Sync /Users/jrg/dotfiles/harnesses/claude-code/CLAUDE.md",
      "6. Create opencode command, opencode plugin (if needed), pi extension",
      "7. Commit dotfiles and push",
    ].join("\n");
  }
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "install",
    label: "Install Tool",
    description: [
      "Register a new tool into the global developer stack.",
      "",
      "Runs the full 9-step installation playbook:",
      "  1. Research + install the tool",
      "  2. Port registration (PORTS.md + dev.services) if needed",
      "  3. New machine setup (globals.sh / Brewfile)",
      "  4. Write condensed what/when/why/how agent guide",
      "  5. Update ~/.claude/CLAUDE.md",
      "  6. Sync dotfiles harness copy",
      "  7. Wire into all harnesses (opencode, pi.dev, claude code)",
      "  8. Commit + push dotfiles",
      "  9. Verify all outputs",
      "",
      "Pass the tool name or URL as `tool`.",
    ].join("\n"),
    parameters: Type.Object({
      tool: Type.String({
        description:
          "Name or URL of the tool to register, e.g. 'ripgrep', 'https://example.com/mytool'",
      }),
    }),
    execute: async ({ tool }, _ctx) => {
      return loadPlaybook(tool);
    },
  });
}
