# MacBook Migration Guide (Definitive)

This is the complete reference for rebuilding this machine from scratch.

---

## 1) Overview

This Mac is a **development + agent-infrastructure workstation** centered around a local brain stack:

- **Executor gateway** (`:8788`) as the single MCP/tool entrypoint
- Brain-layer services: **anima**, **dev-brain**, **kotadb**, **substrate**, **subagent**, backed by SurrealDB
- Multiple local repos in `~/` plus structured docs in `~/Documents`
- A large set of CLI tools, runtimes, AI harnesses, and media/productivity apps

### Canonical filesystem layout

- `~/` — active code repos and operational services
- `~/Documents/_agents` — `agent-core` schema/ADRs/harnesses
- `~/Documents/obsidian` — vault
- `~/dev-backbone` — brain stack service layer (local operational directory, no git)
- `~/dotfiles` — dotfiles repo and this migration guide

---

## 2) Pre-Migration Checklist (Before Wipe)

> Do this before erasing or replacing hardware.

### A. Source code and repos

- [ ] Push all unpushed commits in active repos
- [ ] Record branch names for non-main work
- [ ] Decide fate of local-only repos (push/archive/delete):
  - `~/searcheo`
  - `~/claudearchive`
  - `~/constellation-ts`
  - `~/constellation-gl`
  - `~/constellation-zg`
  - `~/nebula`
- [ ] Back up non-git directories with active work:
  - `~/Infinity/`
  - `~/dev-backbone/`
  - `~/bin/`
  - `~/workspace/`

### B. Secrets and credentials

- [ ] Copy `~/.ssh/` (all keys + `known_hosts`)
- [ ] Copy `~/.aws/` (`config`, `credentials`, `sso`, `cli`, `amazonq`)
- [ ] Copy API-token-bearing config dirs/files (see Sections 6 and 10)
- [ ] Export password manager / ensure recovery codes are accessible
- [ ] Copy `~/Downloads/github-recovery-codes.txt`

### C. Dot/config state

- [ ] Back up all migration-critical dot dirs/files (full list in Section 6)
- [ ] Save LaunchAgents from `~/Library/LaunchAgents` (brain stack labels in Section 8)
- [ ] Save shell configs (`~/.zshrc`, `~/.zprofile`, `~/.zshenv`, `~/.gitconfig`, `~/.npmrc`)

### D. Documents and personal knowledge

- [ ] Copy `~/Documents/` structure (Section 12)
- [ ] Copy Obsidian vault (`~/Documents/obsidian`)
- [ ] Copy session and knowledge directories (`_sessions`, `knowledge`, `metaprompts`)

### E. Downloads triage

- [ ] Copy notable DMGs and irreplaceable files (Section 11)

---

## 3) Fresh Mac Setup Order (Exact Sequence)

> Follow this order to minimize breakage.

1. **macOS base + Apple ID**
   - Sign in to iCloud/App Store
   - Enable FileVault, Touch ID, and system updates

2. **Install Xcode Command Line Tools**
   ```bash
   xcode-select --install
   ```

3. **Install Homebrew**
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
   Then initialize shell env per installer output.

4. **Restore dotfiles repo and baseline shell config**
   ```bash
   git clone git@github.com:jcbbge/dotfiles.git ~/dotfiles
   ```
   - Restore/symlink `~/.zshrc`, `~/.zprofile`, `~/.zshenv`, `~/.gitconfig`

5. **Install core CLI formulas**
   ```bash
   brew install git gh node bun deno python go rustup-init jq ripgrep fzf bat fd curl awscli doctl mkcert ngrok ollama ffmpeg git-filter-repo git-secrets bash llvm@20 elixir erlang gleam executor
   ```

6. **Install cask applications (baseline)**
   - Use cask set in Section 4

7. **Install runtimes and verify versions**
   - Node, Bun, Deno, Python, Go, Rust (Section 5)

8. **Install global package managers/tools**
   - npm globals, cargo binaries, custom binaries (Section 5)

9. **Restore SSH + Git auth**
   - Copy `~/.ssh`
   - Add keys to ssh-agent
   - Test `ssh -T git@github.com`

10. **Clone projects and operational dirs**
    - Clone active repos first (Section 7)
    - Restore local non-git work dirs from backup

11. **Set up brain stack services + LaunchAgents**
    - Restore `~/executor`, `~/dev-backbone`, related configs
    - Load LaunchAgents (Section 8)

