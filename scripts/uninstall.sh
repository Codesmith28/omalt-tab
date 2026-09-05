#!/usr/bin/env bash
# scripts/uninstall.sh — Fully remove omalt-tab plugin and all integration artifacts
set -euo pipefail

PLUGIN_ID="io.github.codesmith28.omalt-tab"
PLUGINS_DIR="${HOME}/.config/omarchy/plugins"
TARGET_DIR="${PLUGINS_DIR}/${PLUGIN_ID}"
HYPR_BINDINGS="${HOME}/.config/hypr/bindings.lua"
UID_NUM="$(id -u)"
SOCKET="/run/user/${UID_NUM}/omalt-tab.sock"

# Remove plugin via omarchy CLI or manual fallback
echo "--> Removing omalt-tab plugin..."
if command -v omarchy >/dev/null 2>&1; then
  omarchy plugin remove "${PLUGIN_ID}" --yes 2>/dev/null || true
else
  rm -rf "${TARGET_DIR}"
fi

# Clean integration artifacts
echo "--> Cleaning integration artifacts..."
rm -f "${HOME}/.local/bin/omalt-tab-client" "${HOME}/.local/bin/omalt-tab" \
  "${HOME}/.local/bin/hyprswitch-client" "${HOME}/.local/bin/hyprswitch"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "${HYPR_BINDINGS}" ]; then
  "${SCRIPT_DIR}/clean-bindings.py" "${HYPR_BINDINGS}"
fi

rm -f "${SOCKET}"

echo "✓ omalt-tab fully removed."
