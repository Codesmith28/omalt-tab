#!/usr/bin/env bash
# scripts/status.sh — Display omalt-tab installation state, plugin status, and socket health
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

PLUGIN_ID="io.github.codesmith28.omalt-tab"
PLUGINS_DIR="${HOME}/.config/omarchy/plugins"
TARGET_DIR="${PLUGINS_DIR}/${PLUGIN_ID}"
HYPR_BINDINGS="${HOME}/.config/hypr/bindings.lua"
UID_NUM="$(id -u)"
SOCKET="/run/user/${UID_NUM}/omalt-tab.sock"

echo "=== omalt-tab Status ==="

echo -n "Active Mode: "
if [ -f "${PROJECT_DIR}/.dev" ] || [ -f "${TARGET_DIR}/.dev" ] || [ "${OMALT_TAB_DEV:-}" = "1" ] || \
   grep -qs 'var devMode = true;' "${TARGET_DIR}/js/Config.js" "${PROJECT_DIR}/js/Config.js" 2>/dev/null; then
  echo "DEV MODE (Enter required to switch tasks; switcher stays open)"
else
  echo "PRODUCTION MODE (Release Alt to switch tasks immediately)"
fi

echo -n "Install path: "
if [ -L "${TARGET_DIR}" ]; then
  echo "${TARGET_DIR} -> $(readlink -f "${TARGET_DIR}") (development symlink)"
elif [ -d "${TARGET_DIR}" ]; then
  echo "${TARGET_DIR} (standalone copy)"
else
  echo "Not installed in ${TARGET_DIR}"
fi

echo -n "Omarchy Plugin State: "
if command -v omarchy >/dev/null 2>&1; then
  omarchy plugin list | grep -E "${PLUGIN_ID}|ID" || echo "Not registered in omarchy plugin list"
else
  echo "omarchy CLI not found"
fi

echo -n "Hyprland Bindings: "
if [ -f "${HYPR_BINDINGS}" ] && grep -q "${PLUGIN_ID}" "${HYPR_BINDINGS}"; then
  echo "Registered in ${HYPR_BINDINGS}"
else
  echo "Missing from ${HYPR_BINDINGS}"
fi

echo -n "UNIX Domain Socket: "
if [ -S "${SOCKET}" ]; then
  echo "Active at ${SOCKET}"
else
  echo "Inactive / not created yet"
fi

echo -n "Legacy Hyprswitch: "
if systemctl --user is-active --quiet hyprswitch.service 2>/dev/null || \
   pgrep -f 'hypr/switcher/shell\.qml' >/dev/null 2>&1; then
  echo "WARNING: Legacy hyprswitch service/process is active! Run 'make clean-legacy' to disable."
else
  echo "Inactive / disabled (clean)"
fi
