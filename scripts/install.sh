#!/usr/bin/env bash
# scripts/install.sh — Install plugin files to ~/.config/omarchy/plugins
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

PLUGIN_ID="io.github.codesmith28.omalt-tab"
PLUGINS_DIR="${HOME}/.config/omarchy/plugins"
TARGET_DIR="${PLUGINS_DIR}/${PLUGIN_ID}"

echo "--> Installing omalt-tab to ${TARGET_DIR}..."
mkdir -p "${TARGET_DIR}"
chmod +x "${PROJECT_DIR}/hypr/omalt-tab-client"

# Replace symlink with clean copy if needed
if [ -L "${TARGET_DIR}" ]; then
  echo "Replacing symlink with clean copy..."
  rm -f "${TARGET_DIR}"
  mkdir -p "${TARGET_DIR}"
fi

if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete \
    --exclude='.git' \
    --exclude='tests' \
    --exclude='scripts' \
    --exclude='Makefile' \
    --exclude='*.swp' \
    --exclude='.dev' \
    --exclude='.dev*' \
    "${PROJECT_DIR}/" "${TARGET_DIR}/"
else
  cp -r "${PROJECT_DIR}/AltTabOverlay.qml" "${PROJECT_DIR}/components" \
    "${PROJECT_DIR}/hypr" "${PROJECT_DIR}/js" "${PROJECT_DIR}/manifest.json" \
    "${PROJECT_DIR}/LICENSE" "${PROJECT_DIR}/README.md" "${TARGET_DIR}/"
  rm -f "${TARGET_DIR}/.dev" "${TARGET_DIR}/.dev"*
fi

chmod +x "${TARGET_DIR}/hypr/omalt-tab-client"
echo "✓ Plugin files installed."
