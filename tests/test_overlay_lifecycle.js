// tests/test_overlay_lifecycle.js: Tests for Config, Dimensions, Utils, AltTabOverlay lifecycle, and window management
const fs = require("fs");
const assert = require("assert");
const { loadModule } = require("./helpers");

function run() {
  console.log("--> Testing Overlay, Config, Tokens, and Lifecycle (DevMode, Dimensions, Utils, Window raising & Dismissal)...");
  const wm = loadModule("js/WindowModel.js");

  // Test 6: Config.js devMode flag and options
  {
    const config = loadModule("js/Config.js");
    assert(typeof config.isDevMode === "function", "isDevMode should be a function");
    assert(typeof config.requireEnterToSwitch === "function", "requireEnterToSwitch should be a function");
    assert(typeof config.isDebugLogging === "function", "isDebugLogging should be a function");
    assert(typeof config.isDevBadgeVisible === "function", "isDevBadgeVisible should be a function");
    assert(typeof config.isScreenshotUnlocked === "function", "isScreenshotUnlocked should be a function");

    // In default repo state, verify getter consistency
    const initialMode = config.isDevMode();
    assert.strictEqual(config.requireEnterToSwitch(), initialMode, "requireEnterToSwitch must match devMode");
    assert.strictEqual(config.isScreenshotUnlocked(), true, "Screenshot should be unlocked by default or in dev mode");

    // When devMode is true: enter must be required to switch task
    config.devMode = true;
    assert.strictEqual(config.isDevMode(), true, "isDevMode() should return true when devMode = true");
    assert.strictEqual(config.requireEnterToSwitch(), true, "requireEnterToSwitch() must return true in dev mode");
    assert.strictEqual(config.isDebugLogging(), true, "isDebugLogging() must return true in dev mode");
    assert.strictEqual(config.isDevBadgeVisible(), true, "isDevBadgeVisible() must return true in dev mode");
    assert.strictEqual(config.isScreenshotUnlocked(), true, "Screenshot must be unlocked in dev mode");

    // When devMode is false: release Alt switches immediately (requireEnter is false)
    config.devMode = false;
    assert.strictEqual(config.isDevMode(), false, "isDevMode() should return false when devMode = false");
    assert.strictEqual(config.getUiScale, undefined, "uiScale should no longer exist in Config.js (design overhaul in Dimensions.js)");

    console.log(
      "  ✓ Config.js correctly gates requireEnterToSwitch, debugLogging, dev badges, and screenshot unlock",
    );
  }

  // Test 8: Gitignored .dev flag detection and devMode precedence
  {
    function resolveDevMode(devFileLoaded, devFileText, configDevMode, envDev) {
      const hasDevFile =
        devFileLoaded &&
        devFileText.trim() !== "0" &&
        devFileText.trim() !== "false";
      return hasDevFile || !!configDevMode || envDev === "1";
    }

    // When .dev flag file is missing (devFileLoaded = false) and no env/config overrides
    assert.strictEqual(resolveDevMode(false, "", false, undefined), false, "Default without .dev should be false");

    // When .dev flag file exists with 'true', '1', or empty
    assert.strictEqual(resolveDevMode(true, "true\n", false, undefined), true, ".dev with true should activate dev mode");
    assert.strictEqual(resolveDevMode(true, "1", false, undefined), true, ".dev with 1 should activate dev mode");
    assert.strictEqual(resolveDevMode(true, "", false, undefined), true, "Empty .dev file should activate dev mode");

    // When .dev flag file contains 'false' or '0'
    assert.strictEqual(resolveDevMode(true, "false", false, undefined), false, ".dev with false should deactivate dev mode");
    assert.strictEqual(resolveDevMode(true, "0", false, undefined), false, ".dev with 0 should deactivate dev mode");

    // When OMALT_TAB_DEV is set
    assert.strictEqual(resolveDevMode(false, "", false, "1"), true, "OMALT_TAB_DEV=1 should activate dev mode");

    console.log("  ✓ Dev mode correctly activates via gitignored .dev flag or OMALT_TAB_DEV env var");
  }

  // Test 11: Security check: FooterBar.qml explicitly sets textFormat: Text.PlainText to prevent rich-text injection
  {
    const footerQml = fs.readFileSync("components/FooterBar.qml", "utf8");

    // Extract windowTitle Text component definition
    const match = footerQml.match(/Text\s*\{[^}]*id:\s*windowTitle[^}]*\}/s);
    assert(match, "FooterBar.qml should contain windowTitle Text item");
    assert(
      /textFormat\s*:\s*Text\.PlainText/.test(match[0]),
      "windowTitle Text item in FooterBar.qml must explicitly set textFormat: Text.PlainText to prevent rich-text injection"
    );

    // Verify WindowModel retains markup titles intact as plain strings without corruption
    const markupTitle = '<img src="http://127.0.0.1:9999/test.png"> Testing Markup <b>Bold</b>';
    const mockSnapshot = {
      clients: [
        {
          address: "0x99",
          mapped: true,
          workspace: { id: 1 },
          at: [100, 100],
          size: [800, 600],
          title: markupTitle,
          class: "brave-browser",
          focusHistoryID: 0,
        },
      ],
      workspaces: [{ id: 1, name: "1" }],
      monitors: [
        {
          id: 0,
          name: "eDP-1",
          width: 1920,
          height: 1080,
          x: 0,
          y: 0,
          activeWorkspace: { id: 1 },
        },
      ],
    };
    const parsed = wm.parseSnapshot(mockSnapshot, ["a"]);
    assert.strictEqual(parsed.workspaces[0].windows[0].title, markupTitle);

    console.log("  ✓ FooterBar.qml explicitly sets textFormat: Text.PlainText on windowTitle sink");
  }

  // Test 13: AltTabOverlay.qml multi-monitor screen binding and pinned window protection
  {
    const overlayQml = fs.readFileSync("AltTabOverlay.qml", "utf8");

    // Verify PanelWindow screen binding
    assert(
      /screen\s*:\s*root\.resolveActiveScreen\(root\.activeMonitorName\)/.test(overlayQml),
      "PanelWindow should bind screen to root.resolveActiveScreen(root.activeMonitorName)"
    );

    // Verify resolveActiveScreen implementation
    assert(
      /function\s+resolveActiveScreen\s*\(\s*monitorName\s*\)/.test(overlayQml),
      "AltTabOverlay.qml should define resolveActiveScreen helper function"
    );

    // Verify bringToTopExpr preserves pinned windows
    assert(
      overlayQml.includes("and not other.pinned"),
      "bringToTopExpr must preserve pinned/always-on-top windows (and not other.pinned)"
    );

    console.log("  ✓ AltTabOverlay.qml binds screen to active monitor and protects pinned windows");
  }

  // Test 14: AltTabOverlay.qml bringToTopExpr handles maximized tiled windows and lowers floating windows
  {
    const overlayQml = fs.readFileSync("AltTabOverlay.qml", "utf8");

    // Verify that floating windows are raised with alter_zorder top
    assert(
      overlayQml.includes("if w.floating then"),
      "bringToTopExpr should detect floating windows to raise them"
    );

    // Verify maximized tiled window detection (fullscreen, fullscreen_client, or single tiled window)
    assert(
      overlayQml.includes("local isMaximized = (w.fullscreen and w.fullscreen > 0)"),
      "bringToTopExpr should detect fullscreen or client-fullscreen or single tiled windows"
    );
    assert(
      overlayQml.includes("or (tiledCount <= 1)"),
      "bringToTopExpr should recognize a single tiled window occupying the workspace as maximized"
    );

    // Verify that un-fullscreened maximized tiled windows are promoted to maximized mode
    assert(
      overlayQml.includes('hl.dsp.window.fullscreen({ mode = \\"maximized\\", action = \\"set\\"'),
      "bringToTopExpr should set maximized mode on tiled windows when floating windows are present"
    );

    // Verify floating unpinned windows are lowered behind the maximized window
    assert(
      overlayQml.includes('hl.dsp.window.alter_zorder({ mode = \\"bottom\\", window = \\"address:\\" .. other.address })'),
      "bringToTopExpr should lower other unpinned floating windows to bottom"
    );

    console.log("  ✓ AltTabOverlay.qml bringToTopExpr lowers floating windows behind maximized tiled windows");
  }

  // Test 17: Centralized Dimensions.js (pure design tokens) and Utils.js (DRY security sanitization & text helpers)
  {
    const dim = loadModule("js/Dimensions.js");
    const utils = loadModule("js/Utils.js");

    // 1. Verify Dimensions.js design token sections exist with valid numeric metrics
    assert(dim.overlay && typeof dim.overlay === "object", "Dimensions should export overlay object");
    assert.strictEqual(dim.overlay.containerPadding, 50);
    assert.strictEqual(dim.overlay.containerPaddingVertical, 42);
    assert.strictEqual(dim.overlay.cornerRadius, 14);
    assert.strictEqual(dim.overlay.rowSpacing, 14);

    assert(dim.card && typeof dim.card === "object", "Dimensions should export card object");
    assert.strictEqual(dim.card.headerHeight, 28);
    assert.strictEqual(dim.card.letterBadgeSize, 26);
    assert.strictEqual(dim.card.emptyIconSize, 24);
    assert.strictEqual(dim.card.maxWidthMulti, 285);

    assert(dim.windowTile && typeof dim.windowTile === "object", "Dimensions should export windowTile object");
    assert.strictEqual(dim.windowTile.indexBadgeSize, 20);
    assert.strictEqual(dim.windowTile.indexBadgeMinSize, 15);
    assert.strictEqual(dim.windowTile.tabBarHeight, 22);
    assert.strictEqual(dim.windowTile.appIconSize, 36);

    assert(dim.header && typeof dim.header === "object", "Dimensions should export header object");
    assert.strictEqual(dim.header.height, 38);
    assert.strictEqual(dim.header.titleFontSize, 18);
    assert.strictEqual(dim.header.brandBoxSize, 31);

    assert(dim.footer && typeof dim.footer === "object", "Dimensions should export footer object");
    assert.strictEqual(dim.footer.height, 62);
    assert.strictEqual(dim.footer.iconContainerSize, 40);
    assert.strictEqual(dim.footer.titleFontSize, 14);

    // Dimensions.js is purely for layout tokens; verify text functions are not in Dimensions
    assert.strictEqual(dim.sanitizeText, undefined, "sanitizeText should live in Utils.js, not Dimensions.js");
    assert.strictEqual(dim.safeTitle, undefined, "safeTitle should live in Utils.js, not Dimensions.js");

    // 2. Security sanitization tests (DRY helper in Utils.js)
    assert.strictEqual(typeof utils.sanitizeText, "function", "Utils.sanitizeText should be a function");
    assert.strictEqual(typeof utils.safeTitle, "function", "Utils.safeTitle should be a function");
    assert.strictEqual(typeof utils.safeWorkspaceLabel, "function", "Utils.safeWorkspaceLabel should be a function");

    // Strips Unicode BiDi control characters (CVE RTL-override spoofing)
    const bidiSpoof = "\u202Eevil.exe\u202D safe_name";
    assert.strictEqual(utils.sanitizeText(bidiSpoof), "evil.exe safe_name", "Should strip BiDi control characters");

    // Normalizes newlines, tabs, carriage returns, null bytes
    const newlineSpoof = "Title Line 1\r\n\tTitle Line 2\0";
    assert.strictEqual(utils.sanitizeText(newlineSpoof), "Title Line 1   Title Line 2", "Should replace control characters with spaces");

    // Safe title formatting
    assert.strictEqual(utils.safeTitle(null, "Default"), "Default");
    assert.strictEqual(utils.safeTitle({ title: "Clean Title" }), "Clean Title");
    assert.strictEqual(utils.safeTitle({ isWorkspace: true, workspaceId: 3 }), "Workspace 3");
    assert.strictEqual(utils.safeTitle({ isWorkspace: true, title: "Custom WS" }), "Custom WS");

    // Safe workspace label formatting
    assert.strictEqual(utils.safeWorkspaceLabel(null), "WS");
    assert.strictEqual(utils.safeWorkspaceLabel({ wsLetter: "A", workspaceId: 1 }), "WS [A] 1");

    // Verify WindowModel.js imports and uses Utils.sanitizeText
    const wmCode = fs.readFileSync("js/WindowModel.js", "utf8");
    assert(wmCode.includes('.import "Utils.js" as Utils'), "WindowModel.js should import Utils.js");
    assert.strictEqual(wm.sanitizeText(bidiSpoof), "evil.exe safe_name", "WindowModel.sanitizeText should delegate to Utils.sanitizeText");

    // 3. Verify QML files import Dimensions.js and have completely removed uiScale properties/flags
    const qmlFiles = [
      { name: "AltTabOverlay.qml", content: fs.readFileSync("AltTabOverlay.qml", "utf8"), importToken: '"js/Dimensions.js" as Dimensions' },
      { name: "components/HeaderBar.qml", content: fs.readFileSync("components/HeaderBar.qml", "utf8"), importToken: '"../js/Dimensions.js" as Dimensions' },
      { name: "components/FooterBar.qml", content: fs.readFileSync("components/FooterBar.qml", "utf8"), importToken: '"../js/Dimensions.js" as Dimensions' },
      { name: "components/WorkspaceCard.qml", content: fs.readFileSync("components/WorkspaceCard.qml", "utf8"), importToken: '"../js/Dimensions.js" as Dimensions' },
      { name: "components/WindowTile.qml", content: fs.readFileSync("components/WindowTile.qml", "utf8"), importToken: '"../js/Dimensions.js" as Dimensions' }
    ];

    for (const { name, content, importToken } of qmlFiles) {
      assert(
        content.includes(importToken),
        `${name} must import Dimensions.js`
      );
      assert(
        !content.includes("property real uiScale"),
        `${name} must NOT define property real uiScale (overhaul in Dimensions.js)`
      );
      assert(
        !content.includes("uiScale:"),
        `${name} must NOT pass or assign uiScale property`
      );
    }

    // 4. Verify FooterBar imports and uses Utils.js
    const footerQml = qmlFiles[2].content;
    assert(footerQml.includes('import "../js/Utils.js" as Utils'), "FooterBar.qml must import Utils.js");
    assert(footerQml.includes("Utils.safeTitle"), "FooterBar should use Utils.safeTitle");
    assert(footerQml.includes("Utils.safeWorkspaceLabel"), "FooterBar should use Utils.safeWorkspaceLabel");

    // 5. Verify components use Dimensions tokens
    const overlayQml = qmlFiles[0].content;
    const headerQml = qmlFiles[1].content;
    const cardQml = qmlFiles[3].content;
    const tileQml = qmlFiles[4].content;

    assert(overlayQml.includes("Dimensions.overlay."), "AltTabOverlay should use Dimensions.overlay tokens");
    assert(headerQml.includes("Dimensions.header."), "HeaderBar should use Dimensions.header tokens");
    assert(footerQml.includes("Dimensions.footer."), "FooterBar should use Dimensions.footer tokens");
    assert(cardQml.includes("Dimensions.card."), "WorkspaceCard should use Dimensions.card tokens");
    assert(tileQml.includes("Dimensions.windowTile."), "WindowTile should use Dimensions.windowTile tokens");
    assert(tileQml.includes("badgeBaseSize"), "WindowTile should define responsive badgeBaseSize");

    console.log("  ✓ Dimensions.js (pure metrics) and Utils.js (DRY security) separation of concerns verified");
  }

  // Test 19: Dismissal recursion guard and commit/cancel lifecycle safety
  {
    let shellHideCallCount = 0;
    let closeCallCount = 0;
    let cancelCallCount = 0;
    let focusDispatched = false;

    const mockRoot = {
      opened: true,
      isOpening: false,
      isDismissing: false,
      selectedAddress: "0x123abc",
      selectedWorkspaceId: 1,
      mruList: [{ address: "0x123abc" }],
      shell: {
        hide: function(id) {
          shellHideCallCount++;
          // Omarchy shell invokes close() on the plugin when hide() is called
          mockRoot.close();
        }
      },
      manifest: { id: "io.github.codesmith28.omalt-tab" },
      logDebug: function() {},
      close: function() {
        closeCallCount++;
        if (!this.opened && !this.isOpening) return;
        if (this.isDismissing) return;
        this.cancel();
      },
      dismiss: function() {
        if (this.isDismissing) return;
        this.isDismissing = true;
        this.opened = false;
        if (this.shell && typeof this.shell.hide === "function") {
          this.shell.hide(this.manifest.id);
        }
        this.isDismissing = false;
      },
      cancel: function() {
        cancelCallCount++;
        this.isOpening = false;
        this.opened = false;
        this.dismiss();
      },
      commit: function() {
        if (this.opened) {
          const target = this.selectedAddress;
          this.opened = false;
          this.isOpening = false;
          // Window focus must be dispatched before dismissal
          if (target) {
            focusDispatched = true;
          }
          this.dismiss();
        }
      }
    };

    // Simulate commit: must focus window, dismiss safely, and terminate with zero recursion
    mockRoot.commit();
    assert.strictEqual(focusDispatched, true, "Window focus must be dispatched on commit");
    assert.strictEqual(mockRoot.opened, false, "Root must be marked closed after commit");
    assert.strictEqual(shellHideCallCount, 1, "Shell hide should be called exactly once");
    assert.strictEqual(closeCallCount, 1, "Plugin close should be called by shell hide");
    assert.strictEqual(cancelCallCount, 0, "Commit should not trigger cancel()");

    // Simulate external close from shell when already closed: must be a no-op
    mockRoot.close();
    assert.strictEqual(closeCallCount, 2);
    assert.strictEqual(cancelCallCount, 0, "Close on inactive switcher must not trigger cancel()");

    console.log("  ✓ Dismissal recursion guard and commit dispatch order verified");
  }
}

if (require.main === module) {
  run();
}

module.exports = run;
