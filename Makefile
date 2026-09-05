# Makefile for omalt-tab: Ergonomic Alt+Tab window switcher for Omarchy & Hyprland

SHELL := /usr/bin/env bash

PLUGIN_ID := io.github.codesmith28.omalt-tab
PLUGINS_DIR := $(HOME)/.config/omarchy/plugins
TARGET_DIR := $(PLUGINS_DIR)/$(PLUGIN_ID)
PROJECT_DIR := $(shell pwd -P)

.PHONY: all help test validate check dev prod mode-dev mode-prod link install update uninstall restart status clean-legacy

all: help

help:
	@echo "omalt-tab management targets:"
	@echo "  make dev         - Replace installed plugin with Dev Mode plugin (press Enter to switch)"
	@echo "  make prod        - Replace installed plugin with Production Mode plugin (release Alt to switch)"
	@echo "  make install     - Copy files to ~/.config/omarchy/plugins, enable plugin, and restart shell"
	@echo "  make mode-dev    - Enable Dev Mode flag (.dev, gitignored)"
	@echo "  make mode-prod   - Disable Dev Mode flag (remove .dev)"
	@echo "  make update      - Sync latest changes and reload shell"
	@echo "  make uninstall   - Fully remove plugin, keybindings, and helper symlinks"
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
	@scripts/validate.sh

mode-dev:
	@echo "--> Enabling Dev Mode (.dev flag)..."
	@echo "true" > .dev
	@if [ -d "$(TARGET_DIR)" ] && [ ! -L "$(TARGET_DIR)" ]; then echo "true" > "$(TARGET_DIR)/.dev"; fi
	@echo "✓ Dev mode flag enabled (.dev created, gitignored)."

mode-prod:
	@echo "--> Disabling Dev Mode..."
	@rm -f .dev "$(TARGET_DIR)/.dev"
	@echo "✓ Production mode enabled (.dev removed)."

set-mode-true: mode-dev
set-mode-false: mode-prod
set-mode-%:
	@if [ "$*" = "true" ]; then $(MAKE) mode-dev; else $(MAKE) mode-prod; fi

dev: mode-dev link
	@echo "=========================================================="
	@echo "✓ Dev Mode plugin active at $(TARGET_DIR)!"
	@echo "  • Switcher stays open after releasing Alt"
	@echo "  • Press Enter (Return) to switch to the selected task"
	@echo "  • Press Esc to cancel"
	@echo "  • Header displays DEV badge and Footer shows 'Press Enter to switch'"
	@echo "  • Run 'make prod' to restore standard release-to-switch behavior"
	@echo "=========================================================="

prod: mode-prod install
	@echo "=========================================================="
	@echo "✓ Production Mode plugin active at $(TARGET_DIR)!"
	@echo "  • Standard behavior: releasing Alt switches to task immediately"
	@echo "  • Run 'make dev' to switch back to dev mode"
	@echo "=========================================================="

link: check
	@scripts/link.sh
	@scripts/setup-integration.sh
	@scripts/restart.sh
	@echo "✓ Development setup complete. Code edits in $(PROJECT_DIR) are now live on shell restart."

install: mode-prod check
	@scripts/install.sh
	@scripts/setup-integration.sh
	@scripts/restart.sh
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
	@scripts/uninstall.sh
	@scripts/restart.sh

restart:
	@scripts/restart.sh

status:
	@scripts/status.sh

clean-legacy:
	@scripts/clean-legacy.sh
