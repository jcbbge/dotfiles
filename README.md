<<<<<<< HEAD
# .dotfiles

Living configuration system. Drop in, use, don't think about it.

## Quick Start (New Machine)

```bash
git clone <this-repo> ~/.dotfiles
cd ~/.dotfiles/dotter
./install
```

Done. Your shell, editor, and dev environment are set up.

## The Rules

**Core configs** (`taxonomy/core/`): Always synced. Just work here.

**Ephemeral** (`taxonomy/ephemeral/`): Scripts and aliases you might share later.

**Experimental** (`taxonomy/experimental/`): Try stuff here. Never commits. If you like it, move to core.

**Deprecated** (`taxonomy/deprecated/`): Old stuff with dates. Historical record.

## Managing Flux

**Adding a new tool:**
1. Just... use it
2. Config goes in `taxonomy/core/`
3. Re-run `./dotter/install`

**Trying something:**
1. Drop config in `taxonomy/experimental/`
2. Use it
3. Like it? Move to core. Don't? Delete it. No repo pollution.

**Switching profiles (work vs personal):**
Edit `state.json` → change `active_profile` → re-run `./install`

## State

`state.json` tracks what's active. Look at it, don't usually edit it.

## The 30-Day Rule

If you haven't touched a core config in 30 days, it moves to deprecated/. Keeps the garden clean.
=======
# dotfiles

Portable macOS setup for this workstation, including shell config, tooling, harness configs, and brain-stack operational notes.

## Assumptions

- Target machine is macOS (Apple Silicon preferred)
- You will run this repo as your user account
- Secrets are provided manually using `{{PLACEHOLDER}}` replacements
- Private credentials are copied manually and never committed

## Quick start

```bash
cd ~/dotfiles
chmod +x install.sh
./install.sh
```

## What this repo installs

- Homebrew formulas and casks from `Brewfile`
- Global npm tools from `npm/globals.sh`
- Cargo binaries from `cargo/install.sh`
- Shell dotfiles (`.zshrc`, `.zprofile`)
- Git config (`.gitconfig`, `.gitignore_global`)
- Harness configs for Claude Desktop, Claude Code, OpenCode, and pi

## Runtime targets (reference)

- node `v25.6.0` (homebrew)
- bun `1.3.10`
- deno `2.6.8`
- python3 `3.14.2`
- go `1.25.7`
- rustc `1.94.1`

## Manual post-install checklist

1. Replace placeholders in templated files
2. Copy private dirs manually:
   - `~/.ssh`
   - `~/.aws`
   - `~/.executor`
3. Install manual binaries:
   - `rtk` into `~/.local/bin`
   - `opencode` custom installer into `~/.opencode/bin`
4. Load and verify LaunchAgents (see `launchagents/README.md`)
5. Install GUI apps (see `apps/README.md`)

## Layout

- `shell/` — zsh config
- `git/` — git config and global ignores
- `npm/` — npm global package setup
- `cargo/` — cargo install scripts
- `harnesses/` — AI harness config snapshots/templates
- `launchagents/` — launchd setup docs for brain stack
- `scripts/` — notes for `~/bin` scripts
- `apps/` — GUI app install checklist
>>>>>>> 37f2d0b (init: full macOS dev environment setup)
