#!/usr/bin/env bash
# scripts/link.sh — Create development symlink in ~/.config/omarchy/plugins
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

PLUGIN_ID="io.github.codesmith28.omalt-tab"
PLUGINS_DIR="${HOME}/.config/omarchy/plugins"
TARGET_DIR="${PLUGINS_DIR}/${PLUGIN_ID}"

echo "--> Setting up development symlink..."
mkdir -p "${PLUGINS_DIR}"
chmod +x "${PROJECT_DIR}/hypr/omalt-tab-client"

# Back up existing non-symlink plugin
if [ -d "${TARGET_DIR}" ] && [ ! -L "${TARGET_DIR}" ]; then
  echo "Backing up existing non-symlink plugin to ${PLUGINS_DIR}/.${PLUGIN_ID}.bak"
  rm -rf "${PLUGINS_DIR}/.${PLUGIN_ID}.bak"
  mv "${TARGET_DIR}" "${PLUGINS_DIR}/.${PLUGIN_ID}.bak"
fi

ln -sfn "${PROJECT_DIR}" "${TARGET_DIR}"
echo "--> Symlink created: ${TARGET_DIR} -> ${PROJECT_DIR}"
echo "✓ Development symlink ready."
