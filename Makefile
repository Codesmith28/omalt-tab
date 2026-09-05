# Makefile for omalt-tab: Ergonomic Alt+Tab window switcher for Omarchy & Hyprland

SHELL := /usr/bin/env bash

PLUGIN_ID := io.github.codesmith28.omalt-tab
PLUGINS_DIR := $(HOME)/.config/omarchy/plugins
TARGET_DIR := $(PLUGINS_DIR)/$(PLUGIN_ID)
PROJECT_DIR := $(shell pwd -P)
UID_NUM := $(shell id -u)
SOCKET := /run/user/$(UID_NUM)/omalt-tab.sock
HYPR_BINDINGS := $(HOME)/.config/hypr/bindings.lua

.PHONY: all help test validate check dev link install update uninstall restart status clean-legacy

all: help

help:
	@echo "omalt-tab management targets:"
	@echo "  make dev         - Symlink this repo to ~/.config/omarchy/plugins and enable (ideal for development)"
	@echo "  make install     - Copy files to ~/.config/omarchy/plugins, enable plugin, and restart shell"
	@echo "  make update      - Sync latest changes and reload shell"
	@echo "  make uninstall   - Disable plugin and remove from ~/.config/omarchy/plugins"
	@echo "  make validate    - Validate plugin manifest, shell scripts, and run logic tests"
	@echo "  make test        - Run unit tests for window model and navigation"
	@echo "  make restart     - Restart the Omarchy shell"
	@echo "  make status      - Display installation state, plugin status, and socket health"
	@echo "  make clean-legacy- Disable old standalone switcher in ~/.config/hypr/autostart.lua"

test:
	@echo "--> Running unit tests..."
	@node tests/test_logic.js

validate: check

check: test
	@echo "--> Validating plugin manifest..."
	@if command -v omarchy-plugin-validate >/dev/null 2>&1; then \
		omarchy-plugin-validate . ; \
	elif command -v omarchy >/dev/null 2>&1; then \
		omarchy plugin validate . ; \
	else \
		echo "Warning: omarchy plugin validator not found in PATH, skipping manifest validation"; \
	fi
	@echo "--> Checking client bash script..."
	@bash -n hypr/omalt-tab-client
	@if command -v luac >/dev/null 2>&1; then \
		echo "--> Checking Hyprland bindings Lua syntax..."; \
		luac -p hypr/bindings.lua ; \
	fi
	@echo "✓ All checks and tests passed!"

dev: link

link: check
	@echo "--> Setting up development symlink..."
	@mkdir -p "$(PLUGINS_DIR)"
	@chmod +x hypr/omalt-tab-client
	@if [ -d "$(TARGET_DIR)" ] && [ ! -L "$(TARGET_DIR)" ]; then \
		echo "Backing up existing non-symlink plugin to $(PLUGINS_DIR)/.$(PLUGIN_ID).bak"; \
		rm -rf "$(PLUGINS_DIR)/.$(PLUGIN_ID).bak"; \
		mv "$(TARGET_DIR)" "$(PLUGINS_DIR)/.$(PLUGIN_ID).bak"; \
	fi
	@ln -sfn "$(PROJECT_DIR)" "$(TARGET_DIR)"
	@echo "--> Symlink created: $(TARGET_DIR) -> $(PROJECT_DIR)"
	@mkdir -p "$(HOME)/.local/bin"
	@ln -sf "$(PROJECT_DIR)/hypr/omalt-tab-client" "$(HOME)/.local/bin/omalt-tab-client"
	@ln -sf "$(PROJECT_DIR)/hypr/omalt-tab-client" "$(HOME)/.local/bin/omalt-tab"
	@ln -sf "$(PROJECT_DIR)/hypr/omalt-tab-client" "$(HOME)/.local/bin/hyprswitch-client"
	@ln -sf "$(PROJECT_DIR)/hypr/omalt-tab-client" "$(HOME)/.local/bin/hyprswitch"
	@if command -v omarchy >/dev/null 2>&1; then \
		echo "--> Ensuring plugin is enabled..."; \
		omarchy plugin enable "$(PLUGIN_ID)" >/dev/null 2>&1 || true; \
	fi
	@if [ -f "$(HYPR_BINDINGS)" ] && ! grep -q "$(PLUGIN_ID)" "$(HYPR_BINDINGS)"; then \
		echo "--> Adding omalt-tab binding loader to $(HYPR_BINDINGS)..."; \
		printf '\n-- Omarchy Plugins: omalt-tab window switcher\nlocal omalt_tab_binding = (os.getenv("HOME") or "") .. "/.config/omarchy/plugins/$(PLUGIN_ID)/hypr/bindings.lua"\nlocal f_omalt = io.open(omalt_tab_binding, "r")\nif f_omalt then f_omalt:close(); dofile(omalt_tab_binding) end\n' >> "$(HYPR_BINDINGS)"; \
	fi
	@$(MAKE) restart
	@echo "✓ Development setup complete. Code edits in $(PROJECT_DIR) are now live on shell restart."

