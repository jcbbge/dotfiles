# System Audit Report - 2026-02-25

## 🐚 SHELL CONFIGURATION
**Primary Shell**: zsh (with substantial config)
- `.zshrc` - 17KB, last modified Feb 24 (ACTIVE - this is your main config)
- `.zprofile` - 942 bytes
- `.bashrc`, `.bash_profile` - Present but likely legacy

**Action**: Migrate `.zshrc` to `taxonomy/core/zsh/`

## 📁 ~/.config/ DIRECTORY (Key Items)

### High Priority (Active Tools)
- `ghostty/` - Terminal emulator (you use this)
- `zed/` - Editor (actively used)
- `starship.toml` - Prompt customization (17KB)
- `claude/` - Claude Code config
- `git/` - Git config directory
- `opencode/` - Another AI tool

### Medium Priority (Used occasionally)
- `gh/` - GitHub CLI config
- `iterm2/` - Terminal (backup terminal?)
- `fish/` - Alternate shell

### Agent/Dev Tools (Many)
- `agents/`, `cagent/`, `goose/`, `aider/` - Multiple AI coding assistants
- This suggests you're in heavy experimentation mode

## 📦 HOMEBREW PACKAGES
**Packages**: 200+ installed (full dev environment)
**Casks**: 8 including OrbStack, ngrok, fonts

**Notable**: You have comprehensive tooling already installed.

## 🔑 SENSITIVE CONFIGS
- `.ssh/config` - 961 bytes (CONTAINS HOSTNAMES/KEYS - handle carefully)
- `.gitconfig` - Present with personal info

## ✅ RECOMMENDED MIGRATION PLAN

### Move to taxonomy/core/ (always synced)
1. `.zshrc` → Split into structured zsh configs
2. `.config/ghostty/` → Terminal config
3. `.config/starship.toml` → Prompt config
4. `.config/git/` → Git settings
5. `.gitconfig` → Core git identity

### Move to taxonomy/ephemeral/ (manual publish)
6. Shell aliases and functions you change often

### Move to taxonomy/experimental/ (not committed)
7. AI tool configs (claude/, opencode/, goose/, etc.)
8. Editor configs you're trying (zed/)

### KEEP OUT of repo (private/sensitive)
9. `.ssh/config` - Create a template instead

### Archive to taxonomy/deprecated/
10. `.bashrc`, `.bash_profile` - bash shell (you use zsh)