12. **Set up harnesses**
    - Claude Desktop/CLI, opencode, pi, slate, etc. (Section 9)

13. **Restore credentials and cloud CLIs**
    - AWS, ngrok, cloud tokens, `.env` files (Section 10)

14. **Install manual apps from App Store/DMG**
    - Complete Section 4 manual tables

15. **Final validation pass**
    - Verify key binaries, services, repos, and app launches

---

## 4) Applications

### A) Install via Homebrew

Use Homebrew for anything available there first (easier reproducibility and upgrades).

| Type | Package | Install Command | Notes |
|---|---|---|---|
| Formula | `awscli` | `brew install awscli` | AWS CLI |
| Formula | `bash` | `brew install bash` | Newer bash |
| Formula | `bun` | `brew install bun` | JS runtime |
| Formula | `curl` | `brew install curl` | Networking |
| Formula | `deno` | `brew install deno` | JS/TS runtime |
| Formula | `doctl` | `brew install doctl` | DigitalOcean CLI |
| Formula | `elixir` | `brew install elixir` | Lang runtime |
| Formula | `erlang` | `brew install erlang` | Erlang VM |
| Formula | `executor` | `brew install executor` | Brain stack binary |
| Formula | `ffmpeg` | `brew install ffmpeg` | Media tooling |
| Formula | `gh` | `brew install gh` | GitHub CLI |
| Formula | `git` | `brew install git` | VCS |
| Formula | `git-filter-repo` | `brew install git-filter-repo` | Git history surgery |
| Formula | `git-secrets` | `brew install git-secrets` | Secret scanning |
| Formula | `gleam` | `brew install gleam` | Lang runtime |
| Formula | `go` | `brew install go` | Go toolchain |
| Formula | `jq` | `brew install jq` | JSON CLI |
| Formula | `llvm@20` | `brew install llvm@20` | Compiler toolchain |
| Formula | `mkcert` | `brew install mkcert` | Local TLS certs |
| Formula | `ngrok` | `brew install ngrok` | Tunnels |
| Formula | `node` | `brew install node` | Node runtime |
| Formula | `ollama` | `brew install ollama` | Local LLM runtime |
| Formula | `ripgrep` | `brew install ripgrep` | Fast grep |
| Formula | `fzf` | `brew install fzf` | Fuzzy finder |
| Formula | `bat` | `brew install bat` | Better cat |
| Formula | `fd` | `brew install fd` | Better find |
| Cask | `db-browser-for-sqlite` | `brew install --cask db-browser-for-sqlite` | Installed currently |
| Cask | `font-monaspace` | `brew install --cask font-monaspace` | Installed currently |
| Cask | `ghostty` | `brew install --cask ghostty` | Installed currently |
| Cask | `hstracker` | `brew install --cask hstracker` | Installed currently |
| Cask | `iterm2` | `brew install --cask iterm2` | Installed currently |
| Cask | `leader-key` | `brew install --cask leader-key` | Installed currently |
| Cask | `mitmproxy` | `brew install --cask mitmproxy` | Installed currently |
| Cask | `ngrok` | `brew install --cask ngrok` | If app bundle needed |
| Cask | `obsidian` | `brew install --cask obsidian` | Installed app |
| Cask | `only-switch` | `brew install --cask only-switch` | Installed currently |
| Cask | `orbstack` | `brew install --cask orbstack` | Installed currently |
| Cask | `protonvpn` | `brew install --cask protonvpn` | Installed app |
| Cask | `rectangle` | `brew install --cask rectangle` | Installed app |
| Cask | `spotify` | `brew install --cask spotify` | Installed app |
| Cask | `visual-studio-code` | `brew install --cask visual-studio-code` | Installed app |
| Cask | `whatsapp` | `brew install --cask whatsapp` | Installed app |
| Cask | `zoom` | `brew install --cask zoom` | Installed app |
| Cask | `zed` | `brew install --cask zed` | Installed app |
| Cask | `firefox` | `brew install --cask firefox` | Installed app |
| Cask | `google-chrome` | `brew install --cask google-chrome` | Installed app |
| Cask | `discord` | `brew install --cask discord` | Add per standard set |
| Cask | `slack` | `brew install --cask slack` | Add per standard set |

