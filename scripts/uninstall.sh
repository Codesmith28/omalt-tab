#!/usr/bin/env bash
# scripts/uninstall.sh — Fully remove omalt-tab plugin and all integration artifacts
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ID="io.github.codesmith28.omalt-tab"
PLUGINS_DIR="${HOME}/.config/omarchy/plugins"
TARGET_DIR="${PLUGINS_DIR}/${PLUGIN_ID}"
HYPR_BINDINGS="${HOME}/.config/hypr/bindings.lua"
UID_NUM="$(id -u)"
SOCKET="/run/user/${UID_NUM}/omalt-tab.sock"
NOTIFY_FLAG="${XDG_RUNTIME_DIR:-/run/user/${UID_NUM}}/omalt-tab-setup-notified"

# 1. Clean integration artifacts and Hyprland bindings FIRST (while scripts are still present)
echo "--> Cleaning integration artifacts..."
rm -f "${HOME}/.local/bin/omalt-tab-client" "${HOME}/.local/bin/omalt-tab"

if [ -f "${HYPR_BINDINGS}" ] && [ -f "${SCRIPT_DIR}/clean-bindings.py" ]; then
  echo "--> Removing keybindings from ${HYPR_BINDINGS}..."
  python3 "${SCRIPT_DIR}/clean-bindings.py" "${HYPR_BINDINGS}" || true
fi

rm -f "${SOCKET}" "${NOTIFY_FLAG}"

# 2. Reload shell and Hyprland bindings before deleting files
echo "--> Reloading shell and Hyprland..."
if [ -x "${SCRIPT_DIR}/restart.sh" ]; then
  "${SCRIPT_DIR}/restart.sh" || true
fi

# 3. Finally, remove plugin directory via omarchy CLI or manual fallback
echo "--> Removing omalt-tab plugin directory..."
if command -v omarchy >/dev/null 2>&1; then
  omarchy plugin remove "${PLUGIN_ID}" --yes 2>/dev/null || rm -rf "${TARGET_DIR}"
else
  rm -rf "${TARGET_DIR}"
fi

echo "✓ omalt-tab fully removed."
