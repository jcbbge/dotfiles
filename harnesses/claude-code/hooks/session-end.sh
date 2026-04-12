#!/bin/bash
# ~/.claude/hooks/session-end.sh
# SessionEnd hook — writes Anima session reflection via executor.
# Fires when a Claude Code session terminates.

EXECUTOR_URL="http://127.0.0.1:8788/mcp"

# Read session info from stdin
INPUT=$(cat)
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)

# Get MCP session ID via initialize
MCP_SESSION_ID=$(curl -s -D - -X POST "$EXECUTOR_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"claude-code-session-end","version":"1.0.0"}}}' \
  --max-time 5 2>/dev/null | grep -i "mcp-session-id:" | awk '{print $2}' | tr -d '\r')

if [ -z "$MCP_SESSION_ID" ]; then
  exit 0
fi

# Write session close to Anima
curl -s -X POST "$EXECUTOR_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $MCP_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"execute","arguments":{"code":"const r = await tools[\"anima.anima_session_close\"]({ trajectory: \"claude-code session ended\", warmth: 3 }); return r;"}}}' \
  --max-time 15 2>/dev/null > /dev/null

exit 0
