# ============================================
# .zshrc - Interactive Shell Configuration
# ============================================
# This file loads ONLY for interactive shells (terminals you type in).
# Environment variables and PATH are already set by .zshenv.
#
# RULE: No exports here. Use aliases, functions, completions, prompt.

# ============================================
# Completions (cached - only regenerates when needed)
# ============================================
autoload -Uz compinit
compinit -C

# ============================================
# Ghostty Integration
# ============================================
if [ -n "${GHOSTTY_RESOURCES_DIR}" ]; then
    builtin source "${GHOSTTY_RESOURCES_DIR}/shell-integration/zsh/ghostty-integration"
fi

if [ -f "$HOME/.ghostty-theme-integration.zsh" ]; then
    source "$HOME/.ghostty-theme-integration.zsh"
fi

# ============================================
# Directory Aliases
# ============================================
alias main-projects="cd $HOME"
alias web="cd $HOME/webdevelopment"
alias next="cd $HOME/webdevelopment/nextjs"
alias solid="cd $HOME/webdevelopment/solidjs"

# ============================================
# Editor Aliases (wrapper scripts handle bookmarks)
# ============================================
alias code='/Applications/Visual\ Studio\ Code.app/Contents/Resources/app/bin/code'
alias zsh-config="/Applications/Visual\ Studio\ Code.app/Contents/Resources/app/bin/code ~/.zshrc"


# ============================================

# ============================================
# Helper Aliases
# ============================================
alias check-env="brew doctor"
# Machine-specific aliases (M1 only)
if [[ $(hostname) == *'jcbbge'* ]]; then
  alias ecr='aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 918760427934.dkr.ecr.us-east-2.amazonaws.com'
  alias openrouter='node $HOME/OpenRouter/openrouter.js'
fi

# ============================================
# Modern CLI Replacements
# ============================================
# These replace built-in commands with better versions
# (only active if the tools are installed via brew)
command -v eza >/dev/null && alias ls='eza --icons --group-directories-first'
command -v eza >/dev/null && alias ll='eza -la --icons --group-directories-first --git'
command -v eza >/dev/null && alias lt='eza --tree --icons --level=2'
command -v bat >/dev/null && alias cat='bat --paging=never'
command -v fd >/dev/null && alias find='fd'
command -v rg >/dev/null && alias grep='rg'

# fzf — fuzzy finder (Ctrl+T files, Ctrl+R history, Alt+C dirs)
if command -v fzf >/dev/null; then
    eval "$(fzf --zsh)"
    export FZF_DEFAULT_COMMAND='fd --type f --hidden --follow --exclude .git'
    export FZF_CTRL_T_COMMAND="$FZF_DEFAULT_COMMAND"
    export FZF_DEFAULT_OPTS='--height 40% --layout=reverse --border'
fi

# ============================================
# Project Scaffolding
# ============================================
create-project() {
    if [ $# -lt 2 ]; then
        echo "Usage: create-project <type> <n>"
        echo "Types: next, solid"
        return 1
    fi

    local type=$1
    local name=$2

    case "$type" in
        "next")
            cd $HOME/webdevelopment/nextjs && \
            create-next-project "$name" && \
            cd "$name"
            ;;
        "solid")
            cd $HOME/webdevelopment/solidjs && \
            create-solid-project "$name" && \
            cd "$name"
            ;;
        *)
            echo "Unknown project type. Use: next or solid"
            return 1
            ;;
    esac
}

# ============================================
# Git Agent Attribution (Auto-detect AI model)
# ============================================
git() {
    if [[ "$1" == "commit" ]]; then
        local agent=$(~/.config/git-agents/detect-agent.sh)

        if [ "$agent" != "me" ]; then
            local profiles_file=~/.config/git-agents/profiles.json
            if [ -f "$profiles_file" ]; then
                local profile=$(cat "$profiles_file" | bun -e 'const p = JSON.parse(require("fs").readFileSync(0, "utf-8")); const a = p.profiles["'"$agent"'"]; if (a) { console.log(a.name + "|" + a.email); }')

                if [ -n "$profile" ]; then
                    local name="${profile%|*}"
                    local email="${profile#*|}"

                    env GIT_AUTHOR_NAME="$name" \
                        GIT_AUTHOR_EMAIL="$email" \
                        GIT_COMMITTER_NAME="$name" \
                        GIT_COMMITTER_EMAIL="$email" \
                        command git "$@"
                    return $?
                fi
            fi
        fi
    fi

    command git "$@"
}

