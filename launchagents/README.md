# LaunchAgents (brain stack)

Do **not** blindly copy plist files between machines. Existing plists reference absolute paths and usernames.

## Managed services to recreate

- `dev.brain.executor.plist`
- `com.jcbbge.anima-mcp.plist`
- `com.jcbbge.dev-brain-mcp.plist`
- `com.jcbbge.kotadb-app.plist`
- `dev.substrate.mcp.plist`
- `dev.brain.subagent-mcp.plist`
- `dev.brain.surreal.plist`
- `dev.anima.curiosity-worker.plist`
- `dev.anima.synthesis-daemon.plist`
- `dev.anima.emit.plist`
- `dev.brain.ejection.plist`
- `dev.brain.process-watchdog.plist`

## Install flow

1. Create or update each plist in `~/Library/LaunchAgents/` with machine-local paths.
2. Validate plist syntax:
   ```bash
   plutil -lint ~/Library/LaunchAgents/<name>.plist
   ```
3. Load service:
   ```bash
   launchctl load ~/Library/LaunchAgents/<name>.plist
   ```
4. Verify:
   ```bash
   launchctl list | grep -E 'anima|dev.brain|substrate|kotadb|surreal'
   ```

## Notes

- Executor gateway is the single MCP entry point on `:8788`.
- Brain-layer ports are internal; harnesses should not call them directly.