> Also available via brew if preferred: `1password`, `alfred`, `arc`, `bartender`, `bettertouchtool`, `bitwarden`, `brave-browser`, `claude`, `cursor`, `docker`, `figma`, `google-drive`, `karabiner-elements`, `loom`, `notion`, `postico`, `proxyman`, `raycast`, `screen-studio`, `screenflow`, `signal`, `sketch`, `tableplus`, `telegram`, `warp`, `vlc`, etc.

### B) Install from App Store (manual)

| App | Notes |
|---|---|
| Xcode | Required for full Apple dev workflows; large install |
| GarageBand | Free |
| Numbers | Free |
| TestFlight | Needed for beta installs |
| Stretch It | Likely App Store install |
| Safari | Built in (verify iCloud sync/settings) |

### C) Install from website / DMG (manual)

| App | Source |
|---|---|
| Affinity suite / Affinity.app | https://affinity.serif.com (`Affinity.dmg`) |
| DaVinci Resolve | https://www.blackmagicdesign.com/products/davinciresolve |
| Blackmagic RAW / Proxy Generator Lite | https://www.blackmagicdesign.com |
| Factory.app | https://www.factory.ai (`Factory-0.10.1-arm64.dmg`) |
| Flux.app (your project) | Build from `~/flux` source |
| Intent by Augment | https://www.augmentcode.com |
| Meld Studio | https://meldstudio.co (`MeldStudioInstaller.dmg`) |
| OpenCode Desktop | https://opencode.ai (`OpenCode Desktop.dmg`) |
| Pika | https://superhighfives.com/pika |
| TikTok LIVE Studio | https://www.tiktok.com/studio (`tiktok_live_studio`) |
| Tuna | https://tunaapp.com |
| Granola | https://www.granola.ai (`Granola-5.45.0-mac-universal.dmg`) |
| Windsurf | https://windsurf.ai (`Windsurf-darwin-arm64-1.9.0.dmg`) |
| Hex | https://hex.tech (`hex-latest.dmg`) |
| Antigravity | local DMG (`Antigravity.dmg`) |
| PigeonCast | unknown source; recover from backup if still needed |
| Spaced | unknown source; recover from backup if still needed |
| Blackmagic Proxy Generator Lite | bundled Blackmagic installer flow |

---

## 5) Dev Environment

### Target runtime versions

- Node: **v25.6.0**
- Bun: **1.3.10**
- Deno: **2.6.8**
- Python3: **3.14.2**
- Go: **1.25.7**
- Rust: **rustc 1.94.1** (via rustup)

### Global npm packages

```bash
npm install -g \
  @anthropic-ai/claude-code@2.1.98 \
  @augmentcode/auggie@0.16.1 \
  @hubspot/cli@8.0.0 \
  @mariozechner/pi-coding-agent@0.66.1 \
  @randomlabs/slate@1.0.25 \
  vercel@39.1.3 \
  wrangler@4.12.0 \
  yarn@1.22.19
```

### Cargo installs

```bash
cargo install colgrep
```

### Key binary checks

```bash
node -v
bun -v
deno --version
python3 --version
go version
rustc --version
colgrep --version
gh --version
aws --version
ngrok version
jq --version
```

### Non-brew/manual binaries

- `rtk` (`~/.local/bin/rtk`) — Random Labs manual binary
- `opencode` (`~/.opencode/bin/opencode`) — custom installer
- `pi` (`~/.local/bin/pi`) — npm package + local bin setup

---

## 6) Dotfiles & Config

### Migrate these dot dirs/files

- `~/.anima`
- `~/.aws`
- `~/.bun`
- `~/.cargo`
- `~/.claude`
- `~/.config`
- `~/.constellation`
- `~/.dev-brain`
- `~/.docker`
- `~/.executor`
- `~/.fieldtheory`
- `~/.gemini`
- `~/.gitconfig`
- `~/.harness`
- `~/.kotadb`
- `~/.kube`
- `~/.local`
- `~/.mcp-auth`
- `~/.npmrc`
- `~/.ollama`
- `~/.opencode`
- `~/.opencode.json`
- `~/.pi`
- `~/.project-bookmarks`
- `~/.railway`
- `~/.roux`
- `~/.scratchpad`
- `~/.slate`
- `~/.ssh`
- `~/.surrealdb`
- `~/.wrangler`
- `~/.zprofile`
- `~/.zshrc`
- `~/.zshenv`
- `~/.ghostty-theme-*.zsh`

