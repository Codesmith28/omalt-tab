import QtQuick

Item {
    id: root

    property string title: "OMALT-TAB"

    implicitHeight: 32
    implicitWidth: Math.max(leftRow.implicitWidth + 20, 240)

    // Left: Icon + Title
    Row {
        id: leftRow
        anchors.left: parent.left
        anchors.verticalCenter: parent.verticalCenter
        spacing: 10

        Rectangle {
            width: 28
            height: 28
            radius: 7
            color: "#313244"
            Text {
                anchors.centerIn: parent
                text: "⇄"
                color: "#89b4fa"
                font.pixelSize: 16
                font.bold: true
            }
        }

        Text {
            anchors.verticalCenter: parent.verticalCenter
            text: root.title
            color: "#cdd6f4"
            font.pixelSize: 14
            font.bold: true
            font.letterSpacing: 1.5
        }
    }

    // Right: Ergonomic Keyboard shortcuts guide (responsively adapts to width)
    Row {
        id: rightRow
        anchors.right: parent.right
        anchors.verticalCenter: parent.verticalCenter
        spacing: 8

        Rectangle {
            id: hintWs
            height: 24
            width: txtWs.implicitWidth + 14
            radius: 6
            color: "#1e1e2e"
            border.width: 1
            border.color: "#313244"
            visible: root.width >= 360
            Row {
                id: txtWs
                anchors.centerIn: parent
                spacing: 4
                Text { text: "WS:"; color: "#6c7086"; font.pixelSize: 11 }
                Text { text: "A S D F G H J K L ;"; color: "#89b4fa"; font.pixelSize: 11; font.bold: true; font.family: "monospace" }
            }
        }

        Rectangle {
            id: hintWin
            height: 24
            width: txtWin.implicitWidth + 14
            radius: 6
            color: "#1e1e2e"
            border.width: 1
            border.color: "#313244"
            visible: root.width >= 450
            Row {
                id: txtWin
                anchors.centerIn: parent
                spacing: 4
                Text { text: "Win:"; color: "#6c7086"; font.pixelSize: 11 }
                Text { text: "1-9"; color: "#06b6d4"; font.pixelSize: 11; font.bold: true; font.family: "monospace" }
            }
        }

        Rectangle {
            id: hintArrows
            height: 24
            width: txtArrows.implicitWidth + 14
            radius: 6
            color: "#1e1e2e"
            border.width: 1
            border.color: "#313244"
            visible: root.width >= 530
            Row {
                id: txtArrows
                anchors.centerIn: parent
                spacing: 4
                Text { text: "Nav:"; color: "#6c7086"; font.pixelSize: 11 }
                Text { text: "← → ↑ ↓"; color: "#a6e3a1"; font.pixelSize: 11; font.bold: true }
            }
        }

        Rectangle {
            id: hintTab
            height: 24
            width: txtTab.implicitWidth + 14
            radius: 6
            color: "#1e1e2e"
            border.width: 1
            border.color: "#313244"
            visible: root.width >= 610
            Text {
                id: txtTab
                anchors.centerIn: parent
                text: "Tab / ⇧Tab"
                color: "#a6adc8"
                font.pixelSize: 11
                font.bold: true
            }
        }
    }
}
