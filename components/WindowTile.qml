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
    readonly property bool isGrouped: Boolean(winData && winData.isGrouped)
    readonly property bool showTabBar: isGrouped && root.height >= 38 && root.width >= 55

    // Group display deduplication: for grouped windows in the same container,
    // exactly ONE tile is rendered at a time so borders and backgrounds never overlap or double up.
    readonly property bool isAnyGroupMemberSelected: {
        if (!isGrouped || !winData || !winData.groupMembers) return false;
        for (var i = 0; i < winData.groupMembers.length; i++) {
            if (winData.groupMembers[i].address === selectedAddress) return true;
        }
        return false;
    }

    readonly property bool isGroupDisplayLeader: {
        if (!isGrouped) return true;
        // 1. If this specific window is selected, it must display
        if (isSelected) return true;
        // 2. If another window in this group is selected, this window hides (its tab is shown inside the selected window's tab bar)
        if (isAnyGroupMemberSelected) return false;
        // 3. If no window in this group is selected, display only the frontmost visible window in Hyprland
        if (winData && winData.visible) return true;
        // Fallback: if none are marked visible, only the first member in the group displays
        if (winData && winData.groupMembers && winData.groupMembers.length > 0) {
            for (var k = 0; k < winData.groupMembers.length; k++) {
                if (winData.groupMembers[k].visible) return false;
            }
            return winData.groupIndex === 0;
        }
        return true;
    }

    visible: isGroupDisplayLeader

    // Dynamic z-index: selected tile always frontmost, followed by active Hyprland visible tab, then background tabs
    z: isSelected ? 20 : (winData && winData.visible ? 5 : 1)

    x: winData ? Math.max(0, Math.round(winData.normX * parent.width)) : 0
    y: winData ? Math.max(0, Math.round(winData.normY * parent.height)) : 0
    width: winData ? Math.max(30, Math.min(parent.width - x, Math.round(winData.normW * parent.width))) : 30
    height: winData ? Math.max(24, Math.min(parent.height - y, Math.round(winData.normH * parent.height))) : 24

    radius: Math.max(3, Math.round(Style.cornerRadius * 0.35))
    color: isSelected ? Util.alpha(Color.accent, 0.22) : (mouseArea.containsMouse ? Util.alpha(Color.foreground, 0.10) : Util.alpha(Color.foreground, 0.05))
    border.width: isSelected ? 2 : 1
    border.color: isSelected ? Color.accent : (mouseArea.containsMouse ? Util.alpha(Color.accent, 0.5) : Util.alpha(Color.foreground, 0.15))

    clip: true

    Behavior on color { ColorAnimation { duration: 100 } }
    Behavior on border.color { ColorAnimation { duration: 100 } }
    Behavior on x { NumberAnimation { duration: 120; easing.type: Easing.OutCubic } }
    Behavior on y { NumberAnimation { duration: 120; easing.type: Easing.OutCubic } }
    Behavior on width { NumberAnimation { duration: 120; easing.type: Easing.OutCubic } }
    Behavior on height { NumberAnimation { duration: 120; easing.type: Easing.OutCubic } }

    // Inner accent ring when selected (crisp, continuous, never clipped by parent bounds)
    Rectangle {
        anchors.fill: parent
        anchors.margins: root.border.width
        radius: Math.max(1, root.radius - root.border.width)
        color: "transparent"
        border.width: 1
        border.color: root.isSelected ? Util.alpha(Color.accent, 0.35) : "transparent"
        visible: root.isSelected
        z: 1
    }

    // Standard Window Index Badge (Ergonomic hotkey [1], [2], ...)
    // Shown when window is NOT grouped, or when tile is too small for full tab bar
    Rectangle {
        id: indexBadge
        visible: !root.showTabBar
        z: 5
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.topMargin: root.border.width + 3
        anchors.leftMargin: root.border.width + 3
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

    // Compact Group Indicator for small tiles
    Rectangle {
        id: miniGroupBadge
        visible: root.isGrouped && !root.showTabBar
        z: 5
        anchors.top: parent.top
        anchors.right: parent.right
        anchors.topMargin: root.border.width + 3
        anchors.rightMargin: root.border.width + 3
        width: Math.min(18, Math.max(14, Math.round(root.width / 4)))
        height: width
        radius: Math.max(2, Math.round(Style.cornerRadius * 0.25))
        color: root.isSelected ? Color.accent : Util.alpha(Color.background, 0.85)
        border.width: 1
        border.color: Color.accent

        Text {
            anchors.centerIn: parent
            text: "󰓩"
            color: root.isSelected ? Color.background : Color.accent
            font.pixelSize: Math.max(8, parent.height - 6)
            font.family: Style.font.resolvedFamily || Style.font.family
        }
    }

    // Interactive Tab Bar Strip for Grouped Windows
    // Inset by border.width to ensure the outer border is 100% continuous and never obscured
    Rectangle {
        id: tabBar
        visible: root.showTabBar
        z: 6
        anchors.top: parent.top
        anchors.topMargin: root.border.width
        anchors.left: parent.left
        anchors.leftMargin: root.border.width
        anchors.right: parent.right
        anchors.rightMargin: root.border.width
        height: Math.min(22, Math.max(18, Math.round((root.height - root.border.width * 2) * 0.22)))
        radius: Math.max(1, root.radius - root.border.width)
        color: Util.alpha(Color.background, 0.85)

        // Bottom divider line separating tab strip from window content
        Rectangle {
            anchors.bottom: parent.bottom
            anchors.left: parent.left
            anchors.right: parent.right
            height: 1
            color: root.isSelected ? Util.alpha(Color.accent, 0.35) : Util.alpha(Color.foreground, 0.12)
        }

        // Row of tab pills
        Row {
            anchors.left: parent.left
            anchors.leftMargin: 2
            anchors.verticalCenter: parent.verticalCenter
            spacing: 2

            Repeater {
                model: (root.winData && root.winData.groupMembers) ? root.winData.groupMembers : []
                delegate: Rectangle {
                    id: tabPill
                    required property var modelData
                    required property int index

                    readonly property bool isThisTabSelected: modelData.address === root.selectedAddress
                    readonly property bool isThisTileWindow: modelData.address === (root.winData ? root.winData.address : "")

                    height: tabBar.height - 4
                    anchors.verticalCenter: parent.verticalCenter
                    width: Math.max(24, Math.min(85, Math.round((tabBar.width - (root.width >= 100 ? 34 : 8)) / Math.max(1, (root.winData && root.winData.groupMembers) ? root.winData.groupMembers.length : 1))))
                    radius: Math.max(2, Math.round(Style.cornerRadius * 0.2))

                    color: isThisTabSelected
                        ? Color.accent
                        : (isThisTileWindow
                            ? Util.alpha(Color.accent, 0.18)
                            : (tabMouseArea.containsMouse ? Util.alpha(Color.foreground, 0.12) : Util.alpha(Color.foreground, 0.06)))

                    border.width: 1
                    border.color: isThisTabSelected
                        ? Color.accent
                        : (isThisTileWindow
                            ? Util.alpha(Color.accent, 0.5)
                            : (tabMouseArea.containsMouse ? Util.alpha(Color.foreground, 0.3) : Util.alpha(Color.foreground, 0.12)))

                    Behavior on color { ColorAnimation { duration: 100 } }
                    Behavior on border.color { ColorAnimation { duration: 100 } }

                    Row {
                        anchors.centerIn: parent
                        spacing: 3

                        // Index number badge
                        Text {
                            text: tabPill.modelData.wsIndex
                            color: tabPill.isThisTabSelected
                                ? Color.background
                                : (tabPill.isThisTileWindow ? Color.accent : Color.foreground)
                            font.pixelSize: Math.max(8, tabPill.height - 7)
                            font.bold: true
                            font.family: Style.font.resolvedFamily || Style.font.family
                        }

                        // Mini App Icon in tab pill
                        Image {
                            width: Math.max(10, tabPill.height - 7)
                            height: width
                            anchors.verticalCenter: parent.verticalCenter
                            source: Icons.resolveIcon(Quickshell, DesktopEntries, tabPill.modelData.clientClass, tabPill.modelData.initialClass, root.appLibrary, tabPill.modelData.title, tabPill.modelData.initialTitle)
                            sourceSize.width: 32
                            sourceSize.height: 32
                            fillMode: Image.PreserveAspectFit
                            smooth: true
                            visible: tabPill.width >= 34
                        }
                    }

                    MouseArea {
                        id: tabMouseArea
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            root.clicked(tabPill.modelData.address);
                        }
                    }
                }
            }
        }

        // Right-aligned Group Counter Symbol
        Row {
            anchors.right: parent.right
            anchors.rightMargin: 4
            anchors.verticalCenter: parent.verticalCenter
            spacing: 2
            visible: root.width >= 90

            Text {
                text: "󰓩"
                color: root.isSelected ? Color.accent : Color.muted
                font.pixelSize: Math.max(9, tabBar.height - 7)
                font.family: Style.font.resolvedFamily || Style.font.family
                anchors.verticalCenter: parent.verticalCenter
            }

            Text {
                text: root.winData ? root.winData.groupLength : ""
                color: root.isSelected ? Color.accent : Color.muted
                font.pixelSize: Math.max(8, tabBar.height - 8)
                font.bold: true
                font.family: Style.font.resolvedFamily || Style.font.family
                anchors.verticalCenter: parent.verticalCenter
                visible: tabBar.width >= 110
            }
        }
    }

    // Center Content: Native System App Icon (as in app menu)
    Item {
        anchors.centerIn: parent
        anchors.verticalCenterOffset: root.showTabBar ? Math.round(tabBar.height / 2) : 0
        width: Math.min(32, Math.min(root.width - 16, root.showTabBar ? (root.height - tabBar.height - 8) : (root.height - 12)))
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
