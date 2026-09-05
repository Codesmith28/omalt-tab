import QtQuick
import Quickshell
import qs.Commons
import qs.Ui
import "../js/Icons.js" as Icons

Rectangle {
    id: root

    property var selectedClientData: null
    property var appLibrary: null
    property bool devMode: false

    implicitHeight: Math.max(54, Style.space(56))
    implicitWidth: 320
    radius: Math.max(4, Math.round(Style.cornerRadius * 0.5))
    color: Util.alpha(Color.background, 0.75)
    border.width: 1
    border.color: Util.alpha(Color.foreground, 0.15)

    Item {
        anchors.fill: parent
        anchors.leftMargin: Style.spacing.md
        anchors.rightMargin: Style.spacing.md

        // Left: Application Icon Container
        Item {
            id: iconContainer
            anchors.left: parent.left
            anchors.verticalCenter: parent.verticalCenter
            width: Math.max(34, Style.space(36))
            height: width

            // 1. Native System App Icon (for windows)
            Image {
                id: appIcon
                anchors.fill: parent
                visible: root.selectedClientData && !root.selectedClientData.isWorkspace
                source: (root.selectedClientData && !root.selectedClientData.isWorkspace)
                    ? Icons.resolveIcon(Quickshell, DesktopEntries, root.selectedClientData.clientClass, root.selectedClientData.initialClass, root.appLibrary, root.selectedClientData.title, root.selectedClientData.initialTitle)
                    : ""
                sourceSize.width: 64
                sourceSize.height: 64
                fillMode: Image.PreserveAspectFit
                smooth: true
            }

            // 2. Workspace icon (only when an empty workspace itself is selected)
            Rectangle {
                anchors.fill: parent
                visible: Boolean(root.selectedClientData && root.selectedClientData.isWorkspace)
                radius: Math.max(3, Math.round(Style.cornerRadius * 0.35))
                color: Util.alpha(Color.accent, 0.15)
                border.width: 1
                border.color: Util.alpha(Color.accent, 0.3)

                Text {
                    anchors.centerIn: parent
                    text: "󰨇"
                    color: Color.accent
                    font.pixelSize: Math.max(18, Style.font.title)
                    font.family: Style.font.resolvedFamily || Style.font.family
                }
            }
        }

        // Right: Status & Confirmation Hints (Strictly anchored to right)
        Row {
            id: statusHints
            anchors.right: parent.right
            anchors.verticalCenter: parent.verticalCenter
            spacing: Style.spacing.md
            visible: root.width >= 460

            Text {
                text: root.devMode ? "Press Enter to switch" : "Release Alt to switch"
                color: root.devMode ? Color.accent : Color.muted
                font.family: Style.font.resolvedFamily || Style.font.family
                font.pixelSize: Style.font.caption
                font.bold: root.devMode
                font.italic: !root.devMode
            }

            Rectangle {
                width: 1
                height: 14
                color: Util.alpha(Color.foreground, 0.18)
                anchors.verticalCenter: parent.verticalCenter
            }

            Text {
                text: "Esc: Cancel"
                color: Color.muted
                font.family: Style.font.resolvedFamily || Style.font.family
                font.pixelSize: Style.font.caption
            }
        }

        // Center / Middle: Title and Clean Metadata Badges (Strictly bounded between icon and hints)
        Column {
            id: textColumn
            anchors.left: iconContainer.right
            anchors.leftMargin: Style.spacing.md
            anchors.right: statusHints.visible ? statusHints.left : parent.right
            anchors.rightMargin: statusHints.visible ? Style.spacing.md : 0
            anchors.verticalCenter: parent.verticalCenter
            spacing: 3
            clip: true

            // Window Title
            Text {
                id: windowTitle
                width: parent.width
                text: {
                    if (!root.selectedClientData) return "No window selected";
                    if (root.selectedClientData.isWorkspace) {
                        return root.selectedClientData.title || ("Workspace " + root.selectedClientData.workspaceId);
                    }
                    return root.selectedClientData.title || "Window";
                }
                color: Color.foreground
                font.family: Style.font.resolvedFamily || Style.font.family
                font.pixelSize: Style.font.body
                font.bold: true
                elide: Text.ElideRight
            }

            // Metadata Badges Row (Only Workspace and Window index)
            Row {
                spacing: Style.spacing.sm

                // Workspace Badge
                Rectangle {
                    height: Math.max(18, Style.space(19))
                    width: txtWs.implicitWidth + 12
                    radius: Math.max(2, Math.round(Style.cornerRadius * 0.25))
                    color: Util.alpha(Color.accent, 0.12)
                    border.width: 1
                    border.color: Util.alpha(Color.accent, 0.35)

                    Text {
                        id: txtWs
                        anchors.centerIn: parent
                        text: {
                            if (!root.selectedClientData) return "WS";
                            var letter = root.selectedClientData.wsLetter || "";
                            var wsId = root.selectedClientData.workspaceId || "";
                            return "WS [" + letter + "] " + wsId;
                        }
                        color: Color.accent
                        font.bold: true
                        font.family: Style.font.resolvedFamily || Style.font.family
                        font.pixelSize: Style.font.caption
                    }
                }

                // Window Index Badge
                Rectangle {
                    height: Math.max(18, Style.space(19))
                    width: txtIdx.implicitWidth + 12
                    radius: Math.max(2, Math.round(Style.cornerRadius * 0.25))
                    color: Util.alpha(Color.foreground, 0.08)
                    border.width: 1
                    border.color: Util.alpha(Color.foreground, 0.2)
                    visible: Boolean(root.selectedClientData && !root.selectedClientData.isWorkspace)

                    Text {
                        id: txtIdx
                        anchors.centerIn: parent
                        text: "#" + ((root.selectedClientData && root.selectedClientData.wsIndex) || "1")
                        color: Color.foreground
                        font.family: Style.font.resolvedFamily || Style.font.family
                        font.pixelSize: Style.font.caption
                    }
                }
            }
        }
    }
}
