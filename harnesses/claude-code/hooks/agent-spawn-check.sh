#!/bin/bash
# Pre-flight hook: fires before every Agent tool call.
# Prints the delegation checklist to stderr so it appears in the hook panel.
# Does NOT block — exit 0 always. This is a reminder, not a gate.

cat >&2 <<'EOF'
╔══════════════════════════════════════════════════════════════╗
║  AGENT SPAWN — PRE-FLIGHT CHECK                              ║
╠══════════════════════════════════════════════════════════════╣
║  Before this spawn prompt goes out, confirm:                 ║
║                                                              ║
║  □ Every shell command has been run by the lead              ║
║  □ Every file path has been confirmed to exist               ║
║  □ Every API endpoint has been hit (auth verified)           ║
║  □ No streaming commands without termination                 ║
║  □ No interactive commands (no TTY, no prompts)              ║
║  □ All credentials resolved from actual config               ║
║  □ Expected output documented for every task                 ║
║  □ 3-minute check-in deadline set                            ║
║                                                              ║
║  Agents execute. They do not explore.                        ║
╚══════════════════════════════════════════════════════════════╝
EOF

exit 0