install: check
	@echo "--> Installing omalt-tab to $(TARGET_DIR)..."
	@mkdir -p "$(TARGET_DIR)"
	@chmod +x hypr/omalt-tab-client
	@if [ -L "$(TARGET_DIR)" ]; then \
		echo "Replacing symlink with clean copy..."; \
		rm -f "$(TARGET_DIR)"; \
		mkdir -p "$(TARGET_DIR)"; \
	fi
	@if command -v rsync >/dev/null 2>&1; then \
		rsync -a --delete \
			--exclude='.git' \
			--exclude='tests' \
			--exclude='Makefile' \
			--exclude='*.swp' \
			./ "$(TARGET_DIR)/"; \
	else \
		cp -r AltTabOverlay.qml components hypr js manifest.json LICENSE README.md "$(TARGET_DIR)/"; \
	fi
	@chmod +x "$(TARGET_DIR)/hypr/omalt-tab-client"
	@mkdir -p "$(HOME)/.local/bin"
	@ln -sf "$(TARGET_DIR)/hypr/omalt-tab-client" "$(HOME)/.local/bin/omalt-tab-client"
	@ln -sf "$(TARGET_DIR)/hypr/omalt-tab-client" "$(HOME)/.local/bin/omalt-tab"
	@ln -sf "$(TARGET_DIR)/hypr/omalt-tab-client" "$(HOME)/.local/bin/hyprswitch-client"
	@ln -sf "$(TARGET_DIR)/hypr/omalt-tab-client" "$(HOME)/.local/bin/hyprswitch"
	@if command -v omarchy >/dev/null 2>&1; then \
		echo "--> Enabling plugin..."; \
		omarchy plugin enable "$(PLUGIN_ID)" >/dev/null 2>&1 || true; \
	fi
	@if [ -f "$(HYPR_BINDINGS)" ] && ! grep -q "$(PLUGIN_ID)" "$(HYPR_BINDINGS)"; then \
		echo "--> Adding omalt-tab binding loader to $(HYPR_BINDINGS)..."; \
		printf '\n-- Omarchy Plugins: omalt-tab window switcher\nlocal omalt_tab_binding = (os.getenv("HOME") or "") .. "/.config/omarchy/plugins/$(PLUGIN_ID)/hypr/bindings.lua"\nlocal f_omalt = io.open(omalt_tab_binding, "r")\nif f_omalt then f_omalt:close(); dofile(omalt_tab_binding) end\n' >> "$(HYPR_BINDINGS)"; \
	fi
	@$(MAKE) restart
	@echo "✓ omalt-tab installed successfully!"

update:
	@if [ -L "$(TARGET_DIR)" ]; then \
		echo "Plugin is symlinked. Validating and restarting shell..."; \
		$(MAKE) check; \
		$(MAKE) restart; \
	else \
		echo "Plugin is copied. Updating files..."; \
		$(MAKE) install; \
	fi

