import QtQuick
import qs.Commons
import qs.Ui
import "../js/Dimensions.js" as Dimensions

Rectangle {
    id: root

    property var wsData: null
    property string selectedAddress: ""
    property int selectedWorkspaceId: -1
    property int cardWidth: 280
    property int cardHeight: 220
    property var appLibrary: null
    property bool devMode: false

    signal windowClicked(string address)
    signal workspaceClicked(int wsId)

    readonly property string letter: (wsData && wsData.letter) ? wsData.letter : "A"
    readonly property string name: (wsData && wsData.name) ? wsData.name : "1"
    readonly property var windows: (wsData && wsData.windows) ? wsData.windows : []
    readonly property bool hasWindows: windows && windows.length > 0
    readonly property bool isActive: (wsData && wsData.isActive) ? true : false
    readonly property int wsId: (wsData && wsData.id) ? wsData.id : 1

    // Check if this workspace or any of its windows is selected
    readonly property bool isSelectedWorkspace: root.wsId === root.selectedWorkspaceId
    readonly property bool containsSelected: {
        if (!hasWindows) return isSelectedWorkspace;
        for (var i = 0; i < windows.length; i++) {
            if (windows[i].address === selectedAddress) return true;
        }
        return false;
    }

    implicitWidth: cardWidth
    implicitHeight: cardHeight
    width: cardWidth
    height: cardHeight
    radius: Dimensions.card.radius

    color: containsSelected ? Util.alpha(Color.accent, 0.12) : Util.alpha(Color.foreground, 0.03)
    border.width: containsSelected ? 2 : 1
    border.color: containsSelected ? Color.accent : (isActive ? Util.alpha(Color.accent, 0.5) : Util.alpha(Color.foreground, 0.15))

    Behavior on color { ColorAnimation { duration: 120 } }
    Behavior on border.color { ColorAnimation { duration: 120 } }
    Behavior on width { NumberAnimation { duration: 140; easing.type: Easing.OutCubic } }
    Behavior on height { NumberAnimation { duration: 140; easing.type: Easing.OutCubic } }

    Column {
        anchors.fill: parent
        anchors.margins: Dimensions.card.margins
        spacing: Dimensions.card.spacing

        // Workspace Header
        Item {
            id: wsHeader
            width: parent.width
            height: Dimensions.card.headerHeight

            Row {
                anchors.left: parent.left
                anchors.verticalCenter: parent.verticalCenter
                spacing: Dimensions.card.headerSpacing

                // Home-row Letter Badge (A, S, D, F, G, H, J, K, L, ;)
                Rectangle {
                    width: Dimensions.card.letterBadgeSize
                    height: width
                    radius: Dimensions.card.letterBadgeRadius
                    color: root.containsSelected ? Color.accent : Util.alpha(Color.foreground, 0.08)
                    border.width: 1
                    border.color: root.containsSelected ? Color.accent : Util.alpha(Color.foreground, 0.2)

                    Text {
                        anchors.centerIn: parent
                        textFormat: Text.PlainText
                        text: root.letter
                        color: root.containsSelected ? Color.background : Color.foreground
                        font.bold: true
                        font.pixelSize: Dimensions.card.letterBadgeFontSize
                        font.family: Style.font.resolvedFamily || Style.font.family
                    }
                }

                // Workspace Name / Label
                Text {
                    anchors.verticalCenter: parent.verticalCenter
                    textFormat: Text.PlainText
                    text: root.cardWidth < Dimensions.card.nameThresholdCompact ? ("WS " + root.name) : ("Workspace " + root.name)
                    color: root.containsSelected ? Color.foreground : (root.isActive ? Color.foreground : Color.muted)
                    font.family: Style.font.resolvedFamily || Style.font.family
                    font.pixelSize: Dimensions.card.nameFontSize
                    font.weight: root.containsSelected ? Font.Bold : Font.Medium
                }
            }

            // Window Count Badge
            Rectangle {
                anchors.right: parent.right
                anchors.verticalCenter: parent.verticalCenter
                width: txtCount.implicitWidth + Dimensions.card.countBadgePadding
                height: Dimensions.card.countBadgeHeight
                radius: Dimensions.card.countBadgeRadius
                color: Util.alpha(Color.foreground, 0.05)
                border.width: 1
                border.color: Util.alpha(Color.foreground, 0.15)
                visible: root.cardWidth >= Dimensions.card.countBadgeThreshold

                Text {
                    id: txtCount
                    anchors.centerIn: parent
                    textFormat: Text.PlainText
                    text: root.hasWindows ? (root.windows.length + " win") : "empty"
                    color: root.hasWindows ? Color.foreground : Color.muted
                    font.family: Style.font.resolvedFamily || Style.font.family
                    font.pixelSize: Dimensions.card.countBadgeFontSize
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
            height: parent.height - wsHeader.height - parent.spacing
            radius: Dimensions.card.viewportRadius
            color: Util.alpha(Color.background, 0.85)
            border.width: 1
            border.color: root.containsSelected ? Util.alpha(Color.accent, 0.35) : Util.alpha(Color.foreground, 0.1)
            clip: true

            Behavior on width { NumberAnimation { duration: 140; easing.type: Easing.OutCubic } }
            Behavior on height { NumberAnimation { duration: 140; easing.type: Easing.OutCubic } }

            // Empty State
            Item {
                anchors.fill: parent
                visible: !root.hasWindows

                Column {
                    anchors.centerIn: parent
                    spacing: Dimensions.card.emptySpacing
                    opacity: root.containsSelected ? 0.95 : 0.6

                    Text {
                        anchors.horizontalCenter: parent.horizontalCenter
                        text: "󰍹"
                        color: root.containsSelected ? Color.accent : Color.muted
                        font.family: Style.font.resolvedFamily || Style.font.family
                        font.pixelSize: Dimensions.card.emptyIconSize
                    }
                    Text {
                        anchors.horizontalCenter: parent.horizontalCenter
                        textFormat: Text.PlainText
                        text: root.containsSelected ? "Empty Workspace" : "Empty"
                        color: root.containsSelected ? Color.accent : Color.muted
                        font.family: Style.font.resolvedFamily || Style.font.family
                        font.pixelSize: Dimensions.card.emptyTitleSize
                        font.bold: root.containsSelected
                    }
                    Text {
                        anchors.horizontalCenter: parent.horizontalCenter
                        textFormat: Text.PlainText
                        text: root.containsSelected
                            ? (root.devMode ? "Press Enter to switch" : "Release Alt to switch")
                            : ("Press [" + root.letter + "] to switch")
                        color: root.containsSelected ? Color.foreground : Color.muted
                        font.family: Style.font.resolvedFamily || Style.font.family
                        font.pixelSize: Dimensions.card.emptyHintSize
                    }
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    hoverEnabled: true
                    onClicked: root.workspaceClicked(root.wsId)
                }
            }

            // Windows on this workspace (inset by margins so tile borders never collide with viewport borders)
            Item {
                id: windowCanvas
                anchors.fill: parent
                anchors.margins: Dimensions.card.canvasMargin

                Repeater {
                    model: root.windows
                    WindowTile {
                        winData: modelData
                        selectedAddress: root.selectedAddress
                        appLibrary: root.appLibrary
                        onClicked: addr => root.windowClicked(addr)
                    }
                }
            }
        }
    }
}
