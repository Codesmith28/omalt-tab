#!/usr/bin/env bash
# scripts/restart.sh — Restart Omarchy shell and reload Hyprland bindings
set -euo pipefail

# Ensure HYPRLAND_INSTANCE_SIGNATURE points to an active socket
if [[ -z "${HYPRLAND_INSTANCE_SIGNATURE:-}" ]] || [[ ! -S "${XDG_RUNTIME_DIR:-/run/user/$UID}/hypr/${HYPRLAND_INSTANCE_SIGNATURE}/.socket.sock" ]]; then
  hypr_dir=$(find "${XDG_RUNTIME_DIR:-/run/user/$UID}/hypr" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -n 1 | cut -d' ' -f2-)
  if [[ -n "$hypr_dir" ]]; then
    export HYPRLAND_INSTANCE_SIGNATURE="${hypr_dir##*/}"
  fi
fi

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
