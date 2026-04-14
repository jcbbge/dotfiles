#!/usr/bin/env bash
set -euo pipefail

echo "==> Installing Bun"
BUN_INSTALL_RETRIES=3
BUN_INSTALL_DELAY=5
for i in $(seq 1 $BUN_INSTALL_RETRIES); do
  if curl -fsSL https://bun.sh/install | bash; then
    break
  fi
  if [ $i -lt $BUN_INSTALL_RETRIES ]; then
    echo "Bun install failed, retrying in ${BUN_INSTALL_DELAY}s..."
    sleep $BUN_INSTALL_DELAY
  fi
done

# Global npm packages
npm install -g \
  @anthropic-ai/claude-code@2.1.98 \
  @augmentcode/auggie@0.16.1 \
  @hubspot/cli@8.0.0 \
  @mariozechner/pi-coding-agent@0.66.1 \
  @randomlabs/slate@1.0.25 \
  composto-ai \
  vercel@39.1.3 \
  wrangler@4.12.0 \
  yarn@1.22.19
