// tests/test_icons.js: Tests for Icons.js (FreeDesktop icon candidates, Web Apps, PWAs, DesktopEntries, and fallbacks)
const assert = require("assert");
const { loadModule } = require("./helpers");

function run() {
  console.log("--> Testing Icons.js (Candidate resolution, Web Apps, PWAs, DesktopEntries, and fallbacks)...");
  const icons = loadModule("js/Icons.js");

  // Test 5: Icons.js dynamic candidate lookup and fallback icons
  {
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
}

if (require.main === module) {
  run();
}

module.exports = run;
