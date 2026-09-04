import QtQuick
import Quickshell
import qs.Commons
import qs.Ui

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
        border.color: root.isSelected ? Util.alpha(Color.accent, 0.45) : "transparent"
        opacity: root.isSelected ? 0.7 : 0
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
            font.family: Style.font.family
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
            radius: Math.max(3, Math.round(Style.cornerRadius * 0.3))
            color: Util.alpha(Color.foreground, 0.12)
            Text {
                anchors.centerIn: parent
                text: root.winData && root.winData.clientClass ?
                      root.winData.clientClass.substring(0, 1).toUpperCase() : "W"
                color: Color.foreground
                font.bold: true
                font.family: Style.font.menuFamily
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
            color: root.isSelected ? Color.foreground : Color.muted
            font.family: Style.font.menuFamily
            font.pixelSize: Style.font.small
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
