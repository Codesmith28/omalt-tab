// tests/test_navigation.js: Tests for Navigation.js (home-row jumping, spatial navigation, grouped window navigation, multi-row navigation)
const fs = require("fs");
const assert = require("assert");
const { loadModule } = require("./helpers");

function run() {
  console.log("--> Testing Navigation.js (Home-row jumping, 2D spatial traversal, grouped & multi-row navigation)...");
  const wm = loadModule("js/WindowModel.js");
  const nav = loadModule("js/Navigation.js");

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
}

if (require.main === module) {
  run();
}

module.exports = run;
