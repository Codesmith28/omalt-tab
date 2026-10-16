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

console.log("All unit tests passed successfully!");
