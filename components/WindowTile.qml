import QtQuick
import Quickshell

Rectangle {
    id: root

    property var winData: null
    property string selectedAddress: ""
    signal clicked(string address)

    readonly property bool isSelected: winData && winData.address && winData.address === selectedAddress

    x: winData ? Math.max(0, Math.round((winData.normX !== undefined ? winData.normX : (winData.rx / 280)) * parent.width)) : 0
    y: winData ? Math.max(0, Math.round((winData.normY !== undefined ? winData.normY : (winData.ry / 175)) * parent.height)) : 0
    width: winData ? Math.max(45, Math.min(parent.width - x, Math.round((winData.normW !== undefined ? winData.normW : (winData.rw / 280)) * parent.width))) : 45
    height: winData ? Math.max(35, Math.min(parent.height - y, Math.round((winData.normH !== undefined ? winData.normH : (winData.rh / 175)) * parent.height))) : 35

    radius: 8
    color: isSelected ? "#2a2d48" : (mouseArea.containsMouse ? "#222436" : "#1a1b26")
    border.width: isSelected ? 2.5 : 1
    border.color: isSelected ? "#7aa2f7" : (mouseArea.containsMouse ? "#565f89" : "#2f334d")

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
        border.color: root.isSelected ? "#3d59a1" : "transparent"
        opacity: root.isSelected ? 0.6 : 0
        z: -1
        Behavior on opacity { NumberAnimation { duration: 120 } }
    }

    // Number Badge (Key Hint e.g. [1], [2])
    Rectangle {
        id: indexBadge
        z: 5
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.margins: 3
        width: Math.min(20, Math.max(16, Math.round(root.width / 4)))
        height: width
        radius: 4
        color: root.isSelected ? "#7aa2f7" : "#16161e"
        border.width: 1
        border.color: root.isSelected ? "#7aa2f7" : "#06b6d4"

        Text {
            anchors.centerIn: parent
            text: root.winData ? root.winData.wsIndex : "1"
            color: root.isSelected ? "#11111b" : "#06b6d4"
            font.pixelSize: Math.max(9, parent.height - 7)
            font.bold: true
            font.family: "monospace"
        }
    }

    // Center Content: App Icon
    Item {
        anchors.centerIn: parent
        anchors.verticalCenterOffset: (root.height >= 55 && root.width >= 65) ? -6 : 0
        width: Math.min(30, Math.min(root.width - 16, root.height - 14))
        height: width

        Image {
            id: appIcon
            anchors.fill: parent
            source: {
                if (!root.winData) return "";
                var cls = root.winData.clientClass || "";
                var initCls = root.winData.initialClass || "";
                var candidates = [];
                if (cls) candidates.push(cls);
                if (initCls) candidates.push(initCls);
                if (cls) {
                    candidates.push(cls.toLowerCase());
                    candidates.push(cls.replace("-browser", "-desktop"));
                    candidates.push(cls.replace("-browser", ""));
                    if (cls.indexOf("whatsapp") !== -1) candidates.push("whatsapp");
                    if (cls.indexOf("slack") !== -1) candidates.push("slack");
                    if (cls.indexOf("discord") !== -1) candidates.push("discord");
                    if (cls.indexOf("spotify") !== -1) candidates.push("spotify");
                    if (cls.indexOf("github") !== -1) candidates.push("github");
                    if (cls.startsWith("brave-")) candidates.push("brave-desktop");
                    if (cls.startsWith("chrome-")) candidates.push("google-chrome");
                    if (cls.indexOf(".") !== -1) candidates.push(cls.split(".").pop());
                }
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
            sourceSize.width: 48
            sourceSize.height: 48
            fillMode: Image.PreserveAspectFit
            smooth: true
            visible: status === Image.Ready
        }

        // Fallback letter if icon not found
        Rectangle {
            anchors.fill: parent
            visible: appIcon.status !== Image.Ready
            radius: 6
            color: "#313244"
            Text {
                anchors.centerIn: parent
                text: root.winData && root.winData.clientClass ?
                      root.winData.clientClass.substring(0, 1).toUpperCase() : "W"
                color: "#cdd6f4"
                font.bold: true
                font.pixelSize: 13
            }
        }
    }

    // Bottom Title & Class
    Item {
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        anchors.margins: 3
        height: 14
        visible: root.height >= 55 && root.width >= 65

        Text {
            anchors.fill: parent
            text: root.winData ? (root.winData.title || root.winData.clientClass) : ""
            color: root.isSelected ? "#cdd6f4" : "#a6adc8"
            font.pixelSize: 9
            font.weight: root.isSelected ? Font.Bold : Font.Normal
            elide: Text.ElideRight
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
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
