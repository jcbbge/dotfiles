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
