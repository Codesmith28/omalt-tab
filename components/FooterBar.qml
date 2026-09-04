import QtQuick
import Quickshell

Rectangle {
    id: root

    property var selectedClientData: null

    implicitHeight: 52
    implicitWidth: 280
    radius: 10
    color: "#11111b"
    border.width: 1
    border.color: "#24283b"

    Item {
        anchors.fill: parent
        anchors.leftMargin: 12
        anchors.rightMargin: 12

        // Left: Icon + Title + Metadata
        Row {
            anchors.left: parent.left
            anchors.right: statusHints.visible ? statusHints.left : parent.right
            anchors.rightMargin: statusHints.visible ? 12 : 0
            anchors.verticalCenter: parent.verticalCenter
            spacing: 12

            Image {
                id: appIcon
                anchors.verticalCenter: parent.verticalCenter
                width: 28
                height: 28
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
                width: 28
                height: 28
                radius: 7
                color: "#24283b"
                border.width: 1
                border.color: "#414868"
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
                    color: "#89b4fa"
                    font.bold: true
                    font.pixelSize: 13
                    font.family: "monospace"
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
                    color: "#cdd6f4"
                    font.pixelSize: 13
                    font.bold: true
                    elide: Text.ElideRight
                    width: parent.width
                }

                Row {
                    spacing: 8
                    Text {
                        text: {
                            if (!root.selectedClientData) return "";
                            if (root.selectedClientData.isWorkspace) {
                                return "Workspace [" + (root.selectedClientData.wsLetter || "") + "]  •  Empty workspace  •  Release Alt to switch";
                            }
                            return "Workspace [" + (root.selectedClientData.wsLetter || "1") + "]  •  Window #" + (root.selectedClientData.wsIndex || "1") + "  •  " + (root.selectedClientData.clientClass || "");
                        }
                        color: "#89b4fa"
                        font.pixelSize: 11
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
            spacing: 12
            visible: root.width >= 430

            Text {
                text: "Release Alt to switch"
                color: "#a6adc8"
                font.pixelSize: 11
                font.italic: true
            }

            Rectangle {
                width: 1
                height: 16
                color: "#313244"
                anchors.verticalCenter: parent.verticalCenter
            }

            Text {
                text: "Esc: Cancel"
                color: "#6c7086"
                font.pixelSize: 11
            }
        }
    }
}
