// WindowModel.js: Parses and normalizes Hyprland state snapshots for omalt-tab

.pragma library

var DEFAULT_HOME_ROW_LETTERS = ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"];

/**
 * Resolves the currently focused/active monitor from the monitor list,
 * falling back to the first available monitor or sensible defaults.
 * @param {Array<Object>} monitors - List of monitor objects from Hyprland
 * @returns {Object} Active monitor object
 */
function findActiveMonitor(monitors) {
    if (!monitors || monitors.length === 0) {
        return { width: 1920, height: 1200, x: 0, y: 0, name: "", id: 0, focused: true };
    }
    for (var m = 0; m < monitors.length; m++) {
        if (monitors[m].focused) return monitors[m];
    }
    return monitors[0];
}

/**
 * Builds an index map of monitors by both string name and integer ID.
 * @param {Array<Object>} monitors - List of monitor objects from Hyprland
 * @returns {Object} Key-value map of monitors indexed by name and id
 */
function createMonitorMap(monitors) {
    var map = {};
    if (!monitors) return map;
    for (var m = 0; m < monitors.length; m++) {
        var monObj = monitors[m];
        if (monObj.name) map[monObj.name] = monObj;
        if (monObj.id !== undefined) map[monObj.id] = monObj;
    }
    return map;
}

/**
 * Calculates the usable monitor bounding box by subtracting reserved areas
 * (such as the top Omarchy menu bar or any side/bottom docks).
 * Hyprland reserved array format: [left, top, right, bottom]
 * @param {Object} mon - Hyprland monitor object
 * @param {number} fallbackW - Fallback monitor width
 * @param {number} fallbackH - Fallback monitor height
 * @returns {Object} { x, y, width, height, aspect, reserved }
 */
function getUsableMonitorBounds(mon, fallbackW, fallbackH) {
    var m = mon || {};
    var reserved = m.reserved || [0, 0, 0, 0];
    var resLeft = (reserved && reserved.length > 0) ? (Number(reserved[0]) || 0) : 0;
    var resTop = (reserved && reserved.length > 1) ? (Number(reserved[1]) || 0) : 0;
    var resRight = (reserved && reserved.length > 2) ? (Number(reserved[2]) || 0) : 0;
    var resBottom = (reserved && reserved.length > 3) ? (Number(reserved[3]) || 0) : 0;

    var fullW = Number(m.width) || fallbackW || 1920;
    var fullH = Number(m.height) || fallbackH || 1200;
    var fullX = Number(m.x) || 0;
    var fullY = Number(m.y) || 0;

    var usableX = fullX + resLeft;
    var usableY = fullY + resTop;
    var usableW = Math.max(100, fullW - resLeft - resRight);
    var usableH = Math.max(100, fullH - resTop - resBottom);

    return {
        x: usableX,
        y: usableY,
        width: usableW,
        height: usableH,
        aspect: (usableH > 0) ? (usableW / usableH) : (16 / 10),
        reserved: { left: resLeft, top: resTop, right: resRight, bottom: resBottom }
    };
}

/**
 * Normalizes window coordinates and size relative to monitor bounds,
 * clamping within [0, 1] range to prevent layout overflow.
 * @param {Object} win - Client window object { at: [x, y], size: [w, h] }
 * @param {Object} bounds - Usable monitor bounds { x, y, width, height }
 * @returns {Object} { normX, normY, normW, normH }
 */
function normalizeWindowCoordinates(win, bounds) {
    var b = bounds || { x: 0, y: 0, width: 1920, height: 1200 };
    var at = win.at || [0, 0];
    var size = win.size || [100, 100];
    var normX = Math.max(0, Math.min(1, (at[0] - b.x) / b.width));
    var normY = Math.max(0, Math.min(1, (at[1] - b.y) / b.height));
    var normW = Math.max(0.05, Math.min(1 - normX, size[0] / b.width));
    var normH = Math.max(0.05, Math.min(1 - normY, size[1] / b.height));
    return {
        normX: normX,
        normY: normY,
        normW: normW,
        normH: normH
    };
}

/**
 * Parses raw JSON snapshot from Hyprland into structured workspaces and MRU windows.
 * Dynamically includes populated workspaces and any empty workspaces in between them,
 * allowing users to switch directly to empty workspaces.
 * @param {Object} data - Raw JSON with { clients, workspaces, monitors }
 * @param {Array<string>} wsLetters - Home row workspace letters array
 * @returns {Object} { workspaces: Array, mruList: Array, activeMonitor: Object, activeMonitorName: string, monitorAspect: number }
 */
