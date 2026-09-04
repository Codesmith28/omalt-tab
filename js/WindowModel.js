// WindowModel.js: Parses and normalizes Hyprland state snapshots for omalt-tab

.pragma library

var DEFAULT_HOME_ROW_LETTERS = ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"];

/**
 * Parses raw JSON snapshot from Hyprland into structured workspaces and MRU windows.
 * @param {Object} data - Raw JSON with { clients, workspaces, monitors }
 * @param {Array<string>} wsLetters - Home row workspace letters array
 * @returns {Object} { workspaces: Array, mruList: Array }
 */
function parseSnapshot(data, wsLetters) {
    if (!data) return { workspaces: [], mruList: [] };

    var clients = data.clients || [];
    var workspaces = data.workspaces || [];
    var monitors = data.monitors || [];
    var letters = (wsLetters && wsLetters.length > 0) ? wsLetters : DEFAULT_HOME_ROW_LETTERS;

    var primaryMonitor = monitors.length > 0 ? monitors[0] : { width: 1920, height: 1200, x: 0, y: 0 };
    var monitorMap = {};
    for (var m = 0; m < monitors.length; m++) {
        var monObj = monitors[m];
        monitorMap[monObj.name] = monObj;
        monitorMap[monObj.id] = monObj;
    }

    // Filter valid interactive windows
    var validClients = clients.filter(function(c) {
        return c.mapped === true &&
               !c.hidden &&
               c.workspace &&
               c.workspace.id > 0 &&
               c.class !== "org.quickshell" &&
               !c.class.startsWith("org.omarchy.screensaver");
    });

    // Sort workspaces ascending by ID
    workspaces.sort(function(a, b) { return a.id - b.id; });

    // Group clients by workspace id
    var wsClientsMap = {};
    for (var i = 0; i < validClients.length; i++) {
        var c = validClients[i];
        var wsId = c.workspace.id;
        if (!wsClientsMap[wsId]) wsClientsMap[wsId] = [];
        wsClientsMap[wsId].push(c);
    }

    var processedWorkspaces = [];
    var vpWidth = 280;
    var vpHeight = 175;

    for (var wIdx = 0; wIdx < workspaces.length; wIdx++) {
        var ws = workspaces[wIdx];
        var wid = ws.id;

        var wsMon = monitorMap[ws.monitor] || monitorMap[ws.monitorID] || primaryMonitor;
        var scaleX = vpWidth / (wsMon.width || 1920);
        var scaleY = vpHeight / (wsMon.height || 1200);

        // Letter assignment from home row keys: "asdfghjkl;"
        var letter = (wid >= 1 && wid <= letters.length)
            ? letters[wid - 1]
            : letters[wIdx % letters.length];

        var wsWindows = wsClientsMap[wid] || [];

        // Sort windows within workspace spatially: left-to-right, top-to-bottom
        wsWindows.sort(function(a, b) {
            if (Math.abs(a.at[0] - b.at[0]) > 25) {
                return a.at[0] - b.at[0];
            }
            return a.at[1] - b.at[1];
        });

        var processedWindows = [];
        for (var k = 0; k < wsWindows.length; k++) {
            var win = wsWindows[k];
            var num = k + 1; // 1-based index

            var rx = Math.max(0, (win.at[0] - (wsMon.x || 0)) * scaleX);
            var ry = Math.max(0, (win.at[1] - (wsMon.y || 0)) * scaleY);
            var rw = Math.max(65, Math.min(vpWidth - rx, win.size[0] * scaleX));
            var rh = Math.max(48, Math.min(vpHeight - ry, win.size[1] * scaleY));

            processedWindows.push({
                address: win.address,
                title: win.title || win.initialTitle || win.class || "Window",
                clientClass: win.class || win.initialClass || "window",
                initialClass: win.initialClass || "",
                workspaceId: wid,
                wsLetter: letter.toUpperCase(),
                wsIndex: num,
                focusHistoryID: win.focusHistoryID,
                floating: win.floating,
                rx: rx,
                ry: ry,
                rw: rw,
                rh: rh
            });
        }

        processedWorkspaces.push({
            id: wid,
            name: ws.name || ("" + wid),
            letter: letter.toUpperCase(),
            letterLower: letter.toLowerCase(),
            isActive: (primaryMonitor.activeWorkspace && primaryMonitor.activeWorkspace.id === wid),
            windows: processedWindows
        });
    }

    // Flat MRU list sorted by focusHistoryID (most recently focused first)
    var flatMru = validClients.slice();
    flatMru.sort(function(a, b) { return a.focusHistoryID - b.focusHistoryID; });

    return {
        workspaces: processedWorkspaces,
        mruList: flatMru
    };
}

/**
 * Finds client display details by window address across all workspaces.
 */
function findClientData(workspacesData, address, fallbackClient) {
    if (!workspacesData || !address) return null;

    for (var i = 0; i < workspacesData.length; i++) {
        var ws = workspacesData[i];
        for (var j = 0; j < ws.windows.length; j++) {
            if (ws.windows[j].address === address) {
                return ws.windows[j];
            }
        }
    }

    if (fallbackClient) {
        return {
            address: fallbackClient.address,
            title: fallbackClient.title || fallbackClient.class || "Window",
            clientClass: fallbackClient.class || "window",
            initialClass: fallbackClient.initialClass || "",
            wsLetter: "A",
            wsIndex: 1
        };
    }
    return null;
}
