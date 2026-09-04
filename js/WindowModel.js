// WindowModel.js: Parses and normalizes Hyprland state snapshots for omalt-tab

.pragma library

var DEFAULT_HOME_ROW_LETTERS = ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"];

/**
 * Parses raw JSON snapshot from Hyprland into structured workspaces and MRU windows.
 * Dynamically filters out unneeded empty workspaces so the switcher only occupies
 * the space that is actually needed.
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

    // Group clients by workspace id
    var wsClientsMap = {};
    for (var i = 0; i < validClients.length; i++) {
        var c = validClients[i];
        var wsId = c.workspace.id;
        if (!wsClientsMap[wsId]) wsClientsMap[wsId] = [];
        wsClientsMap[wsId].push(c);
    }

    // Identify active workspace ID
    var activeWsId = (primaryMonitor.activeWorkspace && primaryMonitor.activeWorkspace.id > 0)
        ? primaryMonitor.activeWorkspace.id
        : -1;

    // Dynamically select workspaces that occupy actual content:
    // Workspaces with active windows, OR the currently active workspace
    var visibleWorkspacesMap = {};
    var visibleWorkspaces = [];

    for (var w = 0; w < workspaces.length; w++) {
        var ws = workspaces[w];
        var wid = ws.id;
        var winCount = (wsClientsMap[wid] && wsClientsMap[wid].length) || 0;
        var isActive = (wid === activeWsId);

        if (winCount > 0 || isActive) {
            visibleWorkspacesMap[wid] = true;
            visibleWorkspaces.push(ws);
        }
    }

    // Also include any workspace from clients not present in workspaces array
    for (var cWsId in wsClientsMap) {
        var idNum = parseInt(cWsId);
        if (!visibleWorkspacesMap[idNum]) {
            visibleWorkspacesMap[idNum] = true;
            visibleWorkspaces.push({ id: idNum, name: "" + idNum });
        }
    }

    // Sort visible workspaces ascending by ID
    visibleWorkspaces.sort(function(a, b) { return a.id - b.id; });

    var processedWorkspaces = [];
    var vpWidth = 280;
    var vpHeight = 175;

    for (var wIdx = 0; wIdx < visibleWorkspaces.length; wIdx++) {
        var curWs = visibleWorkspaces[wIdx];
        var curWid = curWs.id;

        var wsMon = monitorMap[curWs.monitor] || monitorMap[curWs.monitorID] || primaryMonitor;
        var scaleX = vpWidth / (wsMon.width || 1920);
        var scaleY = vpHeight / (wsMon.height || 1200);

        // Letter assignment from home row keys: "asdfghjkl;" (1 -> a, 2 -> s...)
        var letter = (curWid >= 1 && curWid <= letters.length)
            ? letters[curWid - 1]
            : letters[wIdx % letters.length];

        var wsWindows = wsClientsMap[curWid] || [];

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
                workspaceId: curWid,
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
            id: curWid,
            name: curWs.name || ("" + curWid),
            letter: letter.toUpperCase(),
            letterLower: letter.toLowerCase(),
            isActive: (curWid === activeWsId),
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