uninstall:
	@echo "--> Disabling plugin in Omarchy..."
	@if command -v omarchy >/dev/null 2>&1; then \
		omarchy plugin disable "$(PLUGIN_ID)" >/dev/null 2>&1 || true; \
	fi
	@echo "--> Removing $(TARGET_DIR)..."
	@rm -rf "$(TARGET_DIR)"
	@rm -f "$(HOME)/.local/bin/omalt-tab-client" "$(HOME)/.local/bin/omalt-tab"
	@if [ -f "$(HYPR_BINDINGS)" ]; then \
		sed -i '/$(PLUGIN_ID)/d' "$(HYPR_BINDINGS)"; \
	fi
	@$(MAKE) restart
	@echo "✓ omalt-tab uninstalled."

restart:
	@echo "--> Restarting Omarchy shell..."
	@if command -v omarchy >/dev/null 2>&1; then \
		omarchy restart shell ; \
		sleep 1 ; \
	elif command -v omarchy-shell >/dev/null 2>&1; then \
		omarchy-shell shell rescanPlugins >/dev/null 2>&1 || true; \
	fi
	@echo "--> Reloading Hyprland bindings..."
	@if command -v hyprctl >/dev/null 2>&1; then \
		hyprctl reload >/dev/null 2>&1 || true; \
	fi
	@echo "✓ Shell and Hyprland reloaded."

status:
	@echo "=== omalt-tab Status ==="
	@echo -n "Install path: "
	@if [ -L "$(TARGET_DIR)" ]; then \
		echo "$(TARGET_DIR) -> $$(readlink -f $(TARGET_DIR)) (development symlink)"; \
	elif [ -d "$(TARGET_DIR)" ]; then \
		echo "$(TARGET_DIR) (standalone copy)"; \
	else \
		echo "Not installed in $(TARGET_DIR)"; \
	fi
	@echo -n "Omarchy Plugin State: "
	@if command -v omarchy >/dev/null 2>&1; then \
		omarchy plugin list | grep -E "$(PLUGIN_ID)|ID" || echo "Not registered in omarchy plugin list"; \
	else \
		echo "omarchy CLI not found"; \
	fi
	@echo -n "Hyprland Bindings: "
	@if [ -f "$(HYPR_BINDINGS)" ] && grep -q "$(PLUGIN_ID)" "$(HYPR_BINDINGS)"; then \
		echo "Registered in $(HYPR_BINDINGS)"; \
	else \
		echo "Missing from $(HYPR_BINDINGS)"; \
	fi
	@echo -n "UNIX Domain Socket: "
	@if [ -S "$(SOCKET)" ]; then \
		echo "Active at $(SOCKET)"; \
	else \
		echo "Inactive / not created yet"; \
	fi
	@echo -n "Legacy Hyprswitch: "
	@if systemctl --user is-active --quiet hyprswitch.service 2>/dev/null || pgrep -f "hypr/switcher/shell\.qml" >/dev/null 2>&1; then \
		echo "WARNING: Legacy hyprswitch service/process is active! Run 'make clean-legacy' to disable."; \
	else \
		echo "Inactive / disabled (clean)"; \
	fi

clean-legacy:
	@echo "--> Checking for legacy switcher in ~/.config/hypr/autostart.lua..."
	@if [ -f "$(HOME)/.config/hypr/autostart.lua" ]; then \
		if grep -E "^[^#-]*switcher/shell\.qml" "$(HOME)/.config/hypr/autostart.lua" >/dev/null 2>&1; then \
			sed -i 's|^.*switcher/shell\.qml.*|-- & (disabled for omalt-tab)|' "$(HOME)/.config/hypr/autostart.lua"; \
			echo "✓ Commented out legacy switcher in ~/.config/hypr/autostart.lua"; \
		else \
			echo "No active legacy switcher line found in ~/.config/hypr/autostart.lua"; \
		fi \
	fi
	@echo "--> Disabling hyprswitch.service if present..."
	@if systemctl --user list-unit-files 2>/dev/null | grep -q "hyprswitch.service"; then \
		systemctl --user stop hyprswitch.service 2>/dev/null || true; \
		systemctl --user disable hyprswitch.service 2>/dev/null || true; \
		echo "✓ Disabled and stopped hyprswitch.service"; \
	fi
	@echo "✓ Legacy switcher cleanup finished."