# Bookmark Navigation (overrides for tab completion)
# ============================================
cd() {
    if [ $# -eq 1 ]; then
        case "$1" in
            -|~*|/*|.*)
                builtin cd "$@"
                return
                ;;
        esac

        local project_path
        project_path=$(command grep "^$1=" ~/.project-bookmarks 2>/dev/null | cut -d'=' -f2-)

        if [ -n "$project_path" ]; then
            if [ ! -d "$project_path" ]; then
                echo "⚠️  Warning: Bookmarked path no longer exists: $project_path"
                echo "Run 'bookmark validate' to check all bookmarks"
                return 1
            fi
            builtin cd "$project_path"
            return
        fi
    fi

    builtin cd "$@"
}

# ============================================
# Zsh Prompt (Pure Zsh - no external dependencies)
# ============================================
autoload -Uz vcs_info
precmd() { vcs_info }

zstyle ':vcs_info:git:*' formats '%F{green}  %b%f'
zstyle ':vcs_info:git:*' actionformats '%F{green}  %b%f %F{yellow}(%a)%f'
zstyle ':vcs_info:*' enable git
zstyle ':vcs_info:git:*' check-for-changes true
zstyle ':vcs_info:git:*' stagedstr '%F{yellow}+%f'
zstyle ':vcs_info:git:*' unstagedstr '%F{red}*%f'
zstyle ':vcs_info:git:*' formats '%F{green}  %b%f%c%u'

setopt PROMPT_SUBST

PROMPT='%F{blue}%3~%f ${vcs_info_msg_0_}
%(?.%F{green}.%F{red})>%f '

# ============================================
# Tab Completions
# ============================================
BOOKMARKS_FILE="$HOME/.project-bookmarks"

_get_bookmarks() {
    if [ -f "$BOOKMARKS_FILE" ]; then
        cut -d'=' -f1 "$BOOKMARKS_FILE"
    fi
}

_bookmark_completion() {
    local -a subcmds
    subcmds=('list:list all bookmarks' 'ls:list all bookmarks' 'rm:remove a bookmark' 'edit:edit bookmarks file' 'validate:check if paths exist' 'help:show help')

    if (( CURRENT == 2 )); then
        _alternative \
            'commands:subcommands:_describe "bookmark commands" subcmds' \
            'bookmarks:bookmarks:compadd $(_get_bookmarks)'
    elif (( CURRENT == 3 )) && [[ "${words[2]}" == "rm" ]]; then
        _values 'bookmarks' $(_get_bookmarks)
    fi
}

compdef _bookmark_completion bookmark

_project_completion() {
    local -a projects
    projects=($(_get_bookmarks))
    _arguments '*:project:compadd -a projects'
}

compdef _project_completion code
compdef _project_completion zed

_bookmark_cd_completion() {
    if (( CURRENT == 2 )); then
        local -a projects
        projects=($(_get_bookmarks))
        compadd -a projects
        return
    fi
    _cd
}

compdef _bookmark_cd_completion cd

# Anima / local services config
export SURREAL_URL={{SURREAL_URL}}
export SURREAL_NS={{SURREAL_NS}}
export SURREAL_DB={{SURREAL_DB}}
export SURREAL_USER={{SURREAL_USER}}
export SURREAL_PASS={{SURREAL_PASS}}
export OLLAMA_URL={{OLLAMA_URL}}

# opencode + local bin path
export PATH="$HOME/.opencode/bin:$PATH"
export PATH="$HOME/.local/bin:$PATH"

# API keys / runtime toggles
export PERPLEXITY_API_KEY={{PERPLEXITY_API_KEY}}
export KOTADB_MAX_INSTANCES={{KOTADB_MAX_INSTANCES}}
# pi-update: update pi harness then re-apply all patches
pi-update() {
    echo "Updating pi..."
    npm update -g @mariozechner/pi-coding-agent
    echo "Re-applying patches..."
    ~/.pi/agent/patch-pi-ai.sh
    ~/.pi/patches/apply.sh
    echo "Done."
}
export RTK_TELEMETRY_DISABLED=1

# ============================================
# Port Management
# ============================================
# Registry: ~/dotfiles/PORTS.md
port() {
    case "${1:-list}" in
        list)
            echo "Listening ports (non-Apple):"
            lsof -iTCP -sTCP:LISTEN -P 2>/dev/null \
                | awk 'NR>1 {print $9, $1, $3}' \
                | grep -v 'com.apple\|ARDAgent\|ControlCe\|rapportd' \
                | sort -t: -k2 -n \
                | awk '{split($1,a,":"); printf "  %-6s %s (%s)\n", a[length(a)], $2, $3}'
            ;;
        check)
            if [[ -z "$2" ]]; then echo "Usage: port check <number>"; return 1; fi
            local result
            result=$(lsof -iTCP:$2 -sTCP:LISTEN -P 2>/dev/null | awk 'NR>1 {print $1, $3, $9}')
            if [[ -z "$result" ]]; then
                echo "$2 is free"
            else
                echo "$2 is in use: $result"
            fi
            ;;
        kill)
            if [[ -z "$2" ]]; then echo "Usage: port kill <number>"; return 1; fi
            local pid
            pid=$(lsof -ti TCP:$2 -sTCP:LISTEN 2>/dev/null)
            if [[ -z "$pid" ]]; then
                echo "Nothing on port $2"
            else
                echo "Killing PID $pid on port $2"
                kill -9 $pid
            fi
            ;;
        *)
            echo "Usage: port [list|check <n>|kill <n>]"
            ;;
    esac
}
