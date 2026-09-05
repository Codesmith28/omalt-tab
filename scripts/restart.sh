#!/usr/bin/env bash
# scripts/restart.sh — Restart Omarchy shell and reload Hyprland bindings
set -euo pipefail

echo "--> Restarting Omarchy shell..."
if command -v omarchy >/dev/null 2>&1; then
  omarchy restart shell
  sleep 1
elif command -v omarchy-shell >/dev/null 2>&1; then
  omarchy-shell shell rescanPlugins >/dev/null 2>&1 || true
fi

echo "--> Reloading Hyprland bindings..."
if command -v hyprctl >/dev/null 2>&1; then
  hyprctl reload >/dev/null 2>&1 || true
fi

echo "✓ Shell and Hyprland reloaded."
