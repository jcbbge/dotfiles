# ============================================
# .zprofile - Login Shell Configuration
# ============================================
# This file loads AFTER /etc/zprofile (which runs path_helper)
# We need to reset PATH here because macOS path_helper fucks with it

# Rebuild PATH to override macOS path_helper
_BASE_PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:${HOME}/bin:${HOME}/.local/bin:${HOME}/.cargo/bin:${HOME}/.bun/bin:${HOME}/go/bin:./node_modules/.bin:${HOME}/.orbstack/bin:/Applications/Visual Studio Code.app/Contents/Resources/app/bin:${_BASE_PATH}"
export PYENV_ROOT="$HOME/.pyenv"
export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init -)"
unset _BASE_PATH