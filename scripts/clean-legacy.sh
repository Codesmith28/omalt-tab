#!/usr/bin/env bash
# scripts/clean-legacy.sh — Clean up obsolete hyprswitch services and autostart entries
set -euo pipefail

AUTOSTART="${HOME}/.config/hypr/autostart.lua"

echo "--> Checking for legacy switcher in ~/.config/hypr/autostart.lua..."
if [ -f "${AUTOSTART}" ]; then
  if grep -E '^[^#-]*switcher/shell\.qml' "${AUTOSTART}" >/dev/null 2>&1; then
    sed -i 's|^.*switcher/shell\.qml.*|-- & (disabled for omalt-tab)|' "${AUTOSTART}"
    echo "✓ Commented out legacy switcher in ~/.config/hypr/autostart.lua"
  else
    echo "No active legacy switcher line found in ~/.config/hypr/autostart.lua"
  fi
fi

echo "--> Disabling hyprswitch.service if present..."
if systemctl --user list-unit-files 2>/dev/null | grep -q 'hyprswitch.service'; then
  systemctl --user stop hyprswitch.service 2>/dev/null || true
  systemctl --user disable hyprswitch.service 2>/dev/null || true
  echo "✓ Disabled and stopped hyprswitch.service"
fi

echo "✓ Legacy switcher cleanup finished."