function parseSnapshot(data, wsLetters) {
    if (!data) {
        return {
            workspaces: [],
            mruList: [],
            activeMonitor: null,
            activeMonitorName: "",
            monitorAspect: 16 / 10
        };
    }

    var clients = data.clients || [];
    var workspaces = data.workspaces || [];
    var monitors = data.monitors || [];
    var letters = (wsLetters && wsLetters.length > 0) ? wsLetters : DEFAULT_HOME_ROW_LETTERS;

    var activeMonitor = findActiveMonitor(monitors);
    var monitorMap = createMonitorMap(monitors);

    var activeBounds = getUsableMonitorBounds(activeMonitor, 1920, 1200);
    var monWidth = activeBounds.width;
    var monHeight = activeBounds.height;
    var monitorAspect = activeBounds.aspect;

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

    // Existing workspace objects indexed by ID
    var wsObjectMap = {};
    for (var w = 0; w < workspaces.length; w++) {
        wsObjectMap[workspaces[w].id] = workspaces[w];
    }

    // Identify active workspace ID from active (focused) monitor
    var activeWsId = (activeMonitor.activeWorkspace && activeMonitor.activeWorkspace.id > 0)
        ? activeMonitor.activeWorkspace.id
        : -1;

    // Collect all workspace IDs that have windows, are active, or exist in Hyprland
    var populatedIds = [];
    for (var cWsId in wsClientsMap) {
        var idNum = parseInt(cWsId);
        if (idNum > 0 && populatedIds.indexOf(idNum) === -1) {
            populatedIds.push(idNum);
        }
    }
    for (var w = 0; w < workspaces.length; w++) {
        var wid = workspaces[w].id;
        if (wid > 0 && populatedIds.indexOf(wid) === -1) {
            populatedIds.push(wid);
        }
    }
    if (activeWsId > 0 && populatedIds.indexOf(activeWsId) === -1) {
        populatedIds.push(activeWsId);
    }

    if (populatedIds.length === 0) {
        populatedIds.push(activeWsId > 0 ? activeWsId : 1);
    }

    var minId = 1;
    for (var p = 0; p < populatedIds.length; p++) {
        if (populatedIds[p] > 0 && populatedIds[p] < minId) {
            minId = populatedIds[p];
        }
    }
    var maxId = Math.max(1, Math.max.apply(null, populatedIds));

    // Build the complete list of workspaces from minId to maxId,
    // including any empty workspaces in between
    var visibleWorkspaces = [];
    for (var id = minId; id <= maxId; id++) {
        var existing = wsObjectMap[id];
        if (existing) {
            visibleWorkspaces.push(existing);
        } else {
            visibleWorkspaces.push({
                id: id,
                name: "" + id,
                monitor: activeMonitor.name || "",
                monitorID: (activeMonitor.id !== undefined) ? activeMonitor.id : 0,
                windows: 0
            });
        }
    }

    // Sort ascending by ID
    visibleWorkspaces.sort(function(a, b) { return a.id - b.id; });

    var processedWorkspaces = [];

    for (var wIdx = 0; wIdx < visibleWorkspaces.length; wIdx++) {
        var curWs = visibleWorkspaces[wIdx];
        var curWid = curWs.id;

        var wsMon = monitorMap[curWs.monitor] || monitorMap[curWs.monitorID] || activeMonitor;
        var monBounds = getUsableMonitorBounds(wsMon, monWidth, monHeight);

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
            var coords = normalizeWindowCoordinates(win, monBounds);

            processedWindows.push({
                address: win.address,
                title: win.title || win.initialTitle || win.class || "Window",
                clientClass: win.class || win.initialClass || "window",
                initialClass: win.initialClass || "",
                initialTitle: win.initialTitle || "",
                workspaceId: curWid,
                wsLetter: letter.toUpperCase(),
                wsIndex: num,
                focusHistoryID: win.focusHistoryID,
                floating: win.floating,
                normX: coords.normX,
                normY: coords.normY,
                normW: coords.normW,
                normH: coords.normH
            });
        }

        processedWorkspaces.push({
            id: curWid,
            name: curWs.name || ("" + curWid),
            letter: letter.toUpperCase(),
            letterLower: letter.toLowerCase(),
            isActive: (curWid === activeWsId),
            isEmpty: (processedWindows.length === 0),
            windows: processedWindows,
            monitorName: wsMon.name || "",
            monitorId: (wsMon.id !== undefined) ? wsMon.id : 0,
            aspect: monBounds.aspect
        });
    }

    // Flat MRU list sorted by focusHistoryID (most recently focused first)
    var flatMru = validClients.slice();
    flatMru.sort(function(a, b) { return a.focusHistoryID - b.focusHistoryID; });

    return {
        workspaces: processedWorkspaces,
        mruList: flatMru,
        activeMonitor: activeMonitor,
        activeMonitorName: activeMonitor.name || "",
        monitorAspect: monitorAspect
    };
}

/**
 * Finds client display details by window address across all workspaces.
 */
function findClientData(workspacesData, address, fallbackClient) {
    if (!workspacesData) return null;

    if (address) {
        for (var i = 0; i < workspacesData.length; i++) {
            var ws = workspacesData[i];
            for (var j = 0; j < ws.windows.length; j++) {
                if (ws.windows[j].address === address) {
                    return ws.windows[j];
                }
            }
        }
    }

    if (fallbackClient) {
        return {
            address: fallbackClient.address,
            title: fallbackClient.title || fallbackClient.class || "Window",
            clientClass: fallbackClient.class || "window",
            initialClass: fallbackClient.initialClass || "",
            initialTitle: fallbackClient.initialTitle || "",
            wsLetter: "A",
            wsIndex: 1,
            workspaceId: fallbackClient.workspace ? fallbackClient.workspace.id : 1
        };
    }
    return null;
}
