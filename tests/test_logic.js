// test_logic.js: Master test suite runner for omalt-tab
const testWindowModel = require("./test_window_model");
const testNavigation = require("./test_navigation");
const testIcons = require("./test_icons");
const testOverlayLifecycle = require("./test_overlay_lifecycle");
const testIntegrationScripts = require("./test_integration_scripts");

console.log("--> Running all omalt-tab unit test suites...");

testWindowModel();
testNavigation();
testIcons();
testOverlayLifecycle();
testIntegrationScripts();

// Test 20: Security check: Icons.js guards against client-supplied arbitrary file paths, URI schemes, and PNG decompression bombs
{
  const icons = loadModule("js/Icons.js");

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

console.log("All unit tests passed successfully!");
