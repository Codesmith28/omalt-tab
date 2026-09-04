import QtQuick
import Quickshell

Rectangle {
    id: root

    property var selectedClientData: null

    width: parent ? parent.width : 600
    height: 52
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
            anchors.right: statusHints.left
            anchors.rightMargin: 12
            anchors.verticalCenter: parent.verticalCenter
            spacing: 12

            Image {
                anchors.verticalCenter: parent.verticalCenter
                width: 28
                height: 28
                source: {
                    if (!root.selectedClientData) return "";
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

            Column {
                anchors.verticalCenter: parent.verticalCenter
                spacing: 2

                Text {
                    text: root.selectedClientData ? (root.selectedClientData.title || "Window") : "No window selected"
                    color: "#cdd6f4"
                    font.pixelSize: 13
                    font.bold: true
                    elide: Text.ElideRight
                    width: Math.min(implicitWidth, 550)
                }

                Row {
                    spacing: 8
                    Text {
                        text: root.selectedClientData ?
                            ("Workspace [" + (root.selectedClientData.wsLetter || "1") + "]  •  Window #" + (root.selectedClientData.wsIndex || "1") + "  •  " + (root.selectedClientData.clientClass || "")) : ""
                        color: "#89b4fa"
                        font.pixelSize: 11
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
