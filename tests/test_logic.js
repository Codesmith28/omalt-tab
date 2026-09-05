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

console.log("All unit tests passed successfully!");
