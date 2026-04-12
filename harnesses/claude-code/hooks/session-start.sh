#!/bin/bash
# ~/.claude/hooks/session-start.sh
# SessionStart hook — bootstraps Anima identity + dev-brain context via executor.
# Fires when a Claude Code session begins or resumes.

EXECUTOR_URL="http://127.0.0.1:8788/mcp"

# Initialize MCP session
INIT_RESPONSE=$(curl -s -X POST "$EXECUTOR_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"claude-code-session-start","version":"1.0.0"}}}' \
  --max-time 5 2>/dev/null)

SESSION_ID=$(echo "$INIT_RESPONSE" | jq -r '.result.sessionId // empty' 2>/dev/null)
MCP_SESSION_ID=$(curl -s -D - -X POST "$EXECUTOR_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"claude-code-session-start","version":"1.0.0"}}}' \
  --max-time 5 2>/dev/null | grep -i "mcp-session-id:" | awk '{print $2}' | tr -d '\r')

if [ -z "$MCP_SESSION_ID" ]; then
  # Executor not available — non-fatal, session continues
  exit 0
fi

# Call bootstrap via executor execute tool
curl -s -X POST "$EXECUTOR_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $MCP_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"execute","arguments":{"code":"const r = await tools[\"executor.primitives.bootstrap\"]({}); return r?.identity ?? r;"}}}' \
  --max-time 15 2>/dev/null > /dev/null

exit 0
