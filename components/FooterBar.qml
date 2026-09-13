import QtQuick
import Quickshell
import qs.Commons
import qs.Ui
import "../js/Icons.js" as Icons
import "../js/Dimensions.js" as Dimensions
import "../js/Utils.js" as Utils

Rectangle {
    id: root

    property var selectedClientData: null
    property var appLibrary: null
    property bool devMode: false

    implicitHeight: Dimensions.footer.height
    implicitWidth: Dimensions.footer.minWidth
    radius: Dimensions.footer.radius
    color: Util.alpha(Color.background, 0.75)
    border.width: 1
    border.color: Util.alpha(Color.foreground, 0.15)

    Item {
        anchors.fill: parent
        anchors.leftMargin: Dimensions.footer.padding
        anchors.rightMargin: Dimensions.footer.padding

        // Left: Application Icon Container
        Item {
            id: iconContainer
            anchors.left: parent.left
            anchors.verticalCenter: parent.verticalCenter
            width: Dimensions.footer.iconContainerSize
            height: width

            // 1. Native System App Icon (for windows)
            Image {
                id: appIcon
                anchors.fill: parent
                visible: root.selectedClientData && !root.selectedClientData.isWorkspace
                source: (root.selectedClientData && !root.selectedClientData.isWorkspace)
                    ? Icons.resolveIcon(Quickshell, DesktopEntries, root.selectedClientData.clientClass, root.selectedClientData.initialClass, root.appLibrary, root.selectedClientData.title, root.selectedClientData.initialTitle)
                    : ""
                sourceSize.width: Dimensions.footer.appIconSourceSize
                sourceSize.height: Dimensions.footer.appIconSourceSize
                fillMode: Image.PreserveAspectFit
                smooth: true
            }

            // 2. Workspace icon (only when an empty workspace itself is selected)
            Rectangle {
                anchors.fill: parent
                visible: Boolean(root.selectedClientData && root.selectedClientData.isWorkspace)
                radius: Dimensions.footer.workspaceIconRadius
                color: Util.alpha(Color.accent, 0.15)
                border.width: 1
                border.color: Util.alpha(Color.accent, 0.3)

                Text {
                    anchors.centerIn: parent
                    text: "󰨇"
                    color: Color.accent
                    font.pixelSize: Dimensions.footer.workspaceIconFontSize
                    font.family: Style.font.resolvedFamily || Style.font.family
                }
            }
        }

        // Right: Status & Confirmation Hints (Strictly anchored to right)
        Row {
            id: statusHints
            anchors.right: parent.right
            anchors.verticalCenter: parent.verticalCenter
            spacing: Dimensions.footer.statusSpacing
            visible: root.width >= Dimensions.footer.statusThreshold

            Text {
                text: root.devMode ? "Press Enter to switch" : "Release Alt to switch"
                color: root.devMode ? Color.accent : Color.muted
                font.family: Style.font.resolvedFamily || Style.font.family
                font.pixelSize: Dimensions.footer.statusFontSize
                font.bold: root.devMode
                font.italic: !root.devMode
            }

            Rectangle {
                width: 1
                height: Dimensions.footer.statusDividerHeight
                color: Util.alpha(Color.foreground, 0.18)
                anchors.verticalCenter: parent.verticalCenter
            }

            Text {
                text: "Esc: Cancel"
                color: Color.muted
                font.family: Style.font.resolvedFamily || Style.font.family
                font.pixelSize: Dimensions.footer.statusFontSize
            }
        }

        // Center / Middle: Title and Clean Metadata Badges (Strictly bounded between icon and hints)
        Column {
            id: textColumn
            anchors.left: iconContainer.right
            anchors.leftMargin: Dimensions.footer.padding
            anchors.right: statusHints.visible ? statusHints.left : parent.right
            anchors.rightMargin: statusHints.visible ? Dimensions.footer.padding : 0
            anchors.verticalCenter: parent.verticalCenter
            spacing: Dimensions.footer.textSpacing
            clip: true

            // Window Title
            Text {
                id: windowTitle
                width: parent.width
                textFormat: Text.PlainText
                text: Utils.safeTitle(root.selectedClientData, "No window selected")
                color: Color.foreground
                font.family: Style.font.resolvedFamily || Style.font.family
                font.pixelSize: Dimensions.footer.titleFontSize
                font.bold: true
                elide: Text.ElideRight
            }

            // Metadata Badges Row (Only Workspace and Window index)
            Row {
                spacing: Dimensions.footer.badgeSpacing

                // Workspace Badge
                Rectangle {
                    height: Dimensions.footer.badgeHeight
                    width: txtWs.implicitWidth + Dimensions.footer.badgePadding
                    radius: Dimensions.footer.badgeRadius
                    color: Util.alpha(Color.accent, 0.12)
                    border.width: 1
                    border.color: Util.alpha(Color.accent, 0.35)

                    Text {
                        id: txtWs
                        anchors.centerIn: parent
                        textFormat: Text.PlainText
                        text: Utils.safeWorkspaceLabel(root.selectedClientData)
                        color: Color.accent
                        font.bold: true
                        font.family: Style.font.resolvedFamily || Style.font.family
                        font.pixelSize: Dimensions.footer.badgeFontSize
                    }
                }

                // Window Index Badge
                Rectangle {
                    height: Dimensions.footer.badgeHeight
                    width: txtIdx.implicitWidth + Dimensions.footer.badgePadding
                    radius: Dimensions.footer.badgeRadius
                    color: Util.alpha(Color.foreground, 0.08)
                    border.width: 1
                    border.color: Util.alpha(Color.foreground, 0.2)
                    visible: Boolean(root.selectedClientData && !root.selectedClientData.isWorkspace)

                    Text {
                        id: txtIdx
                        anchors.centerIn: parent
                        textFormat: Text.PlainText
                        text: "#" + ((root.selectedClientData && root.selectedClientData.wsIndex) || "1")
                        color: Color.foreground
                        font.family: Style.font.resolvedFamily || Style.font.family
                        font.pixelSize: Dimensions.footer.badgeFontSize
                    }
                }

                // Group Tab Badge (Visible when selected window is part of a group)
                Rectangle {
                    height: Dimensions.footer.badgeHeight
                    width: rowGroupBadge.implicitWidth + Dimensions.footer.badgePadding
                    radius: Dimensions.footer.badgeRadius
                    color: Util.alpha(Color.accent, 0.15)
                    border.width: 1
                    border.color: Util.alpha(Color.accent, 0.4)
                    visible: Boolean(root.selectedClientData && !root.selectedClientData.isWorkspace && root.selectedClientData.isGrouped)

                    Row {
                        id: rowGroupBadge
                        anchors.centerIn: parent
                        spacing: Dimensions.footer.groupBadgeSpacing

                        Text {
                            text: "󰓩"
                            color: Color.accent
                            font.pixelSize: Dimensions.footer.groupBadgeIconSize
                            font.family: Style.font.resolvedFamily || Style.font.family
                            anchors.verticalCenter: parent.verticalCenter
                        }

                        Text {
                            textFormat: Text.PlainText
                            text: {
                                if (!root.selectedClientData || !root.selectedClientData.isGrouped) return "";
                                var idx = (root.selectedClientData.groupIndex !== undefined) ? (root.selectedClientData.groupIndex + 1) : 1;
                                var len = root.selectedClientData.groupLength || 2;
                                return "Tab " + idx + " of " + len;
                            }
                            color: Color.accent
                            font.bold: true
                            font.family: Style.font.resolvedFamily || Style.font.family
                            font.pixelSize: Dimensions.footer.groupBadgeFontSize
                            anchors.verticalCenter: parent.verticalCenter
                        }
                    }
                }
            }
        }
    }
}
