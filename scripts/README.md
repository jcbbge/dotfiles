# ~/bin scripts inventory

This repo does not copy `~/bin` wholesale. Review and migrate intentionally.

## High-priority scripts observed

- `agent-spawn-check.sh` (already copied into `harnesses/claude-code/hooks/`)
- `bookmark`
- `deploy-plist`
- `process-harness`
- `process-watchdog`
- `tri-layer-session.sh`
- `tri-layer-close.sh`
- `ghostpencode` / `ghostpencode-watch`
- `sync-metaprompts`

## Migration strategy

1. Audit each script for machine-specific paths.
2. Move portable scripts into a tracked repo directory (for example `scripts/bin/`).
3. Add installation/linking logic in `install.sh` once scripts are normalized.
4. Keep large binaries out of git (for example local `opencode.real`, `surreal`).