### Symlink vs copy guidance

- **Symlink from `~/dotfiles`** (versioned): shell files, git config templates, editor settings intended for source control
- **Copy directly (never symlink to public repo)**: secrets, tokens, SSH keys, cloud credentials, machine identity files

### Do NOT commit

- Private keys (`~/.ssh/*` except public `.pub` if intentional)
- `~/.aws/credentials`, SSO tokens
- `.env` files and API keys
- `~/.mcp-auth`, `~/.opencode.json`, provider tokens in `~/.config`
- Recovery codes, personal exports

---

## 7) Projects

### A) Clone active own repos first

```bash
git clone git@github.com:jcbbge/anima.git ~/anima
git clone git@github.com:jcbbge/executor.git ~/executor
git clone git@github.com:jcbbge/substrate.git ~/substrate
git clone git@github.com:jcbbge/flux.git ~/flux
git clone git@github.com:jcbbge/qrcoder.git ~/qrcoder
git clone git@github.com:jcbbge/binchotan.git ~/binchotan
git clone git@github.com:jcbbge/roux.git ~/roux
git clone git@github.com:jcbbge/omni.git ~/omni
git clone git@github.com:jcbbge/ghostpencode.git ~/ghostpencode
git clone git@github.com:jcbbge/agent-core.git ~/Documents/_agents
```

### B) Clone forks / third-party

```bash
git clone https://github.com/jayminwest/kotadb ~/kotadb
git -C ~/kotadb checkout develop

git clone https://github.com/wedow/harness.git ~/harness
git clone https://github.com/pranavp10/invoice-generator.git ~/invoice-generator
```

### C) Local-only repos requiring decision

| Path | Last activity | Action needed |
|---|---:|---|
| `~/searcheo` | 8 weeks ago | Decide: push to GitHub or archive |
| `~/claudearchive` | 10 weeks ago | Decide: push or archive |
| `~/constellation-ts` | 4 weeks ago | Decide: push or keep local |
| `~/constellation-gl` | 2 weeks ago | Decide: push or keep local |
| `~/constellation-zg` | 4 days ago | **High priority** decision + backup |
| `~/nebula` | no commits | Decide whether to initialize or remove |

### D) Restore non-git directories

- `~/Infinity/` (active client work)
- `~/dev-backbone/` (service layer)
- `~/bin/`
- `~/workspace/`
- experimental dirs: `~/agenticdeck`, `~/cortex`, `~/manifold`, `~/meridian`, `~/sigil`, `~/spacely`, `~/peach`, `~/smolgentic`

---

## 8) Brain Stack Setup (Executor + Brain Layers)

### Services/LaunchAgents to restore

- `dev.brain.executor`
- `com.jcbbge.anima-mcp`
- `com.jcbbge.dev-brain-mcp`
- `com.jcbbge.kotadb-app`
- `dev.substrate.mcp`
- `dev.brain.subagent-mcp`
- `dev.brain.surreal`
- `dev.anima.curiosity-worker`
- `dev.anima.synthesis-daemon`
- `dev.anima.emit`
- `dev.brain.ejection`
- `dev.brain.process-watchdog`

### Bring-up sequence

1. Ensure repos/directories exist: `~/executor`, `~/anima`, `~/substrate`, `~/dev-backbone`, etc.
2. Restore service configs from backups/dot dirs (`~/.executor`, `~/.anima`, `~/.dev-brain`, `~/.kotadb`, `~/.surrealdb`).
3. Load LaunchAgents:
   ```bash
   launchctl load ~/Library/LaunchAgents/dev.brain.executor.plist
   # repeat for each agent plist as needed
   ```
4. Verify executor gateway on `:8788`.
5. Verify brain layers reachable **through executor gateway**, not direct service ports.

### Fallback start

```bash
cd ~/executor
bun apps/executor/src/cli/main.ts __local-server --port 8788
```

---

## 9) Harnesses

### Claude Desktop

- Restore old MCP configs from `~/ClaudeDesktop/` as needed
- Validate integration with local tooling after credentials restored

### Claude Code CLI

- Install globally: `npm i -g @anthropic-ai/claude-code@2.1.98`
- Restore `~/.claude`
- Confirm auth/session works

### OpenCode

