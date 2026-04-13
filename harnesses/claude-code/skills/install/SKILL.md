---
name: install
description: Register a new tool into the global dev stack — installs it, wires it into CLAUDE.md, all harnesses (opencode, pi.dev, claude code), new-machine setup, port registry, and dev portal. Use when the user says "install", "register", "add to my stack", or "wire up" a new tool.
argument-hint: <tool name or URL>
disable-model-invocation: true
allowed-tools: Bash Read Write Edit Glob Grep WebFetch
---

You are registering a new tool into the global developer stack on this machine. The tool is: $ARGUMENTS

Follow this exact process in order. Do not skip steps. Do not delegate discovery — verify every fact yourself before acting.

---

## Step 1 — Research the tool

Fetch the tool's official documentation. Determine:
- What it does and why an agent would use it
- Installation method (binary, npm, brew, etc.)
- All CLI commands and flags
- Any port allocation (does it run a server? on what port?)
- Supported languages or file types (if a code tool)
- Limitations (what it cannot do)
- Whether it is already installed: run `which <tool>` and `<tool> --version`

If not installed, install it now using the documented method.

Verify installation exits 0 and prints a version before proceeding.

---

## Step 2 — Port registration (if applicable)

If the tool runs a server or binds a port:
1. Read `/Users/jrg/dotfiles/PORTS.md` — the canonical port registry
2. Check the port convention table to find the correct range
3. Add a row to the registry table with: port, service name, how it starts, notes
4. If the tool needs a launchd plist for persistence, check `~/Library/LaunchAgents/` and create one if missing
5. Register it in `~/dotfiles/scripts/dev.services` so it appears in `dev status`

If no port is needed, skip this step.

---

## Step 3 — New machine setup

Add the tool to `~/dotfiles/npm/globals.sh` (for npm packages) or `~/dotfiles/Brewfile` (for brew packages) so any fresh machine install picks it up automatically.

Pin the exact version that is currently installed.

---

## Step 4 — Write the agent guide

Write a concise **what / when / why / how** block for this tool. It must be dense enough to be useful in a global context file but short enough not to bloat it. Structure:

```
## <Tool Name> — <one-line tagline>

Binary: `<path>` · Install: `<command>`

<2–3 sentence description of what it does and why agents should use it.>

### When to use it
- <concrete scenario 1>
- <concrete scenario 2>
- <concrete scenario 3>

### When NOT to use it
- <limitation 1>
- <limitation 2>

### Key Commands
\`\`\`bash
<most useful commands with concrete examples>
\`\`\`

### <Repo/stack-specific notes if relevant>
<any per-project notes, e.g. "Arc is TypeScript — use this. Flux is Swift — do not use.">
```

---

## Step 5 — Update global CLAUDE.md

File: `/Users/jrg/.claude/CLAUDE.md`

Insert the agent guide block from Step 4 into the appropriate location. Find the nearest thematically related section and insert after it. Do not append to the bottom blindly — find the right place.

Update the date in the header: `**Updated:** <today's date>`.

---

## Step 6 — Sync dotfiles harness copy

File: `/Users/jrg/dotfiles/harnesses/claude-code/CLAUDE.md`

This file must stay identical to `~/.claude/CLAUDE.md`. Apply the exact same changes.

---

## Step 7 — Harness integrations

### Claude Code skill
Create `/Users/jrg/.claude/skills/<toolname>/SKILL.md` if the tool warrants its own slash command in Claude Code (i.e., it's invoked repeatedly during coding sessions). Match the frontmatter pattern of this skill. Also create the dotfiles copy at `/Users/jrg/dotfiles/harnesses/claude-code/skills/<toolname>/SKILL.md`.

Skip if the tool is a background service or daemon with no interactive command use.

### OpenCode slash command
Create `/Users/jrg/.config/opencode/commands/<toolname>.md` and the dotfiles copy at `/Users/jrg/dotfiles/harnesses/opencode/commands/<toolname>.md`.

Use the `!` shell output syntax to run the tool and inject results:
```
---
description: <what this command does>
---
!`/opt/homebrew/bin/<tool> $ARGUMENTS`
```

Or write a richer instructional prompt if needed.

### OpenCode plugin (if warranted)
If the tool should be callable as a tool during agent execution (not just a slash command), create `/Users/jrg/.config/opencode/plugins/<toolname>.ts` and the dotfiles copy. Match the pattern of `/Users/jrg/.config/opencode/plugins/composto.ts`. Add to the `plugin` array in `/Users/jrg/.config/opencode/opencode.json`.

Only create a plugin if a slash command alone is insufficient.

### pi.dev extension
Create `/Users/jrg/.pi/agent/extensions/<toolname>.ts`. Match the exact pattern of `/Users/jrg/.pi/agent/extensions/composto.ts` — same imports, same `pi.registerTool` shape, same error handling.

---

## Step 8 — Commit and push

```bash
cd ~/dotfiles && git add -A && git commit -m "tool: register <toolname> into global dev stack" && git push
```

Report which files were modified, what was committed, and any push failures.

---

## Step 9 — Verification

Confirm each of the following explicitly:
1. `which <tool>` → returns a path
2. `<tool> --version` → exits 0
3. `dev status` → service appears (if port-based)
4. `~/.config/opencode/commands/<toolname>.md` exists
5. `~/.pi/agent/extensions/<toolname>.ts` exists
6. `~/.claude/skills/<toolname>/SKILL.md` exists (if created)
7. `~/.claude/CLAUDE.md` contains the new section
