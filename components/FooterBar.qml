import QtQuick
import Quickshell
import qs.Commons
import qs.Ui

Rectangle {
    id: root

    property var selectedClientData: null

    implicitHeight: Math.max(52, Style.space(52))
    implicitWidth: 280
    radius: Math.max(4, Math.round(Style.cornerRadius * 0.5))
    color: Util.alpha(Color.background, 0.7)
    border.width: 1
    border.color: Util.alpha(Color.foreground, 0.15)

    Item {
        anchors.fill: parent
        anchors.leftMargin: Style.spacing.md
        anchors.rightMargin: Style.spacing.md

        // Left: Icon + Title + Metadata
        Row {
            anchors.left: parent.left
            anchors.right: statusHints.visible ? statusHints.left : parent.right
            anchors.rightMargin: statusHints.visible ? Style.spacing.md : 0
            anchors.verticalCenter: parent.verticalCenter
            spacing: Style.spacing.md

            Image {
                id: appIcon
                anchors.verticalCenter: parent.verticalCenter
                width: Math.max(26, Style.space(28))
                height: width
                source: {
                    if (!root.selectedClientData || root.selectedClientData.isWorkspace) return "";
                    var cls = root.selectedClientData.clientClass || "";
                    var initCls = root.selectedClientData.initialClass || "";
                    var candidates = [
                        cls,
                        initCls,
                        cls.toLowerCase(),
                        cls.replace("-browser", "-desktop"),
                        cls.replace("-browser", ""),
                        cls.includes(".") ? cls.split(".").pop() : ""
                    ];
                    for (var i = 0; i < candidates.length; i++) {
                        if (candidates[i] && Quickshell.hasThemeIcon(candidates[i])) {
                            return Quickshell.iconPath(candidates[i]);
                        }
                    }
                    for (var j = 0; j < candidates.length; j++) {
                        if (candidates[j]) {
                            var p = Quickshell.iconPath(candidates[j]);
                            if (p) return p;
                        }
                    }
                    return "";
                }
                fillMode: Image.PreserveAspectFit
                visible: status === Image.Ready
            }

            Rectangle {
                anchors.verticalCenter: parent.verticalCenter
                width: Math.max(26, Style.space(28))
                height: width
                radius: Math.max(3, Math.round(Style.cornerRadius * 0.35))
                color: Util.alpha(Color.foreground, 0.08)
                border.width: 1
                border.color: Util.alpha(Color.foreground, 0.2)
                visible: !appIcon.visible

                Text {
                    anchors.centerIn: parent
                    text: {
                        if (root.selectedClientData && root.selectedClientData.isWorkspace) {
                            return root.selectedClientData.wsLetter || "WS";
                        }
                        if (root.selectedClientData && root.selectedClientData.clientClass) {
                            return root.selectedClientData.clientClass.substring(0, 1).toUpperCase();
                        }
                        return "⇄";
                    }
                    color: Color.accent
                    font.bold: true
                    font.pixelSize: Style.font.caption
                    font.family: Style.font.family
                }
            }

            Column {
                anchors.verticalCenter: parent.verticalCenter
                spacing: 2
                width: parent.width - 40

                Text {
                    text: {
                        if (!root.selectedClientData) return "No selection";
                        if (root.selectedClientData.isWorkspace) {
                            return root.selectedClientData.title || ("Workspace " + root.selectedClientData.workspaceId);
                        }
                        return root.selectedClientData.title || "Window";
                    }
                    color: Color.foreground
                    font.family: Style.font.menuFamily
                    font.pixelSize: Style.font.body
                    font.bold: true
                    elide: Text.ElideRight
                    width: parent.width
                }

                Row {
                    spacing: Style.spacing.sm
                    Text {
                        text: {
                            if (!root.selectedClientData) return "";
                            if (root.selectedClientData.isWorkspace) {
                                return "Workspace [" + (root.selectedClientData.wsLetter || "") + "]  •  Empty workspace  •  Release Alt to switch";
                            }
                            return "Workspace [" + (root.selectedClientData.wsLetter || "1") + "]  •  Window #" + (root.selectedClientData.wsIndex || "1") + "  •  " + (root.selectedClientData.clientClass || "");
                        }
                        color: Color.accent
                        font.family: Style.font.menuFamily
                        font.pixelSize: Style.font.caption
                        elide: Text.ElideRight
                    }
                }
            }
        }

        // Right: Commit / Cancel Hints
        Row {
            id: statusHints
            anchors.right: parent.right
            anchors.verticalCenter: parent.verticalCenter
            spacing: Style.spacing.md
            visible: root.width >= 430

            Text {
                text: "Release Alt to switch"
                color: Color.muted
                font.family: Style.font.menuFamily
                font.pixelSize: Style.font.caption
                font.italic: true
            }

            Rectangle {
                width: 1
                height: 16
                color: Util.alpha(Color.foreground, 0.15)
                anchors.verticalCenter: parent.verticalCenter
            }

            Text {
                text: "Esc: Cancel"
                color: Color.muted
                font.family: Style.font.menuFamily
                font.pixelSize: Style.font.caption
            }
        }
    }
}
