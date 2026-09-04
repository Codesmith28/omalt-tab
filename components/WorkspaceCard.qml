import QtQuick
import qs.Commons
import qs.Ui

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
    radius: Math.max(4, Math.round(Style.cornerRadius * 0.65))

    color: containsSelected ? Util.alpha(Color.accent, 0.12) : Util.alpha(Color.foreground, 0.03)
    border.width: containsSelected ? 2 : 1
    border.color: containsSelected ? Color.accent : (isActive ? Util.alpha(Color.accent, 0.5) : Util.alpha(Color.foreground, 0.15))

    Behavior on color { ColorAnimation { duration: 120 } }
    Behavior on border.color { ColorAnimation { duration: 120 } }
    Behavior on width { NumberAnimation { duration: 140; easing.type: Easing.OutCubic } }
    Behavior on height { NumberAnimation { duration: 140; easing.type: Easing.OutCubic } }

    Column {
        anchors.fill: parent
        anchors.margins: Style.spacing.sm
        spacing: Style.spacing.xs

        // Workspace Header
        Item {
            width: parent.width
            height: Math.max(26, Style.space(26))

            Row {
                anchors.left: parent.left
                anchors.verticalCenter: parent.verticalCenter
                spacing: Style.spacing.sm

                // Home-row Letter Badge (A, S, D, F, G, H, J, K, L, ;)
                Rectangle {
                    width: Math.max(22, Style.space(24))
                    height: width
                    radius: Math.max(3, Math.round(Style.cornerRadius * 0.35))
                    color: root.containsSelected ? Color.accent : Util.alpha(Color.foreground, 0.08)
                    border.width: 1
                    border.color: root.containsSelected ? Color.accent : Util.alpha(Color.foreground, 0.2)

                    Text {
                        anchors.centerIn: parent
                        text: root.letter
                        color: root.containsSelected ? Color.background : Color.foreground
                        font.bold: true
                        font.pixelSize: Style.font.caption
                        font.family: Style.font.family
                    }
                }

                // Workspace Name / Label
                Text {
                    anchors.verticalCenter: parent.verticalCenter
                    text: root.cardWidth < 220 ? ("WS " + root.name) : ("Workspace " + root.name)
                    color: root.containsSelected ? Color.foreground : (root.isActive ? Color.foreground : Color.muted)
                    font.family: Style.font.menuFamily
                    font.pixelSize: Style.font.caption
                    font.weight: root.containsSelected ? Font.Bold : Font.Medium
                }
            }

            // Window Count Badge
            Rectangle {
                anchors.right: parent.right
                anchors.verticalCenter: parent.verticalCenter
                width: countText.implicitWidth + 10
                height: Math.max(18, Style.space(18))
                radius: Math.max(3, Math.round(Style.cornerRadius * 0.35))
                color: Util.alpha(Color.foreground, 0.05)
                border.width: 1
                border.color: Util.alpha(Color.foreground, 0.15)
                visible: root.cardWidth >= 200

                Text {
                    id: countText
                    anchors.centerIn: parent
                    text: root.windows.length === 0 ? "empty" : (root.windows.length + " win")
                    color: root.windows.length === 0 ? Color.muted : Color.foreground
                    font.family: Style.font.menuFamily
                    font.pixelSize: Style.font.caption
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
            radius: Math.max(3, Math.round(Style.cornerRadius * 0.45))
            color: Util.alpha(Color.background, 0.85)
            border.width: 1
            border.color: root.containsSelected ? Util.alpha(Color.accent, 0.35) : Util.alpha(Color.foreground, 0.1)
            clip: true

            Behavior on width { NumberAnimation { duration: 140; easing.type: Easing.OutCubic } }
            Behavior on height { NumberAnimation { duration: 140; easing.type: Easing.OutCubic } }

            // Empty State
            Item {
                anchors.fill: parent
                visible: root.windows.length === 0

                Column {
                    anchors.centerIn: parent
                    spacing: Style.spacing.xs
                    opacity: root.containsSelected ? 0.95 : 0.6

                    Text {
                        anchors.horizontalCenter: parent.horizontalCenter
                        text: root.containsSelected ? "Empty Workspace" : "Empty"
                        color: root.containsSelected ? Color.accent : Color.muted
                        font.family: Style.font.menuFamily
                        font.pixelSize: Math.max(11, Math.min(13, Math.round(root.cardWidth / 22)))
                        font.bold: root.containsSelected
                        font.italic: !root.containsSelected
                    }
                    Text {
                        anchors.horizontalCenter: parent.horizontalCenter
                        text: root.containsSelected ? "Release Alt to switch" : ("Press [" + root.letter + "] to switch")
                        color: root.containsSelected ? Color.foreground : Color.muted
                        font.family: Style.font.family
                        font.pixelSize: Math.max(9, Math.min(11, Math.round(root.cardWidth / 26)))
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
