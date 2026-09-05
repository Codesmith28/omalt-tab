// js/Config.js: Centralized configuration and developer options for omalt-tab
.pragma library

// Development mode flag
// - When devMode is true:
//     * Releasing Alt does NOT switch to the task (switcher stays open)
//     * Pressing Enter (Return) is required to switch to the selected task
//     * Visual DEV indicator is displayed in HeaderBar
//     * FooterBar displays "Press Enter to switch"
//     * Verbose debug logging is enabled
// - When devMode is false:
//     * Standard production switcher: releasing Alt switches to the task immediately
var devMode = true;

// Extensible feature flags and dev options
var options = {
    // Require explicit Enter key press to commit/enter into selected task
    requireEnterToSwitch: devMode,
    // Enable verbose console logging for events, navigation, and snapshots
    debugLogging: devMode,
    // Show dev mode badge in header
    showDevBadge: devMode,
    // Unlock PrintScreen / screenshot shortcuts during switcher display in dev mode
    unlockScreenshot: true
};

function isDevMode() {
    return !!devMode;
}

function requireEnterToSwitch() {
    return !!devMode;
}

function isDebugLogging() {
    return !!devMode || (options && !!options.debugLogging);
}

function isDevBadgeVisible() {
    return !!devMode || (options && !!options.showDevBadge);
}

function isScreenshotUnlocked() {
    return !!devMode || (options && !!options.unlockScreenshot);
}
