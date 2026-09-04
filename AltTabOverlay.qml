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
    property var selectedClientData: null

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

        if (flatMru.length === 0) {
            root.selectedIndex = -1;
            root.selectedAddress = "";
            root.selectedClientData = null;
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
    }

    function cycle(delta) {
        if (!root.mruList || root.mruList.length === 0) return;
        root.selectedIndex = Navigation.cycleIndex(root.selectedIndex, delta, root.mruList.length);
        root.updateSelectionFromIndex();
    }

    function jumpWorkspace(letter) {
        var jump = Navigation.findWorkspaceJump(root.workspacesData, letter);
        if (!jump) return;
        if (jump.empty) {
            focusDispatcher.switchWorkspace(jump.wsId);
            root.cancel();
        } else if (jump.address) {
            root.selectAddress(jump.address);
        }
    }

    function jumpWindow(number) {
        if (!root.selectedClientData) return;
        var addr = Navigation.findWindowJump(root.workspacesData, root.selectedClientData.workspaceId, number);
        if (addr) root.selectAddress(addr);
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
        var target = Navigation.findSpatialTarget(root.workspacesData, root.selectedAddress, dir);
        if (target) {
            root.selectAddress(target);
        }
    }

    function ensureWorkspaceVisible(wsIdx) {
        if (wsIdx < 0 || !wsFlickable || wsFlickable.width <= 0) return;
        var cardX = wsIdx * (296 + 14);
        var cardWidth = 296;
        if (cardX < wsFlickable.contentX) {
            wsFlickable.contentX = Math.max(0, cardX - 14);
        } else if (cardX + cardWidth > wsFlickable.contentX + wsFlickable.width) {
            wsFlickable.contentX = Math.min(wsFlickable.contentWidth - wsFlickable.width, cardX + cardWidth - wsFlickable.width + 14);
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
                } else if (event.key === Qt.Key_Left || event.key === Qt.Key_Up) {
                    root.cycle(-1);
                    event.accepted = true;
                } else if (event.key === Qt.Key_Right || event.key === Qt.Key_Down) {
                    root.cycle(1);
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
            readonly property int minWidth: Math.max(headerBar.implicitWidth, footerBar.implicitWidth, 560)
            readonly property int maxAllowedWidth: Math.max(win.width - 80, 400)
            readonly property int naturalContentWidth: Math.max(wsRow.implicitWidth, minWidth)
            readonly property int contentWidth: Math.min(naturalContentWidth, maxAllowedWidth)

            width: contentWidth + 48
            height: contentCol.implicitHeight + 40
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

                implicitWidth: container.contentWidth
                implicitHeight: headerBar.implicitHeight + spacing + wsFlickable.implicitHeight + spacing + footerBar.implicitHeight

                HeaderBar {
                    id: headerBar
                    width: parent.width
                    title: "OMALT-TAB"
                }

                Flickable {
                    id: wsFlickable
                    width: parent.width
                    height: 236
                    implicitWidth: parent.width
                    implicitHeight: 236
                    contentWidth: wsRow.implicitWidth
                    contentHeight: 236
                    boundsBehavior: Flickable.StopAtBounds
                    clip: true

                    Item {
                        width: Math.max(wsFlickable.width, wsRow.implicitWidth)
                        height: 236

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
