// tests/test_integration_scripts.js: Tests for setup notification, scripts/uninstall.sh, and Makefile targets
const fs = require("fs");
const assert = require("assert");

function run() {
  console.log("--> Testing Integration & Packaging Scripts (Install notification, uninstall safety)...");

  // Test 20: Setup guidance notification on install
  {
    const overlayQml = fs.readFileSync("AltTabOverlay.qml", "utf8");

    // 1. Verify AltTabOverlay.qml declares setupNotifier and gates it via in-memory FileView
    assert(overlayQml.includes("id: setupNotifier"), "AltTabOverlay must define setupNotifier process");
    assert(overlayQml.includes("hyprBindingsFile"), "AltTabOverlay must check bindings via FileView");
    assert(overlayQml.includes("hasBindingsHook"), "AltTabOverlay must gate setupNotifier with hasBindingsHook");
    assert(overlayQml.includes("setupNotifier.running = true;"), "AltTabOverlay Component.onCompleted must trigger setupNotifier when missing");
    assert(overlayQml.includes("notify-send"), "AltTabOverlay must notify the user with setup instructions");
    assert(!overlayQml.includes("integrationRunner"), "AltTabOverlay should not run silent auto-injection to comply with security audits");

    console.log("  ✓ Setup guidance notification on install verified");
  }

  // Test 22: scripts/uninstall.sh order and Makefile uninstall target safety
  {
    const uninstallSh = fs.readFileSync("scripts/uninstall.sh", "utf8");
    const makefile = fs.readFileSync("Makefile", "utf8");

    // Verify scripts/uninstall.sh resolves SCRIPT_DIR and cleans bindings before removing directory
    const cleanBindingsIdx = uninstallSh.indexOf("clean-bindings.py");
    const removeTargetIdx = uninstallSh.indexOf("rm -rf \"${TARGET_DIR}\"");
    assert(cleanBindingsIdx !== -1, "uninstall.sh must call clean-bindings.py");
    assert(removeTargetIdx !== -1, "uninstall.sh must remove TARGET_DIR");
    assert(cleanBindingsIdx < removeTargetIdx, "clean-bindings.py must be called BEFORE removing TARGET_DIR");

    // Verify restart is called before removing directory
    const restartIdx = uninstallSh.indexOf("restart.sh");
    assert(restartIdx !== -1, "uninstall.sh must trigger restart.sh");
    assert(restartIdx < removeTargetIdx, "restart.sh must run BEFORE removing TARGET_DIR");

    // Verify Makefile uninstall target does NOT call scripts/restart.sh after uninstall.sh
    const uninstallTargetMatch = makefile.match(/uninstall:\n([\s\S]*?)(?=\n\w+:|$)/);
    assert(uninstallTargetMatch, "Makefile must have uninstall target");
    assert(!uninstallTargetMatch[1].includes("@scripts/restart.sh"), "Makefile uninstall must not execute scripts/restart.sh after uninstall.sh");

    console.log("  ✓ scripts/uninstall.sh execution order and Makefile uninstall target safety verified");
  }
}

if (require.main === module) {
  run();
}

module.exports = run;
