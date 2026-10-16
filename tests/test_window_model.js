// tests/test_window_model.js: Tests for WindowModel.js geometry, snapshots, grouping, and scaling
const fs = require("fs");
const assert = require("assert");
const { loadModule } = require("./helpers");

function run() {
  console.log("--> Testing WindowModel.js (Snapshots, Geometry, Grouping, Scaling)...");
  const wm = loadModule("js/WindowModel.js");

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

  // Test 21: Monitor scale handling (scale != 1.0) and logical coordinate normalization
  {
    // Scenario 1: Scale 1.5 with 3840x2160 monitor (logical 2560x1440)
    // Two tiled windows side-by-side, each 1280px wide logically
    const scaledSnapshot1_5 = {
      clients: [
        {
          address: "0x101",
          mapped: true,
          workspace: { id: 1 },
          at: [0, 30],
          size: [1280, 1410],
          title: "Left Half",
          class: "terminal",
          focusHistoryID: 0
        },
        {
          address: "0x102",
          mapped: true,
          workspace: { id: 1 },
          at: [1280, 30],
          size: [1280, 1410],
          title: "Right Half",
          class: "browser",
          focusHistoryID: 1
        }
      ],
      workspaces: [{ id: 1, name: "1", monitor: "DP-1", monitorID: 0 }],
      monitors: [
        {
          id: 0,
          name: "DP-1",
          width: 3840,
          height: 2160,
          x: 0,
          y: 0,
          scale: 1.5,
          reserved: [0, 30, 0, 0],
          focused: true,
          activeWorkspace: { id: 1 }
        }
      ]
    };

    const parsed1_5 = wm.parseSnapshot(scaledSnapshot1_5, ["a"]);
    const ws1 = parsed1_5.workspaces[0];
    assert.strictEqual(ws1.windows.length, 2);

    const leftWin = ws1.windows[0];
    const rightWin = ws1.windows[1];

    // Left window: normX should be 0, normW should be exactly 0.5 (1280 / 2560)
    assert(Math.abs(leftWin.normX - 0.0) < 0.001, `Left window normX should be 0, got ${leftWin.normX}`);
    assert(Math.abs(leftWin.normW - 0.5) < 0.001, `Left window normW should be 0.5, got ${leftWin.normW}`);

    // Right window: normX should be 0.5 (1280 / 2560), normW should be 0.5
    assert(Math.abs(rightWin.normX - 0.5) < 0.001, `Right window normX should be 0.5, got ${rightWin.normX}`);
    assert(Math.abs(rightWin.normW - 0.5) < 0.001, `Right window normW should be 0.5, got ${rightWin.normW}`);

    // Combined width fills 100% of usable card viewport without shrinking or wasted space
    assert(Math.abs((leftWin.normW + rightWin.normW) - 1.0) < 0.001, "Combined window width should equal 1.0");

    // Scenario 2: Scale 2.0 with 3840x2160 monitor (logical 1920x1080)
    // Single maximized window: size [1920, 1050], at [0, 30]
    const scaledSnapshot2_0 = {
      clients: [
        {
          address: "0x201",
          mapped: true,
          workspace: { id: 1 },
          at: [0, 30],
          size: [1920, 1050],
          title: "Maximized",
          class: "code",
          focusHistoryID: 0
        }
      ],
      workspaces: [{ id: 1, name: "1", monitor: "DP-1", monitorID: 0 }],
      monitors: [
        {
          id: 0,
          name: "DP-1",
          width: 3840,
          height: 2160,
          x: 0,
          y: 0,
          scale: 2.0,
          reserved: [0, 30, 0, 0],
          focused: true,
          activeWorkspace: { id: 1 }
        }
      ]
    };

    const parsed2_0 = wm.parseSnapshot(scaledSnapshot2_0, ["a"]);
    const maxWin = parsed2_0.workspaces[0].windows[0];
    assert(Math.abs(maxWin.normX - 0.0) < 0.001, "Maximized normX should be 0");
    assert(Math.abs(maxWin.normY - 0.0) < 0.001, "Maximized normY should be 0");
    assert(Math.abs(maxWin.normW - 1.0) < 0.001, `Maximized normW should be 1.0, got ${maxWin.normW}`);
    assert(Math.abs(maxWin.normH - 1.0) < 0.001, `Maximized normH should be 1.0, got ${maxWin.normH}`);

    // Scenario 3: Fractional Scale 1.25 with 1920x1080 monitor (logical 1536x864)
    const bounds1_25 = wm.getUsableMonitorBounds({ width: 1920, height: 1080, scale: 1.25, reserved: [0, 0, 0, 0] });
    assert.strictEqual(bounds1_25.width, 1536, "Logical width at 1.25 scale should be 1536");
    assert.strictEqual(bounds1_25.height, 864, "Logical height at 1.25 scale should be 864");

    console.log("  ✓ Monitor scale handling (scale != 1.0) and logical coordinate normalization verified");
  }
}

if (require.main === module) {
  run();
}

module.exports = run;
