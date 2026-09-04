import QtQuick

Rectangle {
    id: root

    property var wsData: null
    property string selectedAddress: ""
    property int selectedWorkspaceId: -1
    property int cardWidth: 280
    property int cardHeight: 220

    signal windowClicked(string address)
    signal workspaceClicked(int wsId)

    readonly property string letter: (wsData && wsData.letter) ? wsData.letter : "A"
    readonly property string name: (wsData && wsData.name) ? wsData.name : "1"
    readonly property var windows: (wsData && wsData.windows) ? wsData.windows : []
    readonly property bool isActive: (wsData && wsData.isActive) ? true : false
    readonly property int wsId: (wsData && wsData.id) ? wsData.id : 1

    // Check if this workspace or any of its windows is selected
    readonly property bool isSelectedWorkspace: root.wsId === root.selectedWorkspaceId
    readonly property bool containsSelected: {
        if (isSelectedWorkspace && (!windows || windows.length === 0)) return true;
        if (!windows || windows.length === 0) return false;
        for (var i = 0; i < windows.length; i++) {
            if (windows[i].address === selectedAddress) return true;
        }
        return false;
    }

    implicitWidth: cardWidth
    implicitHeight: cardHeight
    width: cardWidth
    height: cardHeight
    radius: 12

    color: containsSelected ? "#1e2030" : "#16161e"
    border.width: containsSelected ? 2 : 1
    border.color: containsSelected ? "#7aa2f7" : (isActive ? "#414868" : "#24283b")

    Behavior on color { ColorAnimation { duration: 120 } }
    Behavior on border.color { ColorAnimation { duration: 120 } }
    Behavior on width { NumberAnimation { duration: 140; easing.type: Easing.OutCubic } }
    Behavior on height { NumberAnimation { duration: 140; easing.type: Easing.OutCubic } }

    Column {
        anchors.fill: parent
        anchors.margins: 8
        spacing: 6

        // Workspace Header
        Item {
            width: parent.width
            height: 26

            Row {
                anchors.left: parent.left
                anchors.verticalCenter: parent.verticalCenter
                spacing: 8

                // Home-row Letter Badge (A, S, D, F, G, H, J, K, L, ;)
                Rectangle {
                    width: 24
                    height: 24
                    radius: 6
                    color: root.containsSelected ? "#7aa2f7" : "#24283b"
                    border.width: 1
                    border.color: root.containsSelected ? "#7aa2f7" : "#414868"

                    Text {
                        anchors.centerIn: parent
                        text: root.letter
                        color: root.containsSelected ? "#11111b" : "#cdd6f4"
                        font.bold: true
                        font.pixelSize: 13
                        font.family: "monospace"
                    }
                }

                // Workspace Name / Label
                Text {
                    anchors.verticalCenter: parent.verticalCenter
                    text: root.cardWidth < 220 ? ("WS " + root.name) : ("Workspace " + root.name)
                    color: root.containsSelected ? "#cdd6f4" : (root.isActive ? "#a6adc8" : "#7f849c")
                    font.pixelSize: 12
                    font.weight: root.containsSelected ? Font.Bold : Font.Medium
                }
            }

            // Window Count Badge
            Rectangle {
                anchors.right: parent.right
                anchors.verticalCenter: parent.verticalCenter
                width: countText.implicitWidth + 10
                height: 18
                radius: 9
                color: "#181825"
                border.width: 1
                border.color: "#313244"
                visible: root.cardWidth >= 200

                Text {
                    id: countText
                    anchors.centerIn: parent
                    text: root.windows.length === 0 ? "empty" : (root.windows.length + " win")
                    color: root.windows.length === 0 ? "#6c7086" : "#a6adc8"
                    font.pixelSize: 10
                }
            }

            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: root.workspaceClicked(root.wsId)
            }
        }

        // Workspace Viewport (Miniature Desktop View)
        Rectangle {
            id: viewport
            width: parent.width
            height: parent.height - 32
            radius: 8
            color: "#11111b"
            border.width: 1
            border.color: root.containsSelected ? "#3b4261" : "#1f2335"
            clip: true

            Behavior on width { NumberAnimation { duration: 140; easing.type: Easing.OutCubic } }
            Behavior on height { NumberAnimation { duration: 140; easing.type: Easing.OutCubic } }

            // Empty State
            Item {
                anchors.fill: parent
                visible: root.windows.length === 0

                Column {
                    anchors.centerIn: parent
                    spacing: 6
                    opacity: root.containsSelected ? 0.95 : 0.6

                    Text {
                        anchors.horizontalCenter: parent.horizontalCenter
                        text: root.containsSelected ? "Empty Workspace" : "Empty"
                        color: root.containsSelected ? "#89b4fa" : "#6c7086"
                        font.pixelSize: Math.max(11, Math.min(13, Math.round(root.cardWidth / 22)))
                        font.bold: root.containsSelected
                        font.italic: !root.containsSelected
                    }
                    Text {
                        anchors.horizontalCenter: parent.horizontalCenter
                        text: root.containsSelected ? "Release Alt to switch" : ("Press [" + root.letter + "] to switch")
                        color: root.containsSelected ? "#cdd6f4" : "#585b70"
                        font.pixelSize: Math.max(9, Math.min(11, Math.round(root.cardWidth / 26)))
                        font.family: "monospace"
                    }
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    hoverEnabled: true
                    onClicked: root.workspaceClicked(root.wsId)
                }
            }

            // Windows on this workspace
            Repeater {
                model: root.windows
                WindowTile {
                    winData: modelData
                    selectedAddress: root.selectedAddress
                    onClicked: addr => root.windowClicked(addr)
                }
            }
        }
    }
}