- Restore binary (`~/.opencode/bin`) or install desktop from DMG
- Restore `~/.opencode` and `~/.opencode.json`

### pi.dev agent

- Install: `npm i -g @mariozechner/pi-coding-agent@0.66.1`
- Ensure `~/.local/bin` in PATH
- Restore `~/.pi`

### Slate + related agent tooling

- Install: `npm i -g @randomlabs/slate@1.0.25`
- Restore `~/.slate`, `~/.harness`, `~/.mcp-auth`

---

## 10) Secrets & Credentials (Manual Migration)

### Must-copy secure data

- `~/.ssh/` keys:
  - `codecommit_rsa`
  - `digocean`
  - `github_rsa`
  - `github_rsa_old`
  - `id_ed25519`
  - `id_rsa`
  - `id_sourcestrike_rsa`
  - `infinity_github_ed25519`
  - `temp-dump-key.pem`
  - `known_hosts`
- `~/.aws/`:
  - `config`, `credentials`, `sso`, `cli`, `amazonq`
- API-token config dirs:
  - `~/.mcp-auth`, `~/.opencode*`, `~/.claude`, `~/.pi`, `~/.wrangler`, `~/.railway`, cloud/tool configs under `~/.config`
- Project `.env` files from each repo/work directory

### Post-restore permission fix

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/*
chmod 644 ~/.ssh/*.pub
```

### Auth verification checklist

- [ ] `ssh -T git@github.com`
- [ ] `gh auth status`
- [ ] `aws sts get-caller-identity`
- [ ] `ngrok config check`

---

## 11) Downloads — Worth Keeping

Copy these from `~/Downloads` before wipe:

- `github-recovery-codes.txt` (**critical**)
- `Factory-0.10.1-arm64.dmg`
- `MeldStudioInstaller.dmg`
- `OpenCode Desktop.dmg`
- `ProtonVPN_mac_v6.0.0.dmg`
- `Granola-5.45.0-mac-universal.dmg`
- `Windsurf-darwin-arm64-1.9.0.dmg`
- `hex-latest.dmg`
- `Antigravity.dmg`
- `tiktok_live_studio` installer files
- `Affinity.dmg`
- `jcbbge_voice_profile_enhanced.md`
- ZSA Moonlander `.bin` layout files (all 3)
- `peach-archive-*` zip archives
- Resume PDFs
- Solid.js ebooks/course materials

---

## 12) Documents — What to Sync

Sync/backup entire `~/Documents/` tree, especially:

- `_agents/` (git-backed, maps to `agent-core`)
- `_development/`
- `_inbox/`
- `_sessions/`
- `_systems/`
- `knowledge/`
- `metaprompts/`
- `obsidian/`
- `projects/`
- `scratchpad.md`
- `DSPY_research.md`

---

## Optional: One-shot bootstrap skeleton

```bash
# 1) Core setup
xcode-select --install
# install brew, then:
brew install git gh node bun deno python go rustup-init jq ripgrep fzf bat fd curl awscli doctl mkcert ngrok ollama ffmpeg git-filter-repo git-secrets bash llvm@20 elixir erlang gleam executor

# 2) Casks
brew install --cask ghostty iterm2 visual-studio-code zed orbstack db-browser-for-sqlite mitmproxy leader-key hstracker only-switch rectangle protonvpn spotify obsidian whatsapp zoom firefox google-chrome discord slack font-monaspace

# 3) npm globals
npm install -g @anthropic-ai/claude-code@2.1.98 @augmentcode/auggie@0.16.1 @hubspot/cli@8.0.0 @mariozechner/pi-coding-agent@0.66.1 @randomlabs/slate@1.0.25 vercel@39.1.3 wrangler@4.12.0 yarn@1.22.19

# 4) cargo
cargo install colgrep
```

---

## Final Validation Checklist

- [ ] Shell and PATH load correctly in new terminal
- [ ] All target runtimes return expected versions
- [ ] Global npm + cargo tools available
- [ ] SSH and GitHub auth verified
- [ ] AWS auth verified
- [ ] Core repos cloned and on correct branches
- [ ] Brain stack LaunchAgents loaded and healthy
- [ ] Executor gateway reachable
- [ ] Critical apps installed and launching
- [ ] Documents and downloads restored

---

Maintainer: `jcbbge`
Last updated: migration baseline snapshot
File: `~/dotfiles/MIGRATION_GUIDE.md`
