#!/bin/bash
set -e

NODE_BIN=$(bash /nix/store/bmirb5k0vksybajy1wrfgq9ckgs37q0c-replit-runtime-path/bin/available-pid2-node-paths 2>/dev/null | head -1)
if [ -z "$NODE_BIN" ]; then
  echo "ERROR: Could not locate node binary" >&2
  exit 1
fi

NODE_DIR=$(dirname "$NODE_BIN")
NPM_CLI="$NODE_DIR/../lib/node_modules/npm/bin/npm-cli.js"

echo "Using node: $NODE_BIN"
"$NODE_BIN" "$NPM_CLI" install
