#!/usr/bin/env bash
# scripts/setup-integration.sh — Set up PATH symlinks and Hyprland binding loader
set -euo pipefail

PLUGIN_ID="io.github.codesmith28.omalt-tab"
PLUGINS_DIR="${HOME}/.config/omarchy/plugins"
TARGET_DIR="${PLUGINS_DIR}/${PLUGIN_ID}"
HYPR_BINDINGS="${HOME}/.config/hypr/bindings.lua"

# Symlink client to ~/.local/bin
mkdir -p "${HOME}/.local/bin"
for name in omalt-tab-client omalt-tab; do
  ln -sf "${TARGET_DIR}/hypr/omalt-tab-client" "${HOME}/.local/bin/${name}"
done

# Enable plugin in Omarchy
if command -v omarchy >/dev/null 2>&1; then
  echo "--> Ensuring plugin is enabled..."
  omarchy plugin enable "${PLUGIN_ID}" >/dev/null 2>&1 || true
fi

# Inject binding loader into Hyprland bindings.lua if missing
if [ -f "${HYPR_BINDINGS}" ] && ! grep -q "${PLUGIN_ID}" "${HYPR_BINDINGS}"; then
  echo "--> Adding omalt-tab binding loader to ${HYPR_BINDINGS}..."
  cat << LUA >> "${HYPR_BINDINGS}"

-- >>> omalt-tab >>>
local omalt_tab_binding = (os.getenv("HOME") or "") .. "/.config/omarchy/plugins/${PLUGIN_ID}/hypr/bindings.lua"
local f_omalt = io.open(omalt_tab_binding, "r")
if f_omalt then f_omalt:close(); dofile(omalt_tab_binding) end
-- <<< omalt-tab <<<
LUA
fi

echo "✓ Integration setup complete."
