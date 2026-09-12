// test_logic.js: Automated tests for WindowModel.js and Navigation.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

function loadModule(filePath, customContext = {}) {
  let code = fs
    .readFileSync(filePath, "utf8")
    .replace(/^\s*\.pragma\s+library\s*;?/gm, "");
  
  const dir = path.dirname(filePath);
  const context = { console, Math, parseInt, parseFloat, Array, Object, String, Boolean, ...customContext };

  // Parse and resolve QML JS library imports: .import "file.js" as Qualifier
  const importRegex = /^\s*\.import\s+["']([^"']+)["']\s+as\s+([A-Za-z0-9_$]+)\s*;?/gm;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const importRelative = match[1];
    const qualifier = match[2];
    const targetPath = path.resolve(dir, importRelative);
    context[qualifier] = loadModule(targetPath, customContext);
  }
  code = code.replace(importRegex, "");

  vm.createContext(context);
  vm.runInContext(code, context);
  return context;
}

console.log("--> Testing WindowModel.js and Navigation.js...");

const wm = loadModule("js/WindowModel.js");
const nav = loadModule("js/Navigation.js");

// Test 1: parseSnapshot creates cards for populated and in-between empty workspaces
{
  const mockData = {
    clients: [
      {
        address: "0x1",
        mapped: true,
        workspace: { id: 1 },
        at: [100, 100],
        size: [800, 600],
        title: "Kitty",
        class: "kitty",
        focusHistoryID: 0,
      },
      {
        address: "0x3",
        mapped: true,
        workspace: { id: 3 },
        at: [200, 200],
        size: [800, 600],
        title: "Code",
        class: "code",
        focusHistoryID: 1,
      },
    ],
    workspaces: [
      { id: 1, name: "1" },
      { id: 3, name: "3" },
    ],
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

  const parsed = wm.parseSnapshot(mockData, ["a", "s", "d", "f", "g"]);
  assert.strictEqual(
    parsed.workspaces.length,
    3,
    "Expected 3 workspaces (1, 2, 3)",
  );
  assert.strictEqual(parsed.workspaces[0].id, 1);
  assert.strictEqual(parsed.workspaces[1].id, 2);
  assert.strictEqual(parsed.workspaces[2].id, 3);

  // Workspace 2 must be marked empty
  assert.strictEqual(
    parsed.workspaces[1].isEmpty,
    true,
    "Workspace 2 should be empty",
  );
  assert.strictEqual(
    parsed.workspaces[1].letter,
    "S",
    "Workspace 2 letter should be S",
  );
  assert.strictEqual(
    parsed.workspaces[1].windows.length,
    0,
    "Workspace 2 should have 0 windows",
  );

  // Workspace 1 and 3 should have windows
  assert.strictEqual(parsed.workspaces[0].isEmpty, false);
  assert.strictEqual(parsed.workspaces[0].letter, "A");
  assert.strictEqual(parsed.workspaces[2].isEmpty, false);
  assert.strictEqual(parsed.workspaces[2].letter, "D");

  console.log(
    "  ✓ parseSnapshot handles empty in-between workspaces correctly",
  );
}

// Test 2: Navigation to empty workspace via home-row letter
{
  const mockData = {
    clients: [
      {
        address: "0x1",
        mapped: true,
        workspace: { id: 1 },
        at: [100, 100],
        size: [800, 600],
        title: "Kitty",
        class: "kitty",
        focusHistoryID: 0,
      },
      {
        address: "0x3",
        mapped: true,
        workspace: { id: 3 },
        at: [200, 200],
        size: [800, 600],
        title: "Code",
        class: "code",
        focusHistoryID: 1,
      },
    ],
    workspaces: [
      { id: 1, name: "1" },
      { id: 3, name: "3" },
    ],
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

  const parsed = wm.parseSnapshot(mockData, ["a", "s", "d"]);

  // Jump to 's' (workspace 2, empty)
  const jumpS = nav.findWorkspaceJump(parsed.workspaces, "s");
  assert.strictEqual(jumpS.wsId, 2);
  assert.strictEqual(jumpS.empty, true);
  assert.strictEqual(jumpS.address, null);

  // Jump to 'd' (workspace 3, populated)
  const jumpD = nav.findWorkspaceJump(parsed.workspaces, "d");
  assert.strictEqual(jumpD.wsId, 3);
  assert.strictEqual(jumpD.empty, false);
  assert.strictEqual(jumpD.address, "0x3");

  console.log(
    "  ✓ findWorkspaceJump correctly resolves both populated and empty workspaces",
  );
}

// Test 3: 2D Spatial navigation across empty workspaces
{
  const mockData = {
    clients: [
      {
        address: "0x1",
        mapped: true,
        workspace: { id: 1 },
        at: [100, 100],
        size: [800, 600],
        title: "Kitty",
        class: "kitty",
        focusHistoryID: 0,
      },
      {
        address: "0x3",
        mapped: true,
        workspace: { id: 3 },
        at: [200, 200],
        size: [800, 600],
        title: "Code",
        class: "code",
        focusHistoryID: 1,
      },
    ],
    workspaces: [
      { id: 1, name: "1" },
      { id: 3, name: "3" },
    ],
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

  const parsed = wm.parseSnapshot(mockData, ["a", "s", "d"]);

  // Move right from 0x1 in ws 1 -> should go to ws 2 (empty)
  const targetRight = nav.findSpatialTarget(
    parsed.workspaces,
    "0x1",
    1,
    "right",
  );
  assert(targetRight !== null, "Spatial target should exist");
  assert.strictEqual(targetRight.wsId, 2);
  assert.strictEqual(targetRight.isWorkspace, true);

  // Move right again from ws 2 -> should go to 0x3 in ws 3
  const targetRight2 = nav.findSpatialTarget(
    parsed.workspaces,
    null,
    2,
    "right",
  );
  assert(targetRight2 !== null);
  assert.strictEqual(targetRight2.wsId, 3);
  assert.strictEqual(targetRight2.address, "0x3");

  console.log(
    "  ✓ findSpatialTarget smoothly navigates across empty workspaces",
  );
}

// Test 4: Window index jumping (1..9)
{
  const mockWs = [
    {
      id: 1,
      isEmpty: false,
      windows: [
        { address: "0x1", wsIndex: 1 },
        { address: "0x2", wsIndex: 2 },
      ],
    },
  ];

  const jumpWin = nav.findWindowJump(mockWs, 1, 2);
  assert.strictEqual(jumpWin, "0x2");

  console.log("  ✓ findWindowJump jumps to specific window index");
}

// Test 5: Icons.js dynamic candidate lookup and fallback icons
{
  const icons = loadModule("js/Icons.js");

  // Dynamic candidate decomposition (reverse-DNS)
  const ghosttyCands = icons.getNativeIconCandidates(
    "com.mitchellh.ghostty",
    "com.mitchellh.ghostty",
  );
  assert(
    ghosttyCands.includes("ghostty"),
    "Should include ghostty candidate via reverse-DNS",
  );
  assert(
    ghosttyCands.includes("com.mitchellh.ghostty"),
    "Should include full app ID",
  );

  // Dynamic candidate decomposition for reverse-DNS with generic suffixes (e.g. org.telegram.desktop, com.spotify.Client)
  const telegramCands = icons.getNativeIconCandidates("org.telegram.desktop", "");
  assert(telegramCands.includes("telegram"), "Should extract telegram from org.telegram.desktop");
  assert(telegramCands.includes("telegram-desktop"), "Should include telegram-desktop candidate");

  const spotifyCands = icons.getNativeIconCandidates("com.spotify.Client", "");
  assert(spotifyCands.includes("spotify"), "Should extract spotify from com.spotify.Client");

  // Dynamic candidate decomposition for Web Apps & PWAs (e.g. Brave / Chrome web apps)
  const whatsappCands = icons.getNativeIconCandidates(
    "brave-web.whatsapp.com__-Default",
    "brave-web.whatsapp.com__-Default",
    "web.whatsapp.com",
    "web.whatsapp.com_/"
  );
  assert(whatsappCands.includes("whatsapp"), "Should extract whatsapp from brave-web.whatsapp.com__-Default");
  assert(whatsappCands.includes("Whatsapp"), "Should include capitalized Whatsapp candidate");
  assert(whatsappCands.includes("brave"), "Should include browser fallback candidate");

  const slackCands = icons.getNativeIconCandidates("chrome-app.slack.com__-Default", "");
  assert(slackCands.includes("slack"), "Should extract slack from chrome-app.slack.com__-Default");

  // Dynamic candidate decomposition (suffix stripping)
  const braveCands = icons.getNativeIconCandidates(
    "brave-browser",
    "brave-browser",
  );
  assert(braveCands.includes("brave"), "Should strip -browser suffix");
  assert(
    braveCands.includes("brave-browser"),
    "Should include original candidate",
  );

  // Case normalization
  const codeCands = icons.getNativeIconCandidates("Code", "");
  assert(codeCands.includes("code"), "Should include lowercased candidate");

  // Fallbacks
  assert.strictEqual(
    icons.getFallbackIcon(false),
    "",
    "Window fallback should be window icon",
  );
  assert.strictEqual(
    icons.getFallbackIcon(true),
    "󰨇",
    "Workspace fallback should be workspace icon",
  );

  // resolveIcon with mock Quickshell, DesktopEntries, and shellAppLib
  const mockQuickshell = {
    iconPath: function(name) {
      if (name === "ghostty") return "/usr/share/icons/hicolor/scalable/apps/ghostty.svg";
      if (name === "brave-desktop") return "image://icon/brave-desktop";
      if (name === "vscode") return "image://icon/vscode";
      if (name === "whatsapp") return "/home/codesmith28/.local/share/icons/hicolor/256x256/apps/whatsapp.png";
      if (name === "application-x-executable") return "image://icon/application-x-executable";
      return "";
    }
  };

  const mockShellAppLib = {
    iconIndex: {
      "whatsapp": "/home/codesmith28/.local/share/icons/hicolor/256x256/apps/whatsapp.png"
    },
    iconSource: function(name) {
      if (name === "whatsapp") return "file:///home/codesmith28/.local/share/icons/hicolor/256x256/apps/whatsapp.png";
      // Simulates real AppLibrary returning fallback application-x-executable on miss
      return "image://icon/application-x-executable";
    }
  };

  const mockDesktopEntries = {
    byId: function(id) {
      if (id === "brave-browser") return { id: "brave-browser", icon: "brave-desktop" };
      if (id === "code") return { id: "code", icon: "vscode" };
      if (id === "Whatsapp" || id === "Whatsapp.desktop" || id === "whatsapp") {
        return { id: "Whatsapp.desktop", name: "Whatsapp", icon: "whatsapp", execString: "omarchy-launch-webapp \"https://web.whatsapp.com/\"" };
      }
      return null;
    },
    applications: {
      values: [
        { id: "brave-browser", icon: "brave-desktop", startupClass: "brave-browser" },
        { id: "code", icon: "vscode", startupClass: "Code" },
        { id: "Whatsapp.desktop", name: "Whatsapp", icon: "whatsapp", execString: "omarchy-launch-webapp \"https://web.whatsapp.com/\"" }
      ]
    }
  };

  // 1. Resolve Brave via DesktopEntries byId
  const braveRes = icons.resolveIcon(mockQuickshell, mockDesktopEntries, "brave-browser", "brave-browser");
  assert.strictEqual(braveRes, "image://icon/brave-desktop", "Should resolve Brave to brave-desktop via desktop entry");

  // 2. Resolve VSCode via DesktopEntries byId
  const codeRes = icons.resolveIcon(mockQuickshell, mockDesktopEntries, "code", "code");
  assert.strictEqual(codeRes, "image://icon/vscode", "Should resolve VSCode to vscode via desktop entry");

  // 3. Resolve Ghostty via theme candidate lookup
  const ghosttyRes = icons.resolveIcon(mockQuickshell, mockDesktopEntries, "com.mitchellh.ghostty", "com.mitchellh.ghostty");
  assert.strictEqual(ghosttyRes, "/usr/share/icons/hicolor/scalable/apps/ghostty.svg");

  // 4. Resolve WhatsApp Web App via window class and exec URL matching
  const whatsappRes = icons.resolveIcon(
    mockQuickshell,
    mockDesktopEntries,
    "brave-web.whatsapp.com__-Default",
    "brave-web.whatsapp.com__-Default",
    mockShellAppLib,
    "web.whatsapp.com",
    "web.whatsapp.com_/"
  );
  assert.strictEqual(whatsappRes, "file:///home/codesmith28/.local/share/icons/hicolor/256x256/apps/whatsapp.png", "Should resolve WhatsApp web app to whatsapp icon");

  // 5. Fallback for completely unknown app to system application-x-executable
  const unknownRes = icons.resolveIcon(mockQuickshell, mockDesktopEntries, "unknown-app-xyz", "", mockShellAppLib);
  assert.strictEqual(unknownRes, "image://icon/application-x-executable", "Should fallback to application-x-executable");

  console.log(
    "  ✓ Icons.js dynamically generates FreeDesktop candidates, resolves Web Apps / PWAs, checks DesktopEntries, and resolves system app icons",
  );
}

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

// Test 7: WindowModel.js ignores Omarchy menu bar reserved space for app outlines
{
  const mockSnapshotWithBar = {
    clients: [
      {
        address: "0x10",
        mapped: true,
        workspace: { id: 1 },
        at: [12, 42], // 12px gap from left, 30px bar + 12px gap from top
        size: [1896, 1146], // Maximized window in 1920x1200 with 12px gaps
        title: "Editor",
        class: "code",
        focusHistoryID: 0
      }
    ],
    workspaces: [{ id: 1, name: "1" }],
    monitors: [
      {
        id: 0,
        name: "eDP-2",
        width: 1920,
        height: 1200,
        x: 0,
        y: 0,
        reserved: [0, 30, 0, 0], // Omarchy menu bar: 30px reserved at top
        activeWorkspace: { id: 1 }
      }
    ]
  };

  const parsedWithBar = wm.parseSnapshot(mockSnapshotWithBar, ["a"]);
  const win = parsedWithBar.workspaces[0].windows[0];

  // Usable bounds should be: height = 1200 - 30 = 1170, y_offset = 30
  // Window at y=42 should have normY = (42 - 30) / 1170 = 12 / 1170 (~0.01025)
  // Instead of unadjusted 42 / 1200 = 0.035
  const expectedNormY = (42 - 30) / (1200 - 30);
  assert(Math.abs(win.normY - expectedNormY) < 0.0001, `normY (${win.normY}) should equal ${expectedNormY}`);

  // Window height 1146 in usable height 1170 should have normH = 1146 / 1170 (~0.9795)
  const expectedNormH = 1146 / (1200 - 30);
  assert(Math.abs(win.normH - expectedNormH) < 0.0001, `normH (${win.normH}) should equal ${expectedNormH}`);

  // monitorAspect should reflect usable workspace aspect ratio (1920 / 1170)
  const expectedAspect = 1920 / 1170;
  assert(Math.abs(parsedWithBar.monitorAspect - expectedAspect) < 0.0001, `monitorAspect should be usable aspect ratio`);

  console.log(
    "  ✓ WindowModel.js ignores Omarchy menu bar reserved space and normalizes window outlines to usable workspace",
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

// Test 9: Zero windows open across all workspaces returns empty mruList
{
  const emptySnapshot = {
    clients: [],
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

  const parsed = wm.parseSnapshot(emptySnapshot, ["a"]);
  assert.strictEqual(parsed.mruList.length, 0, "mruList should be empty when no windows exist");
  assert.strictEqual(parsed.workspaces.length, 1, "Should still track active workspace");
  assert.strictEqual(parsed.workspaces[0].isEmpty, true, "Workspace should be marked empty");
  assert.strictEqual(parsed.workspaces[0].windows.length, 0, "Workspace should have 0 windows");

  console.log("  ✓ parseSnapshot with zero windows returns empty mruList and empty workspaces");
}

// Test 10: Being on workspace 4 with zero windows open anywhere returns workspaces 1, 2, 3, 4
{
  const emptySnapshotWs4 = {
    clients: [],
    workspaces: [{ id: 4, name: "4" }],
    monitors: [
      {
        id: 0,
        name: "eDP-1",
        width: 1920,
        height: 1080,
        x: 0,
        y: 0,
        activeWorkspace: { id: 4 },
      },
    ],
  };

  const parsed = wm.parseSnapshot(emptySnapshotWs4, ["a", "s", "d", "f"]);
  assert.strictEqual(parsed.mruList.length, 0, "mruList should be empty");
  assert.strictEqual(parsed.workspaces.length, 4, "Should show workspaces 1, 2, 3, 4");
  assert.strictEqual(parsed.workspaces[0].id, 1);
  assert.strictEqual(parsed.workspaces[0].letter, "A");
  assert.strictEqual(parsed.workspaces[1].id, 2);
  assert.strictEqual(parsed.workspaces[1].letter, "S");
  assert.strictEqual(parsed.workspaces[2].id, 3);
  assert.strictEqual(parsed.workspaces[2].letter, "D");
  assert.strictEqual(parsed.workspaces[3].id, 4);
  assert.strictEqual(parsed.workspaces[3].letter, "F");
  assert.strictEqual(parsed.workspaces[3].isActive, true);

  console.log("  ✓ On workspace 4 with zero windows, all workspaces 1..4 are generated with correct letters");
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

// Test 12: Multi-monitor setups: active monitor resolution, coordinate normalization, and per-workspace mapping
{
  // 1. findActiveMonitor
  const monitorsList = [
    { id: 0, name: "eDP-1", width: 1920, height: 1080, x: 0, y: 0, focused: false, activeWorkspace: { id: 1 } },
    { id: 1, name: "DP-1", width: 2560, height: 1440, x: 1920, y: 0, focused: true, activeWorkspace: { id: 2 } },
  ];
  const activeMon = wm.findActiveMonitor(monitorsList);
  assert.strictEqual(activeMon.name, "DP-1", "Focused monitor DP-1 should be active");

  // Fallback when none focused
  const noFocused = [
    { id: 0, name: "eDP-1", focused: false },
    { id: 1, name: "DP-1", focused: false },
  ];
  assert.strictEqual(wm.findActiveMonitor(noFocused).name, "eDP-1", "Should fallback to first monitor");
  assert.strictEqual(wm.findActiveMonitor([]).width, 1920, "Should return fallback object for empty array");

  // 2. createMonitorMap
  const map = wm.createMonitorMap(monitorsList);
  assert.strictEqual(map["eDP-1"].id, 0);
  assert.strictEqual(map[0].name, "eDP-1");
  assert.strictEqual(map["DP-1"].id, 1);
  assert.strictEqual(map[1].name, "DP-1");

  // 3. parseSnapshot with multiple monitors and spatial coordinate normalization
  const multiMonSnapshot = {
    monitors: monitorsList,
    workspaces: [
      { id: 1, name: "1", monitor: "eDP-1", monitorID: 0 },
      { id: 2, name: "2", monitor: "DP-1", monitorID: 1 },
    ],
    clients: [
      {
        address: "0x11",
        mapped: true,
        workspace: { id: 1 },
        monitor: 0,
        at: [100, 100],
        size: [800, 600],
        title: "Terminal on eDP-1",
        class: "foot",
        focusHistoryID: 1,
      },
      {
        address: "0x22",
        mapped: true,
        workspace: { id: 2 },
        monitor: 1,
        // Window is located on monitor DP-1 at x: 2120 (which is 200px from left edge of DP-1: 2120 - 1920 = 200)
        at: [2120, 140],
        size: [1280, 800],
        title: "Browser on DP-1",
        class: "brave-browser",
        focusHistoryID: 0,
      },
    ],
  };

  const parsed = wm.parseSnapshot(multiMonSnapshot, ["a", "s"]);
  assert.strictEqual(parsed.activeMonitorName, "DP-1", "Active monitor name should be DP-1");
  assert.strictEqual(parsed.workspaces.length, 2, "Should have 2 workspaces");

  // Workspace 1 on eDP-1
  assert.strictEqual(parsed.workspaces[0].monitorName, "eDP-1");
  assert.strictEqual(parsed.workspaces[0].monitorId, 0);
  assert.strictEqual(parsed.workspaces[0].isActive, false);

  // Workspace 2 on DP-1 (active monitor's workspace)
  assert.strictEqual(parsed.workspaces[1].monitorName, "DP-1");
  assert.strictEqual(parsed.workspaces[1].monitorId, 1);
  assert.strictEqual(parsed.workspaces[1].isActive, true);

  // Check window normalization on DP-1:
  // NormX should be (2120 - 1920) / 2560 = 200 / 2560 = 0.078125, NOT clamped or based on eDP-1
  const winDP1 = parsed.workspaces[1].windows[0];
  const expectedNormX = (2120 - 1920) / 2560;
  assert(Math.abs(winDP1.normX - expectedNormX) < 0.001, `normX on DP-1 should be ~${expectedNormX}, got ${winDP1.normX}`);
  const expectedNormW = 1280 / 2560; // 0.5
  assert(Math.abs(winDP1.normW - expectedNormW) < 0.001, `normW on DP-1 should be ~${expectedNormW}, got ${winDP1.normW}`);

  console.log("  ✓ Multi-monitor setups resolve active monitor and normalize window coordinates per monitor bounds");
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

// Test 15: Grouped window parsing, groupMembers, and UI components
{
  const mockData = {
    clients: [
      {
        address: "0x1",
        mapped: true,
        workspace: { id: 1 },
        at: [50, 50],
        size: [1800, 1100],
        title: "Terminal",
        class: "ghostty",
        focusHistoryID: 1,
        visible: false,
        grouped: ["0x1", "0x2"]
      },
      {
        address: "0x2",
        mapped: true,
        workspace: { id: 1 },
        at: [50, 50],
        size: [1800, 1100],
        title: "VS Code",
        class: "code",
        focusHistoryID: 0,
        visible: true,
        grouped: ["0x1", "0x2"]
      },
      {
        address: "0x3",
        mapped: true,
        workspace: { id: 2 },
        at: [0, 0],
        size: [1920, 1080],
        title: "Browser",
        class: "brave",
        focusHistoryID: 2,
        visible: true,
        grouped: []
      }
    ],
    workspaces: [
      { id: 1, name: "1" },
      { id: 2, name: "2" }
    ],
    monitors: [
      { id: 0, name: "eDP-1", width: 1920, height: 1200, x: 0, y: 0, focused: true }
    ]
  };

  const parsed = wm.parseSnapshot(mockData, ["a", "s", "d"]);
  const ws1 = parsed.workspaces[0];
  assert.strictEqual(ws1.windows.length, 2, "Workspace 1 should have 2 windows in the group");

  const win1 = ws1.windows[0];
  const win2 = ws1.windows[1];

  assert.strictEqual(win1.address, "0x1");
  assert.strictEqual(win1.isGrouped, true, "win1 should be marked isGrouped");
  assert.strictEqual(win1.groupIndex, 0, "win1 groupIndex should be 0");
  assert.strictEqual(win1.groupLength, 2, "win1 groupLength should be 2");
  assert.strictEqual(win1.groupMembers.length, 2, "win1 should have 2 groupMembers");
  assert.strictEqual(win1.groupMembers[0].address, "0x1");
  assert.strictEqual(win1.groupMembers[1].address, "0x2");
  assert.strictEqual(win1.groupMembers[0].wsIndex, 1);
  assert.strictEqual(win1.groupMembers[1].wsIndex, 2);

  assert.strictEqual(win2.address, "0x2");
  assert.strictEqual(win2.isGrouped, true, "win2 should be marked isGrouped");
  assert.strictEqual(win2.groupIndex, 1, "win2 groupIndex should be 1");
  assert.strictEqual(win2.groupLength, 2, "win2 groupLength should be 2");

  // Non-grouped window
  const ws2 = parsed.workspaces[1];
  assert.strictEqual(ws2.windows[0].isGrouped, false, "win3 should NOT be marked isGrouped");

  // Verify WindowTile.qml has tab bar and group pill support
  const tileQml = fs.readFileSync("components/WindowTile.qml", "utf8");
  assert(tileQml.includes("showTabBar"), "WindowTile should have showTabBar property");
  assert(tileQml.includes("groupMembers"), "WindowTile should iterate groupMembers");
  assert(tileQml.includes("miniGroupBadge"), "WindowTile should have miniGroupBadge fallback");

  // Verify FooterBar.qml has group tab badge
  const footerQml = fs.readFileSync("components/FooterBar.qml", "utf8");
  assert(footerQml.includes("rowGroupBadge"), "FooterBar should have rowGroupBadge");
  assert(footerQml.includes("isGrouped"), "FooterBar should check isGrouped");

  console.log("  ✓ WindowModel and components correctly support grouped windows with tabs and groupMembers");
}

// Test 16: Arrow navigation through grouped windows
{
  const mockData = {
    clients: [
      {
        address: "0x1",
        mapped: true,
        workspace: { id: 1 },
        at: [50, 50],
        size: [1800, 1100],
        title: "Terminal",
        class: "ghostty",
        focusHistoryID: 1,
        visible: false,
        grouped: ["0x1", "0x2"]
      },
      {
        address: "0x2",
        mapped: true,
        workspace: { id: 1 },
        at: [50, 50],
        size: [1800, 1100],
        title: "VS Code",
        class: "code",
        focusHistoryID: 0,
        visible: true,
        grouped: ["0x1", "0x2"]
      },
      {
        address: "0x3",
        mapped: true,
        workspace: { id: 2 },
        at: [0, 0],
        size: [1920, 1080],
        title: "Browser",
        class: "brave",
        focusHistoryID: 2,
        visible: true,
        grouped: []
      }
    ],
    workspaces: [
      { id: 1, name: "1" },
      { id: 2, name: "2" }
    ],
    monitors: [
      { id: 0, name: "eDP-1", width: 1920, height: 1200, x: 0, y: 0, focused: true }
    ]
  };

  const parsed = wm.parseSnapshot(mockData, ["a", "s", "d"]);

  // On Tab 1 ("0x1"), pressing right should navigate to Tab 2 ("0x2") in the same group
  const navRight1 = nav.findSpatialTarget(parsed.workspaces, "0x1", 1, "right");
  assert.strictEqual(navRight1.address, "0x2", "Moving right from Tab 1 should navigate to Tab 2");

  // On Tab 2 ("0x2"), pressing right should exit the group to Workspace 2 ("0x3")
  const navRight2 = nav.findSpatialTarget(parsed.workspaces, "0x2", 1, "right");
  assert.strictEqual(navRight2.address, "0x3", "Moving right from last Tab 2 should move to next workspace");

  // On Window 3 ("0x3"), pressing left should land on Tab 2 ("0x2") (the rightmost tab of the group)
  const navLeft3 = nav.findSpatialTarget(parsed.workspaces, "0x3", 2, "left");
  assert.strictEqual(navLeft3.address, "0x2", "Moving left into a group should select its rightmost tab");

  // On Tab 2 ("0x2"), pressing left should navigate to Tab 1 ("0x1")
  const navLeft2 = nav.findSpatialTarget(parsed.workspaces, "0x2", 1, "left");
  assert.strictEqual(navLeft2.address, "0x1", "Moving left from Tab 2 should navigate to Tab 1");

  // On Tab 1 ("0x1"), pressing down with no window below should cycle to Tab 2 ("0x2")
  const navDown1 = nav.findSpatialTarget(parsed.workspaces, "0x1", 1, "down");
  assert.strictEqual(navDown1.address, "0x2", "Moving down on Tab 1 with no window below should cycle to Tab 2");

  // On Tab 2 ("0x2"), pressing down should wrap back to Tab 1 ("0x1")
  const navDown2 = nav.findSpatialTarget(parsed.workspaces, "0x2", 1, "down");
  assert.strictEqual(navDown2.address, "0x1", "Moving down on Tab 2 should wrap back to Tab 1");

  // On Tab 1 ("0x1"), pressing up should cycle to Tab 2 ("0x2")
  const navUp1 = nav.findSpatialTarget(parsed.workspaces, "0x1", 1, "up");
  assert.strictEqual(navUp1.address, "0x2", "Moving up on Tab 1 should cycle to Tab 2");

  console.log("  ✓ findSpatialTarget arrow navigation correctly navigates through grouped windows");
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

// Test 18: Dynamic multi-row overflow (threshold from 6) and staggered arrangement
{
  const overlayQml = fs.readFileSync("AltTabOverlay.qml", "utf8");

  // 1. Verify threshold from 6 overflow logic in AltTabOverlay.qml
  assert(overlayQml.includes("isMultiRow: count > 6"), "AltTabOverlay should set isMultiRow when count > 6 (threshold from 6)");
  assert(overlayQml.includes("row1Count: isMultiRow ? Math.ceil(count / 2) : count"), "row1Count should split count evenly");
  assert(overlayQml.includes("row2Count: isMultiRow ? (count - row1Count) : 0"), "row2Count should take remainder");
  assert(overlayQml.includes("maxRowCards: Math.max(row1Count, row2Count)"), "maxRowCards should drive dynamicCardWidth to preserve sweet-spot size");

  // 2. Verify staggered arrangement: not directly one below other
  assert(overlayQml.includes("needsManualStagger: isMultiRow && (row1Count === row2Count)"), "needsManualStagger should detect equal row counts (like 10 workspaces)");
  assert(overlayQml.includes("staggerShift: needsManualStagger ? Math.round(stepSize * 0.25) : 0"), "staggerShift should offset rows by quarter step for a total half-card stagger");
  assert(overlayQml.includes("anchors.horizontalCenterOffset: -container.staggerShift"), "Row 1 should apply negative stagger offset");
  assert(overlayQml.includes("anchors.horizontalCenterOffset: container.staggerShift"), "Row 2 should apply positive stagger offset");

  // 3. Test Navigation.js 2D row-to-row jumping when workspaces > 6
  // Generate mock 10 workspaces snapshot
  const mock10Ws = [];
  for (let i = 1; i <= 10; i++) {
    mock10Ws.push({
      id: i,
      name: String(i),
      letter: String.fromCharCode(65 + i - 1),
      isEmpty: false,
      windows: [
        {
          address: "0x" + i,
          title: "App " + i,
          workspaceId: i,
          wsIndex: 1,
          isGrouped: false,
          normX: 0.1,
          normY: 0.1,
          normW: 0.8,
          normH: 0.8
        }
      ]
    });
  }

  // On Workspace 2 (index 1 in Row 1), moving down should jump to Workspace 7 (index 6 in Row 2)
  const navDownRow = nav.findSpatialTarget(mock10Ws, "0x2", 2, "down");
  assert.strictEqual(navDownRow.wsId, 7, "Moving down from Workspace 2 in Row 1 should jump to Workspace 7 in Row 2");
  assert.strictEqual(navDownRow.address, "0x7");

  // On Workspace 7 (index 6 in Row 2), moving up should jump back to Workspace 2 (index 1 in Row 1)
  const navUpRow = nav.findSpatialTarget(mock10Ws, "0x7", 7, "up");
  assert.strictEqual(navUpRow.wsId, 2, "Moving up from Workspace 7 in Row 2 should jump to Workspace 2 in Row 1");
  assert.strictEqual(navUpRow.address, "0x2");

  // On empty Workspace 3 (index 2 in Row 1), moving down should jump to empty Workspace 8
  const emptyMock10Ws = mock10Ws.map(ws => ({ id: ws.id, name: ws.name, isEmpty: true, windows: [] }));
  const navDownEmpty = nav.findSpatialTarget(emptyMock10Ws, null, 3, "down");
  assert.strictEqual(navDownEmpty.wsId, 8, "Moving down from empty Workspace 3 in Row 1 should jump to Workspace 8 in Row 2");
  assert.strictEqual(navDownEmpty.isWorkspace, true);

  console.log("  ✓ Dynamic multi-row overflow (threshold from 6), staggered staggerShift, and 2D row navigation verified");
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

console.log("All unit tests passed successfully!");



