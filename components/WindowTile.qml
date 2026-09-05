import QtQuick
import Quickshell
import qs.Commons
import qs.Ui
import "../js/Icons.js" as Icons

Rectangle {
    id: root

    property var winData: null
    property string selectedAddress: ""
    property var appLibrary: null
    signal clicked(string address)

    readonly property bool isSelected: winData && winData.address && winData.address === selectedAddress

    x: winData ? Math.max(0, Math.round(winData.normX * parent.width)) : 0
    y: winData ? Math.max(0, Math.round(winData.normY * parent.height)) : 0
    width: winData ? Math.max(45, Math.min(parent.width - x, Math.round(winData.normW * parent.width))) : 45
    height: winData ? Math.max(35, Math.min(parent.height - y, Math.round(winData.normH * parent.height))) : 35

    radius: Math.max(3, Math.round(Style.cornerRadius * 0.35))
    color: isSelected ? Util.alpha(Color.accent, 0.25) : (mouseArea.containsMouse ? Util.alpha(Color.foreground, 0.10) : Util.alpha(Color.foreground, 0.05))
    border.width: isSelected ? 2 : 1
    border.color: isSelected ? Color.accent : (mouseArea.containsMouse ? Util.alpha(Color.accent, 0.5) : Util.alpha(Color.foreground, 0.15))

    clip: true

    Behavior on color { ColorAnimation { duration: 100 } }
    Behavior on border.color { ColorAnimation { duration: 100 } }
    Behavior on x { NumberAnimation { duration: 120; easing.type: Easing.OutCubic } }
    Behavior on y { NumberAnimation { duration: 120; easing.type: Easing.OutCubic } }
    Behavior on width { NumberAnimation { duration: 120; easing.type: Easing.OutCubic } }
    Behavior on height { NumberAnimation { duration: 120; easing.type: Easing.OutCubic } }

    // Outer glow when selected
    Rectangle {
        anchors.fill: parent
        anchors.margins: -3
        radius: parent.radius + 2
        color: "transparent"
        border.width: 1.5
        border.color: root.isSelected ? Util.alpha(Color.accent, 0.5) : "transparent"
        opacity: root.isSelected ? 0.7 : 0
        z: -1
        Behavior on opacity { NumberAnimation { duration: 120 } }
    }

    // Window Index Badge (Ergonomic hotkey [1], [2], ...)
    Rectangle {
        id: indexBadge
        z: 5
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.margins: 3
        width: Math.min(20, Math.max(16, Math.round(root.width / 4)))
        height: width
        radius: Math.max(2, Math.round(Style.cornerRadius * 0.25))
        color: root.isSelected ? Color.accent : Util.alpha(Color.background, 0.85)
        border.width: 1
        border.color: Color.accent

        Text {
            anchors.centerIn: parent
            text: root.winData ? root.winData.wsIndex : "1"
            color: root.isSelected ? Color.background : Color.accent
            font.pixelSize: Math.max(9, parent.height - 7)
            font.bold: true
            font.family: Style.font.resolvedFamily || Style.font.family
        }
    }

    // Center Content: Native System App Icon (as in app menu)
    Item {
        anchors.centerIn: parent
        width: Math.min(32, Math.min(root.width - 16, root.height - 12))
        height: width

        Image {
            id: appIcon
            anchors.fill: parent
            source: root.winData ? Icons.resolveIcon(Quickshell, DesktopEntries, root.winData.clientClass, root.winData.initialClass, root.appLibrary, root.winData.title, root.winData.initialTitle) : ""
            sourceSize.width: 48
            sourceSize.height: 48
            fillMode: Image.PreserveAspectFit
            smooth: true
        }
    }

    MouseArea {
        id: mouseArea
        anchors.fill: parent
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor
        onClicked: {
            if (root.winData && root.winData.address) {
                root.clicked(root.winData.address);
            }
        }
    }
}
