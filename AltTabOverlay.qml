import QtQuick
import QtQuick.Layouts
import Quickshell
import Quickshell.Wayland
import Quickshell.Io
import qs.Commons
import qs.Ui
import "components"
import "js/Config.js" as Config
import "js/WindowModel.js" as WindowModel
import "js/Navigation.js" as Navigation
import "js/Icons.js" as Icons

Item {
    id: root

    // Dev Mode flag
    readonly property bool devMode: Config.devMode || Quickshell.env("OMALT_TAB_DEV") === "1"

    function logDebug(msg) {
        if (root.devMode) {
            console.log("[omalt-tab:dev] " + msg);
        }
    }

    // Omarchy shell-injected properties
    property string omarchyPath: Quickshell.env("OMARCHY_PATH")
    property var shell: null
    property var manifest: null
    readonly property var appLibrary: root.shell ? root.shell.appLibrary : null

    // Omarchy Theme Integration
    property color background: Color.menu.background
    property color scrim: Color.menu.scrim
    readonly property var borderSpec: Border.surfaceSpec("menu", "border", Color.menu.border, Math.max(1, Style.space(2)))
    readonly property int cornerRadius: Style.cornerRadius

    // Sync icon cache with system desktop entries and app library
    Connections {
        target: DesktopEntries.applications
        function onValuesChanged() {
            Icons.clearIconCache();
        }
    }
    Connections {
        target: root.appLibrary
        function onAppsChanged() {
            Icons.clearIconCache();
        }
        function onIconIndexChanged() {
            Icons.clearIconCache();
        }
    }

    // Switcher state
    property bool opened: false
    property var workspacesData: []
    property var mruList: []
    property int selectedIndex: 0
    property string selectedAddress: ""
    property int selectedWorkspaceId: -1
    property var selectedClientData: null
    property real monitorAspect: 16 / 10

    // Pending navigation offset while snapshot is loading
    property int pendingOffset: 1
    property bool pendingCommit: false
    property bool isOpening: false

    readonly property string socketPath: (Quickshell.env("XDG_RUNTIME_DIR") || "/run/user/1000") + "/omalt-tab.sock"
    readonly property var wsLetters: ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"]

    Component.onCompleted: {
        snapshotFetcher.running = true;
    }

    // -------------------------------------------------------------------------
    // Shell Lifecycle Contract (omarchy-shell summon / hide / toggle / call)
    // -------------------------------------------------------------------------

    function open(payloadJson) {
        var offset = 1;
        if (payloadJson) {
            try {
                var parsed = JSON.parse(payloadJson);
                if (parsed && typeof parsed.offset === "number") offset = parsed.offset;
            } catch(e) {}
        }
        root.openWithOffset(offset);
    }

    function close() {
        root.cancel();
    }

    function dismiss() {
        root.opened = false;
        if (root.shell && typeof root.shell.hide === "function") {
            root.shell.hide((root.manifest && root.manifest.id) || "io.github.codesmith28.omalt-tab");
        }
    }

    function toggle(payloadJson) {
        if (root.opened) {
            root.commit();
        } else {
            root.open(payloadJson);
        }
    }

    // -------------------------------------------------------------------------
    // Action Handlers
    // -------------------------------------------------------------------------

    function next() {
        if (!root.opened) root.openWithOffset(1);
        else root.cycle(1);
    }

    function prev() {
        if (!root.opened) root.openWithOffset(-1);
        else root.cycle(-1);
    }

    function left()  { root.navigateDirection("left"); }
    function right() { root.navigateDirection("right"); }
    function up()    { root.navigateDirection("up"); }
    function down()  { root.navigateDirection("down"); }
    function screenshot() { root.takeScreenshot(); }

    function takeScreenshot() {
        root.logDebug("Taking screenshot");
        var binPath = (root.omarchyPath && root.omarchyPath.length > 0) ? (root.omarchyPath + "/bin/omarchy-capture-screenshot") : "omarchy-capture-screenshot";
        var cmd = binPath + " 2>/dev/null || omarchy-capture-screenshot 2>/dev/null || grimblast copysave area 2>/dev/null || hyprshot -m region 2>/dev/null || grim";
        Quickshell.execDetached(["sh", "-c", cmd]);
    }

    function handleCommand(cmd) {
        root.logDebug("Socket command received: " + cmd);
        var parts = cmd.trim().split(" ");
        var action = parts[0].toLowerCase();
        var arg = parts.length > 1 ? parts[1].toLowerCase() : "";

        if (action === "next") {
            root.next();
        } else if (action === "prev") {
            root.prev();
        } else if (action === "left" || action === "right" || action === "up" || action === "down") {
            root.navigateDirection(action);
        } else if (action === "commit") {
            root.commit();
        } else if (action === "cancel") {
            root.cancel();
        } else if (action === "toggle") {
            root.toggle("");
        } else if (action === "screenshot") {
            root.takeScreenshot();
        } else if (action === "workspace") {
            if (arg) root.jumpWorkspace(arg);
        } else if (action === "window") {
            if (arg) root.jumpWindow(parseInt(arg));
        }
    }

    // Fast UNIX Domain Socket Server for instant sub-millisecond IPC
    SocketServer {
        id: sockServer
        path: root.socketPath
        active: true
        handler: Component {
            Socket {
                parser: SplitParser {
                    splitMarker: "\n"
                    onRead: rawData => {
                        let line = rawData.trim();
                        if (line.length > 0) {
                            root.handleCommand(line);
                        }
                    }
                }
            }
        }
    }

    // Hyprland State Snapshot Process
    Process {
        id: snapshotFetcher
        command: ["sh", "-c", "echo -n '{\"clients\":'; hyprctl clients -j; echo -n ',\"workspaces\":'; hyprctl workspaces -j; echo -n ',\"monitors\":'; hyprctl monitors -j; echo -n '}'"]
        stdout: StdioCollector {
            waitForEnd: true
            onStreamFinished: {
                try {
                    var data = JSON.parse(text);
                    root.populateSnapshot(data);
                } catch(e) {
                    console.log("[omalt-tab] snapshot JSON parse error:", e);
                }
            }
        }
    }

    function refreshSnapshot() {
        if (!root.opened && !snapshotFetcher.running) {
            snapshotFetcher.running = true;
        }
    }

    // Keep snapshot cache fresh in background whenever active window or toplevel list changes
    Connections {
        target: ToplevelManager
        function onActiveToplevelChanged() { root.refreshSnapshot(); }
    }

    Connections {
        target: ToplevelManager.toplevels
        function onValuesChanged() { root.refreshSnapshot(); }
    }

    // Hyprland Atomic Focus Dispatcher
    Process {
        id: focusDispatcher
        function dispatch(expr) {
            command = ["hyprctl", "dispatch", expr];
            running = false;
            running = true;
        }
        function focus(address) {
            dispatch("(function() hl.dispatch(hl.dsp.focus({ window = \"address:" + address + "\" })); return hl.dsp.submap(\"reset\") end)()");
        }
        function switchWorkspace(id) {
            dispatch("(function() hl.dispatch(hl.dsp.focus({ workspace = \"" + id + "\" })); return hl.dsp.submap(\"reset\") end)()");
        }
        function resetSubmap() {
            dispatch("hl.dsp.submap(\"reset\")");
        }
    }

    function initialIndexForOffset(len, offset) {
        if (len <= 1) return 0;
        return (offset > 0) ? 1 : (len - 1);
    }

    function openWithOffset(offset) {
        root.logDebug("Opening switcher with offset: " + offset);
        root.pendingCommit = false;
        root.pendingOffset = offset;
        root.selectedWorkspaceId = -1;
        var hasMru = root.mruList && root.mruList.length > 0;
        root.isOpening = !hasMru;
        if (hasMru) {
            root.selectedIndex = initialIndexForOffset(root.mruList.length, offset);
            root.updateSelectionFromIndex();
            root.opened = true;
        }
        snapshotFetcher.running = false;
        snapshotFetcher.running = true;
    }

    function populateSnapshot(data) {
        var res = WindowModel.parseSnapshot(data, root.wsLetters);
        var flatMru = res.mruList;
        root.workspacesData = res.workspaces;
        root.mruList = flatMru;
        if (res.monitorAspect) {
            root.monitorAspect = res.monitorAspect;
        }

        if (flatMru.length === 0) {
            if (root.workspacesData && root.workspacesData.length > 0) {
                root.selectedIndex = -1;
                root.selectedAddress = "";
                root.selectWorkspace(root.workspacesData[0].id);
                root.opened = true;
                return;
            }
            root.selectedIndex = -1;
            root.selectedAddress = "";
            root.selectedClientData = null;
            root.selectedWorkspaceId = -1;
            root.opened = false;
            return;
        }

        if (root.pendingCommit) {
            root.pendingCommit = false;
            var targetAddr = flatMru[root.initialIndexForOffset(flatMru.length, root.pendingOffset)].address;
            root.opened = false;
            focusDispatcher.focus(targetAddr);
            return;
        }

        if (root.isOpening) {
            root.isOpening = false;
            root.selectedIndex = root.initialIndexForOffset(flatMru.length, root.pendingOffset);
            root.updateSelectionFromIndex();
            root.opened = true;
        } else if (root.opened) {
            // Already opened: preserve current selected address if still valid
            if (root.selectedAddress) {
                var foundIdx = -1;
                for (var i = 0; i < flatMru.length; i++) {
                    if (flatMru[i].address === root.selectedAddress) {
                        foundIdx = i;
                        break;
                    }
                }
                if (foundIdx !== -1) {
                    root.selectedIndex = foundIdx;
                } else if (root.selectedIndex >= flatMru.length) {
                    root.selectedIndex = flatMru.length - 1;
                }
            }
            root.updateSelectionFromIndex();
        }
    }

    function updateSelectionFromIndex() {
        if (!root.mruList || root.mruList.length === 0 || root.selectedIndex < 0) {
            root.selectedAddress = "";
            root.selectedClientData = null;
            return;
        }

        var client = root.mruList[root.selectedIndex];
        root.selectedAddress = client.address;
        root.selectedClientData = WindowModel.findClientData(root.workspacesData, client.address, client);
        if (root.selectedClientData && root.selectedClientData.workspaceId) {
            root.selectedWorkspaceId = root.selectedClientData.workspaceId;
        }
    }

    function cycle(delta) {
        if (!root.mruList || root.mruList.length === 0) return;
        root.selectedIndex = Navigation.cycleIndex(root.selectedIndex, delta, root.mruList.length);
        root.updateSelectionFromIndex();
    }

    function jumpWorkspace(letter) {
        var jump = Navigation.findWorkspaceJump(root.workspacesData, letter);
        if (!jump) return;
        if (jump.empty || !jump.address) {
            root.selectWorkspace(jump.wsId);
        } else {
            root.selectAddress(jump.address);
        }
    }

    function jumpWindow(number) {
        var currentWsId = root.selectedWorkspaceId;
        if (!currentWsId && root.selectedClientData) currentWsId = root.selectedClientData.workspaceId;
        if (!currentWsId) return;
        var addr = Navigation.findWindowJump(root.workspacesData, currentWsId, number);
        if (addr) root.selectAddress(addr);
    }

    function selectWorkspace(wsId) {
        root.selectedWorkspaceId = wsId;
        root.selectedAddress = "";
        root.selectedIndex = -1;

        var wsData = null;
        var wsIdx = -1;
        for (var i = 0; i < root.workspacesData.length; i++) {
            if (root.workspacesData[i].id === wsId) {
                wsData = root.workspacesData[i];
                wsIdx = i;
                break;
            }
        }

        var isEmpty = !wsData || (!wsData.windows || wsData.windows.length === 0);
        var wsName = wsData ? wsData.name : wsId;
        root.selectedClientData = {
            isWorkspace: true,
            isEmpty: isEmpty,
            workspaceId: wsId,
            wsLetter: wsData ? wsData.letter : "",
            title: "Workspace " + wsName + (isEmpty ? " (Empty)" : ""),
            clientClass: "workspace"
        };
        if (wsIdx >= 0) root.ensureWorkspaceVisible(wsIdx);
    }

    function selectAddress(address) {
        for (var i = 0; i < root.mruList.length; i++) {
            if (root.mruList[i].address === address) {
                root.selectedIndex = i;
                root.selectedAddress = address;
                root.updateSelectionFromIndex();
                for (var w = 0; w < root.workspacesData.length; w++) {
                    var ws = root.workspacesData[w];
                    for (var k = 0; k < ws.windows.length; k++) {
                        if (ws.windows[k].address === address) {
                            root.selectedWorkspaceId = ws.id;
                            root.ensureWorkspaceVisible(w);
                            return;
                        }
                    }
                }
                return;
            }
        }
    }

    function navigateDirection(dir) {
        if (!root.opened) root.openWithOffset(1);
        var target = Navigation.findSpatialTarget(root.workspacesData, root.selectedAddress, root.selectedWorkspaceId, dir);
        if (target) {
            if (target.isWorkspace || !target.address) {
                root.selectWorkspace(target.wsId);
            } else {
                root.selectAddress(target.address);
            }
        }
    }

    function ensureWorkspaceVisible(wsIdx) {
        if (wsIdx < 0 || !wsFlickable || wsFlickable.width <= 0) return;
        var cardW = container.dynamicCardWidth;
        var cardX = wsIdx * (cardW + 14);
        if (cardX < wsFlickable.contentX) {
            wsFlickable.contentX = Math.max(0, cardX - 14);
        } else if (cardX + cardW > wsFlickable.contentX + wsFlickable.width) {
            wsFlickable.contentX = Math.min(wsFlickable.contentWidth - wsFlickable.width, cardX + cardW - wsFlickable.width + 14);
        }
    }

    Timer {
        id: refreshTimer
        interval: 120
        repeat: false
        onTriggered: {
            if (!snapshotFetcher.running) {
                snapshotFetcher.running = true;
            }
        }
    }

    function commit() {
        root.logDebug("Commit requested (selectedAddress=" + root.selectedAddress + ", wsId=" + root.selectedWorkspaceId + ")");
        if (root.opened) {
            root.opened = false;
            root.isOpening = false;
            root.pendingCommit = false;
            if (root.selectedAddress && root.selectedAddress.length > 0) {
                var addr = root.selectedAddress;
                focusDispatcher.focus(addr);
                // Optimistically move focused window to top of MRU cache
                if (root.mruList && root.mruList.length > 0) {
                    var idx = -1;
                    for (var i = 0; i < root.mruList.length; i++) {
                        if (root.mruList[i].address === addr) {
                            idx = i;
                            break;
                        }
                    }
                    if (idx > 0) {
                        var item = root.mruList.splice(idx, 1)[0];
                        root.mruList.unshift(item);
                    }
                }
                refreshTimer.restart();
            } else if (root.selectedWorkspaceId > 0) {
                focusDispatcher.switchWorkspace(root.selectedWorkspaceId);
                refreshTimer.restart();
            } else {
                focusDispatcher.resetSubmap();
            }
        } else if (root.isOpening) {
            root.isOpening = false;
            root.pendingCommit = true;
        } else {
            root.pendingCommit = false;
            focusDispatcher.resetSubmap();
        }
    }

    function cancel() {
        root.logDebug("Cancel requested");
        root.isOpening = false;
        root.pendingCommit = false;
        root.opened = false;
        focusDispatcher.resetSubmap();
        refreshTimer.restart();
    }

    // -------------------------------------------------------------------------
    // Visual Layer-Shell Surface
    // -------------------------------------------------------------------------

    PanelWindow {
        id: win
        color: "transparent"
        visible: root.opened
        exclusionMode: ExclusionMode.Ignore

        WlrLayershell.layer: WlrLayer.Overlay
        WlrLayershell.keyboardFocus: WlrKeyboardFocus.None
        WlrLayershell.namespace: "omalt-tab"

        anchors {
            top: true
            bottom: true
            left: true
            right: true
        }

        // Dark dim scrim background
        Rectangle {
            id: scrim
            anchors.fill: parent
            color: root.scrim
            opacity: root.opened ? 1 : 0
            Behavior on opacity { NumberAnimation { duration: 120 } }

            MouseArea {
                anchors.fill: parent
                onClicked: root.cancel()
            }
        }

        // Active keyboard event listener (fallback when window has focus)
        Item {
            id: keyCatcher
            focus: root.opened
            anchors.fill: parent

            Keys.onPressed: event => {
                if (event.key === Qt.Key_Escape || event.nativeScanCode === 9) {
                    root.cancel();
                } else if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter || event.key === Qt.Key_Space || event.nativeScanCode === 36 || event.nativeScanCode === 104) {
                    root.commit();
                } else if (event.key === Qt.Key_Tab || event.key === Qt.Key_Backtab) {
                    root.cycle((event.key === Qt.Key_Backtab || (event.modifiers & Qt.ShiftModifier)) ? -1 : 1);
                } else if (event.key === Qt.Key_Left) {
                    root.navigateDirection("left");
                } else if (event.key === Qt.Key_Right) {
                    root.navigateDirection("right");
                } else if (event.key === Qt.Key_Up) {
                    root.navigateDirection("up");
                } else if (event.key === Qt.Key_Down) {
                    root.navigateDirection("down");
                } else if (event.key === Qt.Key_Home) {
                    if (root.mruList.length > 0) {
                        root.selectedIndex = 0;
                        root.updateSelectionFromIndex();
                    }
                } else if (event.key === Qt.Key_End) {
                    if (root.mruList.length > 0) {
                        root.selectedIndex = root.mruList.length - 1;
                        root.updateSelectionFromIndex();
                    }
                } else if (event.key >= Qt.Key_1 && event.key <= Qt.Key_9) {
                    root.jumpWindow(event.key - Qt.Key_0);
                } else if (event.key === Qt.Key_Print || event.key === Qt.Key_SysReq || ((event.key === Qt.Key_S || event.key === Qt.Key_Print) && (event.modifiers & Qt.MetaModifier))) {
                    root.takeScreenshot();
                } else if (event.text && event.text.length === 1) {
                    var ch = event.text.toLowerCase();
                    if ("asdfghjkl;".indexOf(ch) !== -1) {
                        root.jumpWorkspace(ch);
                    }
                }
                event.accepted = true;
            }

            Keys.onReleased: event => {
                if (!root.devMode && (event.key === Qt.Key_Alt || event.key === Qt.Key_AltGr)) {
                    root.commit();
                    event.accepted = true;
                }
            }
        }

        // Central Switcher Card Container
        BorderSurface {
            id: container
            anchors.centerIn: parent

            // Dynamic Sizing: adapts to number of workspace cards and screen bounds
            readonly property int count: Math.max(1, root.workspacesData.length)
            readonly property int maxAllowedWidth: Math.max(win.width - 80, 360)
            readonly property int maxAllowedHeight: Math.max(win.height - 80, 300)

            // Dynamic card width: scales so that workspaces fit smoothly without overflow
            readonly property int dynamicCardWidth: {
                var maxAvail = Math.max(340, win.width - 120);
                var fitWidth = Math.floor((maxAvail - (count - 1) * 14) / count);
                var maxW = (count === 1) ? 320 : ((count === 2) ? 300 : 285);
                var minW = 185;
                return Math.max(minW, Math.min(maxW, fitWidth));
            }

            // Viewport and Card height derived from monitor aspect ratio
            readonly property real monitorAspect: root.monitorAspect > 0.5 ? root.monitorAspect : (16 / 10)
            readonly property int dynamicVpWidth: dynamicCardWidth - 16
            readonly property int dynamicVpHeight: Math.round(dynamicVpWidth / monitorAspect)
            readonly property int dynamicCardHeight: dynamicVpHeight + 48

            // Row and content width
            readonly property int wsRowWidth: count * dynamicCardWidth + (count - 1) * 14
            readonly property int minWidth: Math.max(headerBar.implicitWidth, footerBar.implicitWidth, dynamicCardWidth)
            readonly property int naturalContentWidth: Math.max(wsRowWidth, minWidth)
            readonly property int contentWidth: Math.min(naturalContentWidth, maxAllowedWidth)

            width: contentWidth + 48
            height: Math.min(contentCol.implicitHeight + 40, maxAllowedHeight)
            radius: root.cornerRadius
            color: root.background
            borderSpec: root.borderSpec

            opacity: root.opened ? 1 : 0
            scale: root.opened ? 1 : 0.96
            Behavior on opacity { NumberAnimation { duration: 140; easing.type: Easing.OutCubic } }
            Behavior on scale { NumberAnimation { duration: 140; easing.type: Easing.OutCubic } }
            Behavior on width { NumberAnimation { duration: 150; easing.type: Easing.OutCubic } }
            Behavior on height { NumberAnimation { duration: 150; easing.type: Easing.OutCubic } }

            Column {
                id: contentCol
                anchors.centerIn: parent
                width: container.contentWidth
                spacing: Style.spacing.panelGap

                HeaderBar {
                    id: headerBar
                    width: parent.width
                    title: "OMALT-TAB"
                    devMode: root.devMode
                    onScreenshotRequested: root.takeScreenshot()
                }

                Flickable {
                    id: wsFlickable
                    width: parent.width
                    height: container.dynamicCardHeight + 8
                    contentWidth: container.wsRowWidth
                    contentHeight: height
                    boundsBehavior: Flickable.StopAtBounds
                    clip: true

                    Item {
                        width: Math.max(wsFlickable.width, container.wsRowWidth)
                        height: parent.height

                        Row {
                            id: wsRow
                            spacing: 14
                            anchors.horizontalCenter: parent.horizontalCenter
                            anchors.verticalCenter: parent.verticalCenter

                            Repeater {
                                model: root.workspacesData
                                WorkspaceCard {
                                    wsData: modelData
                                    selectedAddress: root.selectedAddress
                                    selectedWorkspaceId: root.selectedWorkspaceId
                                    cardWidth: container.dynamicCardWidth
                                    cardHeight: container.dynamicCardHeight
                                    appLibrary: root.appLibrary
                                    devMode: root.devMode
                                    onWindowClicked: addr => {
                                        root.selectAddress(addr);
                                        root.commit();
                                    }
                                    onWorkspaceClicked: id => {
                                        focusDispatcher.switchWorkspace(id);
                                        root.cancel();
                                    }
                                }
                            }
                        }
                    }
                }

                FooterBar {
                    id: footerBar
                    width: parent.width
                    selectedClientData: root.selectedClientData
                    appLibrary: root.appLibrary
                    devMode: root.devMode
                }
            }
        }
    }
}
