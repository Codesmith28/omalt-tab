// test_logic.js: Automated tests for WindowModel.js and Navigation.js
const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

function loadModule(filePath) {
    const code = fs.readFileSync(filePath, "utf8").replace(/^\s*\.pragma\s+library\s*;?/m, "");
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
            { address: "0x1", mapped: true, workspace: { id: 1 }, at: [100, 100], size: [800, 600], title: "Kitty", class: "kitty", focusHistoryID: 0 },
            { address: "0x3", mapped: true, workspace: { id: 3 }, at: [200, 200], size: [800, 600], title: "Code", class: "code", focusHistoryID: 1 }
        ],
        workspaces: [
            { id: 1, name: "1" },
            { id: 3, name: "3" }
        ],
        monitors: [
            { id: 0, name: "eDP-1", width: 1920, height: 1080, x: 0, y: 0, activeWorkspace: { id: 1 } }
        ]
    };

    const parsed = wm.parseSnapshot(mockData, ["a", "s", "d", "f", "g"]);
    assert.strictEqual(parsed.workspaces.length, 3, "Expected 3 workspaces (1, 2, 3)");
    assert.strictEqual(parsed.workspaces[0].id, 1);
    assert.strictEqual(parsed.workspaces[1].id, 2);
    assert.strictEqual(parsed.workspaces[2].id, 3);

    // Workspace 2 must be marked empty
    assert.strictEqual(parsed.workspaces[1].isEmpty, true, "Workspace 2 should be empty");
    assert.strictEqual(parsed.workspaces[1].letter, "S", "Workspace 2 letter should be S");
    assert.strictEqual(parsed.workspaces[1].windows.length, 0, "Workspace 2 should have 0 windows");

    // Workspace 1 and 3 should have windows
    assert.strictEqual(parsed.workspaces[0].isEmpty, false);
    assert.strictEqual(parsed.workspaces[0].letter, "A");
    assert.strictEqual(parsed.workspaces[2].isEmpty, false);
    assert.strictEqual(parsed.workspaces[2].letter, "D");

    console.log("  ✓ parseSnapshot handles empty in-between workspaces correctly");
}

// Test 2: Navigation to empty workspace via home-row letter
{
    const mockData = {
        clients: [
            { address: "0x1", mapped: true, workspace: { id: 1 }, at: [100, 100], size: [800, 600], title: "Kitty", class: "kitty", focusHistoryID: 0 },
            { address: "0x3", mapped: true, workspace: { id: 3 }, at: [200, 200], size: [800, 600], title: "Code", class: "code", focusHistoryID: 1 }
        ],
        workspaces: [{ id: 1, name: "1" }, { id: 3, name: "3" }],
        monitors: [{ id: 0, name: "eDP-1", width: 1920, height: 1080, x: 0, y: 0, activeWorkspace: { id: 1 } }]
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

    console.log("  ✓ findWorkspaceJump correctly resolves both populated and empty workspaces");
}

// Test 3: 2D Spatial navigation across empty workspaces
{
    const mockData = {
        clients: [
            { address: "0x1", mapped: true, workspace: { id: 1 }, at: [100, 100], size: [800, 600], title: "Kitty", class: "kitty", focusHistoryID: 0 },
            { address: "0x3", mapped: true, workspace: { id: 3 }, at: [200, 200], size: [800, 600], title: "Code", class: "code", focusHistoryID: 1 }
        ],
        workspaces: [{ id: 1, name: "1" }, { id: 3, name: "3" }],
        monitors: [{ id: 0, name: "eDP-1", width: 1920, height: 1080, x: 0, y: 0, activeWorkspace: { id: 1 } }]
    };

    const parsed = wm.parseSnapshot(mockData, ["a", "s", "d"]);

    // Move right from 0x1 in ws 1 -> should go to ws 2 (empty)
    const targetRight = nav.findSpatialTarget(parsed.workspaces, "0x1", 1, "right");
    assert(targetRight !== null, "Spatial target should exist");
    assert.strictEqual(targetRight.wsId, 2);
    assert.strictEqual(targetRight.isWorkspace, true);

    // Move right again from ws 2 -> should go to 0x3 in ws 3
    const targetRight2 = nav.findSpatialTarget(parsed.workspaces, null, 2, "right");
    assert(targetRight2 !== null);
    assert.strictEqual(targetRight2.wsId, 3);
    assert.strictEqual(targetRight2.address, "0x3");

    console.log("  ✓ findSpatialTarget smoothly navigates across empty workspaces");
}

// Test 4: Window index jumping (1..9)
{
    const mockWs = [
        {
            id: 1,
            isEmpty: false,
            windows: [
                { address: "0x1", wsIndex: 1 },
                { address: "0x2", wsIndex: 2 }
            ]
        }
    ];

    const jumpWin = nav.findWindowJump(mockWs, 1, 2);
    assert.strictEqual(jumpWin, "0x2");

    console.log("  ✓ findWindowJump jumps to specific window index");
}

console.log("All unit tests passed successfully!");
