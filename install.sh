#!/usr/bin/env bash
set -euo pipefail

# dotfiles/install.sh
# Assumptions:
# - Running on macOS
# - Repo is checked out at ~/dotfiles (or install.sh is run from within repo)
# - You have sudo access on this machine

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() {
  printf "\n\033[1;34m==> %s\033[0m\n" "$1"
}

warn() {
  printf "\033[1;33m[warn]\033[0m %s\n" "$1"
}

backup_if_exists() {
  local target="$1"
  if [ -e "$target" ] || [ -L "$target" ]; then
    local backup="${target}.backup.$(date +%Y%m%d%H%M%S)"
    mv "$target" "$backup"
    warn "Backed up $target -> $backup"
  fi
}

link_file() {
  local source="$1"
  local target="$2"
  mkdir -p "$(dirname "$target")"
  backup_if_exists "$target"
  ln -s "$source" "$target"
  echo "Linked $target -> $source"
}

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This installer supports macOS only."
  exit 1
fi

log "Installing Xcode Command Line Tools (if needed)"
if ! xcode-select -p >/dev/null 2>&1; then
  xcode-select --install || true
  warn "Xcode CLT installation triggered. Re-run this script once installation completes."
fi

log "Installing Homebrew (if needed)"
if ! command -v brew >/dev/null 2>&1; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Ensure brew in PATH for this script execution
if [[ -x /opt/homebrew/bin/brew ]]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [[ -x /usr/local/bin/brew ]]; then
  eval "$(/usr/local/bin/brew shellenv)"
fi

log "Installing Homebrew formulas and casks from Brewfile"
brew bundle --file "$ROOT_DIR/Brewfile"

log "Installing npm global packages"
bash "$ROOT_DIR/npm/globals.sh"

log "Installing cargo packages"
if command -v cargo >/dev/null 2>&1; then
  bash "$ROOT_DIR/cargo/install.sh"
else
  warn "cargo not found; skipping cargo installs (install Rust first)."
fi

log "Linking shell config"
link_file "$ROOT_DIR/shell/.zshrc" "$HOME/.zshrc"
link_file "$ROOT_DIR/shell/.zprofile" "$HOME/.zprofile"

log "Linking git config"
link_file "$ROOT_DIR/git/.gitconfig" "$HOME/.gitconfig"
link_file "$ROOT_DIR/git/.gitignore_global" "$HOME/.gitignore_global"

log "Installing harness configs"
# Claude Desktop
mkdir -p "$HOME/Library/Application Support/Claude"
cp "$ROOT_DIR/harnesses/claude-desktop/claude_desktop_config.json" "$HOME/Library/Application Support/Claude/claude_desktop_config.json"

# Claude Code
mkdir -p "$HOME/.claude/hooks"
cp "$ROOT_DIR/harnesses/claude-code/settings.json" "$HOME/.claude/settings.json"
cp "$ROOT_DIR/harnesses/claude-code/CLAUDE.md" "$HOME/.claude/CLAUDE.md"
cp "$ROOT_DIR/harnesses/claude-code/hooks/"*.sh "$HOME/.claude/hooks/"
chmod +x "$HOME/.claude/hooks/"*.sh

# OpenCode
mkdir -p "$HOME/.config/opencode/plugins"
cp "$ROOT_DIR/harnesses/opencode/opencode.json" "$HOME/.config/opencode/opencode.json"
cp "$ROOT_DIR/harnesses/opencode/plugins/"*.ts "$HOME/.config/opencode/plugins/"

# pi
mkdir -p "$HOME/.pi/agent/extensions/perplexity"
cp "$ROOT_DIR/harnesses/pi/settings.json" "$HOME/.pi/agent/settings.json"
cp "$ROOT_DIR/harnesses/pi/extensions/"*.ts "$HOME/.pi/agent/extensions/"
cp "$ROOT_DIR/harnesses/pi/extensions/perplexity/index.ts" "$HOME/.pi/agent/extensions/perplexity/index.ts"
cp "$ROOT_DIR/harnesses/pi/extensions/perplexity/package.json" "$HOME/.pi/agent/extensions/perplexity/package.json"

log "Done"
cat <<'EOF'

Next manual steps:
1) Fill placeholders in:
   - shell/.zshrc
   - git/.gitconfig
   - harnesses/claude-desktop/claude_desktop_config.json
2) Copy private material manually (never commit):
   - ~/.ssh
   - ~/.aws
   - ~/.executor
3) Install non-brew binaries:
   - rtk (manual binary install to ~/.local/bin)
   - opencode custom installer (~/.opencode/bin)
4) Review launch agents in launchagents/README.md
5) Install GUI apps from apps/README.md

EOF
