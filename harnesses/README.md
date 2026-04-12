# Harness setup

This directory snapshots harness configurations from the source machine.

## Included

- `claude-desktop/claude_desktop_config.json`
- `claude-code/settings.json`, `claude-code/CLAUDE.md`, `claude-code/hooks/*`
- `opencode/opencode.json`, `opencode/plugins/*`
- `pi/settings.json`, `pi/extensions/*`

## Apply on a new machine

`install.sh` copies these files into:

- `~/Library/Application Support/Claude/`
- `~/.claude/`
- `~/.config/opencode/`
- `~/.pi/agent/`

## Required manual edits

- Replace all `{{PLACEHOLDER}}` values before use.
- Verify absolute paths (for example `/Users/<you>/...`) in hook configs.
- Keep private auth files out of git:
  - `~/.claude/` secrets if added later
  - `~/.executor/` scope
