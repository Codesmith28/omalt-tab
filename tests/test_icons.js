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

  // Test 20: Security check: Icons.js guards against client-supplied arbitrary file paths, URI schemes, and PNG decompression bombs
  {
    // 1. Validate isValidIconCandidate rejects path traversal, schemes, extensions, and malformed candidates
    assert.strictEqual(icons.isValidIconCandidate("/tmp/evil.png"), false, "Must reject absolute filesystem paths");
    assert.strictEqual(icons.isValidIconCandidate("file:///tmp/evil.png"), false, "Must reject file:// URIs");
    assert.strictEqual(icons.isValidIconCandidate("../evil.png"), false, "Must reject relative directory traversal");
    assert.strictEqual(icons.isValidIconCandidate("evil.png"), false, "Must reject image file extensions");
    assert.strictEqual(icons.isValidIconCandidate("evil.svg"), false, "Must reject svg extensions");
    assert.strictEqual(icons.isValidIconCandidate("evil.xpm"), false, "Must reject xpm extensions");
    assert.strictEqual(icons.isValidIconCandidate("foo:bar"), false, "Must reject colons");
    assert.strictEqual(icons.isValidIconCandidate("foo\\bar"), false, "Must reject backslashes");
    assert.strictEqual(icons.isValidIconCandidate("foo\0bar"), false, "Must reject null bytes");
    assert.strictEqual(icons.isValidIconCandidate("-bad"), false, "Must reject leading dash");
    assert.strictEqual(icons.isValidIconCandidate("bad-"), false, "Must reject trailing dash");
    assert.strictEqual(icons.isValidIconCandidate(".bad"), false, "Must reject leading dot");
    assert.strictEqual(icons.isValidIconCandidate("bad."), false, "Must reject trailing dot");
    assert.strictEqual(icons.isValidIconCandidate(""), false, "Must reject empty string");
    assert.strictEqual(icons.isValidIconCandidate("a".repeat(150)), false, "Must reject oversized strings");

    // Permitted candidates
    assert.strictEqual(icons.isValidIconCandidate("ghostty"), true);
    assert.strictEqual(icons.isValidIconCandidate("com.mitchellh.ghostty"), true);
    assert.strictEqual(icons.isValidIconCandidate("brave-browser"), true);
    assert.strictEqual(icons.isValidIconCandidate("web.whatsapp.com"), true);
    assert.strictEqual(icons.isValidIconCandidate("org.telegram.desktop"), true);

    // 2. Validate isSafeIconSource
    assert.strictEqual(icons.isSafeIconSource("image://icon/app", false), true, "image:// provider is safe");
    assert.strictEqual(icons.isSafeIconSource("qrc:/icons/app.png", false), true, "qrc:/ resource is safe");
    assert.strictEqual(icons.isSafeIconSource("/usr/share/icons/hicolor/scalable/apps/ghostty.svg", false), true, "System icon directory is safe");
    assert.strictEqual(icons.isSafeIconSource("/usr/share/pixmaps/app.png", false), true, "System pixmaps directory is safe");
    assert.strictEqual(icons.isSafeIconSource("file:///home/user/.local/share/icons/app.png", false), true, "User local icons directory is safe");

    // Dangerous paths rejected
    assert.strictEqual(icons.isSafeIconSource("/tmp/bomb.png", false), false, "/tmp paths must be rejected");
    assert.strictEqual(icons.isSafeIconSource("file:///tmp/bomb.png", false), false, "file:///tmp URIs must be rejected");
    assert.strictEqual(icons.isSafeIconSource("/var/tmp/bomb.png", false), false, "/var/tmp paths must be rejected");
    assert.strictEqual(icons.isSafeIconSource("/dev/shm/bomb.png", false), false, "/dev paths must be rejected");
    assert.strictEqual(icons.isSafeIconSource("/proc/self/bomb.png", false), false, "/proc paths must be rejected");
    assert.strictEqual(icons.isSafeIconSource("/home/user/Downloads/bomb.png", false), false, "Unverified user directories must be rejected");
    assert.strictEqual(icons.isSafeIconSource("file:///etc/passwd", false), false, "Arbitrary system files must be rejected");
    assert.strictEqual(icons.isSafeIconSource("/usr/share/icons/../../tmp/bomb.png", false), false, "Traversal must be rejected");

    // 3. Simulated malicious host shellAppLib and resolver test
    const mockQuickshell = {
      iconPath: function(name, theme) {
        if (name === "application-x-executable") return "image://icon/application-x-executable";
        return "";
      }
    };

    const hostileAppLib = {
      iconIndex: {},
      iconSource: function(name) {
        // Hostile host shellAppLib returning client-supplied paths directly
        if (name && (name.startsWith("/") || name.startsWith("file://"))) {
          return name.startsWith("/") ? ("file://" + name) : name;
        }
        return "image://icon/application-x-executable";
      }
    };

    const emptyDesktopEntries = {
      byId: () => null,
      heuristicLookup: () => null,
      applications: { values: [] }
    };

    // Malicious Wayland client trying /tmp/exploit.png
    icons.clearIconCache();
    const res1 = icons.resolveIcon(mockQuickshell, emptyDesktopEntries, "/tmp/exploit.png", "", hostileAppLib);
    assert.strictEqual(res1, "image://icon/application-x-executable", "Malicious /tmp path must fall back to application-x-executable");

    // Malicious Wayland client trying file:///tmp/exploit.png
    icons.clearIconCache();
    const res2 = icons.resolveIcon(mockQuickshell, emptyDesktopEntries, "file:///tmp/exploit.png", "", hostileAppLib);
    assert.strictEqual(res2, "image://icon/application-x-executable", "Malicious file:// URI must fall back to application-x-executable");

    // Malicious Wayland client trying directory traversal
    icons.clearIconCache();
    const res3 = icons.resolveIcon(mockQuickshell, emptyDesktopEntries, "../../../tmp/exploit.png", "", hostileAppLib);
    assert.strictEqual(res3, "image://icon/application-x-executable", "Traversal candidate must fall back to application-x-executable");

    // Malicious Wayland client attempting decompression bomb via title
    icons.clearIconCache();
    const res4 = icons.resolveIcon(mockQuickshell, emptyDesktopEntries, "innocent-app", "", hostileAppLib, "/tmp/evil-bomb.png");
    assert.strictEqual(res4, "image://icon/application-x-executable", "Malicious title path must fall back to application-x-executable");

    // Malicious winData object passed as first argument
    icons.clearIconCache();
    const res5 = icons.resolveIcon(mockQuickshell, emptyDesktopEntries, { clientClass: "/tmp/exploit.png", title: "/tmp/exploit.png" }, "", hostileAppLib);
    assert.strictEqual(res5, "image://icon/application-x-executable", "Malicious winData object must fall back to application-x-executable");

    console.log("  ✓ Security check: Icons.js blocks arbitrary file paths, URI schemes, and PNG decompression bombs from untrusted window metadata");
  }
}

if (require.main === module) {
  run();
}

module.exports = run;
