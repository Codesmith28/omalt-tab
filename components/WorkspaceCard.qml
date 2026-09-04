import QtQuick

Rectangle {
    id: root

    property var wsData: null
    property string selectedAddress: ""
    signal windowClicked(string address)
    signal workspaceClicked(int wsId)

    readonly property string letter: (wsData && wsData.letter) ? wsData.letter : "A"
    readonly property string name: (wsData && wsData.name) ? wsData.name : "1"
    readonly property var windows: (wsData && wsData.windows) ? wsData.windows : []
    readonly property bool isActive: (wsData && wsData.isActive) ? true : false
    readonly property int wsId: (wsData && wsData.id) ? wsData.id : 1

    // Check if this workspace contains the selected window
    readonly property bool containsSelected: {
        if (!windows || windows.length === 0) return false;
        for (var i = 0; i < windows.length; i++) {
            if (windows[i].address === selectedAddress) return true;
        }
        return false;
    }

    implicitWidth: 296
    implicitHeight: 228
    width: implicitWidth
    height: implicitHeight
    radius: 12

    color: containsSelected ? "#1e2030" : "#16161e"
    border.width: containsSelected ? 2 : 1
    border.color: containsSelected ? "#7aa2f7" : (isActive ? "#414868" : "#24283b")

    Behavior on color { ColorAnimation { duration: 120 } }
    Behavior on border.color { ColorAnimation { duration: 120 } }

    Column {
        anchors.fill: parent
        anchors.margins: 8
        spacing: 6

        // Workspace Header
        Item {
            width: parent.width
            height: 28

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
                    text: "Workspace " + root.name
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

                Text {
                    id: countText
                    anchors.centerIn: parent
                    text: root.windows.length + " win"
                    color: "#a6adc8"
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
            width: 280
            height: 175
            radius: 8
            color: "#11111b"
            border.width: 1
            border.color: root.containsSelected ? "#3b4261" : "#1f2335"
            clip: true

            // Empty State
            Item {
                anchors.fill: parent
                visible: root.windows.length === 0

                Column {
                    anchors.centerIn: parent
                    spacing: 6
                    opacity: 0.5

                    Text {
                        anchors.horizontalCenter: parent.horizontalCenter
                        text: "Empty"
                        color: "#6c7086"
                        font.pixelSize: 12
                        font.italic: true
                    }
                    Text {
                        anchors.horizontalCenter: parent.horizontalCenter
                        text: "Press [" + root.letter + "] to switch"
                        color: "#585b70"
                        font.pixelSize: 10
                        font.family: "monospace"
                    }
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
