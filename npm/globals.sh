#!/usr/bin/env bash
set -euo pipefail

echo "==> Installing Bun"
curl -fsSL https://bun.sh/install | bash

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
