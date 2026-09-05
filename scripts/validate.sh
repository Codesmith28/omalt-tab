#!/usr/bin/env bash
# scripts/validate.sh — Validate plugin manifest, client script, and Lua syntax
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "--> Validating plugin manifest..."
if command -v omarchy-plugin-validate >/dev/null 2>&1; then
  omarchy-plugin-validate "$PROJECT_DIR"
elif command -v omarchy >/dev/null 2>&1; then
  omarchy plugin validate "$PROJECT_DIR"
else
  echo "Warning: omarchy plugin validator not found in PATH, skipping manifest validation"
fi

echo "--> Checking scripts syntax..."
bash -n "$PROJECT_DIR/hypr/omalt-tab-client"
for s in "$SCRIPT_DIR"/*.sh; do
  bash -n "$s"
done
python3 -m py_compile "$SCRIPT_DIR/clean-bindings.py"

if command -v luac >/dev/null 2>&1; then
  echo "--> Checking Hyprland bindings Lua syntax..."
  luac -p "$PROJECT_DIR/hypr/bindings.lua"
fi

echo "✓ All checks and tests passed!"
