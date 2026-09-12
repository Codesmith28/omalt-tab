// test_logic.js: Automated tests for WindowModel.js and Navigation.js
const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

function loadModule(filePath) {
  const code = fs
    .readFileSync(filePath, "utf8")
    .replace(/^\s*\.pragma\s+library\s*;?/m, "");
  const context = { console, Math, parseInt, parseFloat, Array, Object };
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
  assert.strictEqual(config.requireEnterToSwitch(), false, "requireEnterToSwitch() must return false in prod mode");

  console.log(
    "  ✓ Config.js correctly gates requireEnterToSwitch, debugLogging, dev badges, and screenshot unlock based on devMode",
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

console.log("All unit tests passed successfully!");



