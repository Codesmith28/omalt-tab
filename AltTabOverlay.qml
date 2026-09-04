import QtQuick
import QtQuick.Layouts
import Quickshell
import Quickshell.Wayland
import Quickshell.Io
import "components"
import "js/WindowModel.js" as WindowModel
import "js/Navigation.js" as Navigation

Item {
    id: root

    // Omarchy shell-injected properties
    property string omarchyPath: Quickshell.env("OMARCHY_PATH")
    property var shell: null
    property var manifest: null

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

    function left() {
        if (!root.opened) root.openWithOffset(1);
        root.navigateDirection("left");
    }

    function right() {
        if (!root.opened) root.openWithOffset(1);
        root.navigateDirection("right");
    }

    function up() {
        if (!root.opened) root.openWithOffset(1);
        root.navigateDirection("up");
    }

    function down() {
        if (!root.opened) root.openWithOffset(1);
        root.navigateDirection("down");
    }

    function handleCommand(cmd) {
        var parts = cmd.trim().split(" ");
        var action = parts[0].toLowerCase();
        var arg = parts.length > 1 ? parts[1].toLowerCase() : "";

        if (action === "next") {
            root.next();
        } else if (action === "prev") {
            root.prev();
        } else if (action === "left" || action === "right" || action === "up" || action === "down") {
            if (!root.opened) root.openWithOffset(1);
            root.navigateDirection(action);
        } else if (action === "commit") {
            root.commit();
        } else if (action === "cancel") {
            root.cancel();
        } else if (action === "toggle") {
            root.toggle("");
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

    // Hyprland Atomic Focus Dispatcher
    Process {
        id: focusDispatcher
        function focus(address) {
            command = ["hyprctl", "dispatch", "(function() hl.dispatch(hl.dsp.focus({ window = \"address:" + address + "\" })); return hl.dsp.submap(\"reset\") end)()"];
            running = false;
            running = true;
        }
        function switchWorkspace(id) {
            command = ["hyprctl", "dispatch", "(function() hl.dispatch(hl.dsp.focus({ workspace = \"" + id + "\" })); return hl.dsp.submap(\"reset\") end)()"];
            running = false;
            running = true;
        }
        function resetSubmap() {
            command = ["hyprctl", "dispatch", "hl.dsp.submap(\"reset\")"];
            running = false;
            running = true;
        }
    }

    function openWithOffset(offset) {
        root.pendingCommit = false;
        root.pendingOffset = offset;
        root.isOpening = true;
        root.selectedWorkspaceId = -1;
        if (root.mruList && root.mruList.length > 0) {
            // Cache is warm: display immediately
            root.isOpening = false;
            if (root.mruList.length === 1) {
                root.selectedIndex = 0;
            } else {
                root.selectedIndex = (offset > 0) ? 1 : (root.mruList.length - 1);
            }
            root.updateSelectionFromIndex();
            root.opened = true;
            snapshotFetcher.running = false;
            snapshotFetcher.running = true;
        } else {
            // Cold start: fetch snapshot first
            snapshotFetcher.running = false;
            snapshotFetcher.running = true;
        }
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
            var targetIdx = (flatMru.length === 1) ? 0 : ((root.pendingOffset > 0) ? 1 : (flatMru.length - 1));
            var targetAddr = flatMru[targetIdx].address;
            root.opened = false;
            focusDispatcher.focus(targetAddr);
            return;
        }

        if (root.isOpening) {
            root.isOpening = false;
            if (flatMru.length === 1) {
                root.selectedIndex = 0;
            } else {
                root.selectedIndex = (root.pendingOffset > 0) ? 1 : (flatMru.length - 1);
            }
            root.updateSelectionFromIndex();
            root.opened = true;
        } else if (root.opened) {
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

        if (wsData) {
            root.selectedClientData = {
                isWorkspace: true,
                isEmpty: (!wsData.windows || wsData.windows.length === 0),
                workspaceId: wsData.id,
                wsLetter: wsData.letter,
                title: "Workspace " + wsData.name + (wsData.windows && wsData.windows.length > 0 ? "" : " (Empty)"),
                clientClass: "workspace"
            };
            root.ensureWorkspaceVisible(wsIdx);
        } else {
            root.selectedClientData = {
                isWorkspace: true,
                isEmpty: true,
                workspaceId: wsId,
                wsLetter: "",
                title: "Workspace " + wsId + " (Empty)",
                clientClass: "workspace"
            };
        }
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
            snapshotFetcher.running = false;
            snapshotFetcher.running = true;
        }
    }

    function commit() {
        root.isOpening = false;
        if (root.opened) {
            root.opened = false;
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
            }
        } else if (snapshotFetcher.running) {
            root.pendingCommit = true;
        }
    }

    function cancel() {
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
            color: "#60000000"
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
                if (event.key === Qt.Key_Escape) {
                    root.cancel();
                    event.accepted = true;
                } else if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter || event.key === Qt.Key_Space) {
                    root.commit();
                    event.accepted = true;
                } else if (event.key === Qt.Key_Tab) {
                    if (event.modifiers & Qt.ShiftModifier) root.cycle(-1);
                    else root.cycle(1);
                    event.accepted = true;
                } else if (event.key === Qt.Key_Backtab) {
                    root.cycle(-1);
                    event.accepted = true;
                } else if (event.key === Qt.Key_Left) {
                    root.navigateDirection("left");
                    event.accepted = true;
                } else if (event.key === Qt.Key_Right) {
                    root.navigateDirection("right");
                    event.accepted = true;
                } else if (event.key === Qt.Key_Up) {
                    root.navigateDirection("up");
                    event.accepted = true;
                } else if (event.key === Qt.Key_Down) {
                    root.navigateDirection("down");
                    event.accepted = true;
                } else if (event.key === Qt.Key_Home) {
                    if (root.mruList.length > 0) {
                        root.selectedIndex = 0;
                        root.updateSelectionFromIndex();
                    }
                    event.accepted = true;
                } else if (event.key === Qt.Key_End) {
                    if (root.mruList.length > 0) {
                        root.selectedIndex = root.mruList.length - 1;
                        root.updateSelectionFromIndex();
                    }
                    event.accepted = true;
                } else {
                    var wsMap = {
                        [Qt.Key_A]: "a",
                        [Qt.Key_S]: "s",
                        [Qt.Key_D]: "d",
                        [Qt.Key_F]: "f",
                        [Qt.Key_G]: "g",
                        [Qt.Key_H]: "h",
                        [Qt.Key_J]: "j",
                        [Qt.Key_K]: "k",
                        [Qt.Key_L]: "l",
                        [Qt.Key_Semicolon]: ";"
                    };
                    if (wsMap[event.key]) {
                        root.jumpWorkspace(wsMap[event.key]);
                        event.accepted = true;
                    } else if (event.key >= Qt.Key_1 && event.key <= Qt.Key_9) {
                        root.jumpWindow(event.key - Qt.Key_0);
                        event.accepted = true;
                    } else if (event.text && event.text.length === 1) {
                        var keyText = event.text.toLowerCase();
                        if ("asdfghjkl;".indexOf(keyText) !== -1) {
                            root.jumpWorkspace(keyText);
                            event.accepted = true;
                        } else if (keyText >= '1' && keyText <= '9') {
                            root.jumpWindow(parseInt(keyText));
                            event.accepted = true;
                        }
                    }
                }
            }

            Keys.onReleased: event => {
                if (event.key === Qt.Key_Alt || event.key === Qt.Key_AltGr) {
                    root.commit();
                    event.accepted = true;
                }
            }
        }

        // Central Switcher Card Container
        Rectangle {
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
            radius: 16
            color: "#181825"
            border.width: 1.5
            border.color: "#313244"

            opacity: root.opened ? 1 : 0
            scale: root.opened ? 1 : 0.96
            Behavior on opacity { NumberAnimation { duration: 140; easing.type: Easing.OutCubic } }
            Behavior on scale { NumberAnimation { duration: 140; easing.type: Easing.OutCubic } }
            Behavior on width { NumberAnimation { duration: 150; easing.type: Easing.OutCubic } }
            Behavior on height { NumberAnimation { duration: 150; easing.type: Easing.OutCubic } }

            // Outer Shadow / Glow
            Rectangle {
                anchors.fill: parent
                anchors.margins: -4
                radius: parent.radius + 3
                color: "transparent"
                border.width: 2
                border.color: "#11111b"
                opacity: 0.7
                z: -1
            }

            Column {
                id: contentCol
                anchors.centerIn: parent
                width: container.contentWidth
                spacing: 16

                HeaderBar {
                    id: headerBar
                    width: parent.width
                    title: "OMALT-TAB"
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
                }
            }
        }
    }
}
