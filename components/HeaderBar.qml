import QtQuick

Item {
    id: root

    property string title: "OMALT-TAB"

    width: parent ? parent.width : 600
    height: 32

    // Left: Icon + Title
    Row {
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

    // Right: Ergonomic Keyboard shortcuts guide
    Row {
        anchors.right: parent.right
        anchors.verticalCenter: parent.verticalCenter
        spacing: 8

        Rectangle {
            height: 24
            width: hintWs.implicitWidth + 14
            radius: 6
            color: "#1e1e2e"
            border.width: 1
            border.color: "#313244"
            Row {
                id: hintWs
                anchors.centerIn: parent
                spacing: 4
                Text { text: "WS:"; color: "#6c7086"; font.pixelSize: 11 }
                Text { text: "A S D F G H J K L ;"; color: "#89b4fa"; font.pixelSize: 11; font.bold: true; font.family: "monospace" }
            }
        }

        Rectangle {
            height: 24
            width: hintWin.implicitWidth + 14
            radius: 6
            color: "#1e1e2e"
            border.width: 1
            border.color: "#313244"
            Row {
                id: hintWin
                anchors.centerIn: parent
                spacing: 4
                Text { text: "Win:"; color: "#6c7086"; font.pixelSize: 11 }
                Text { text: "1-9"; color: "#06b6d4"; font.pixelSize: 11; font.bold: true; font.family: "monospace" }
            }
        }

        Rectangle {
            height: 24
            width: hintArrows.implicitWidth + 14
            radius: 6
            color: "#1e1e2e"
            border.width: 1
            border.color: "#313244"
            Row {
                id: hintArrows
                anchors.centerIn: parent
                spacing: 4
                Text { text: "Nav:"; color: "#6c7086"; font.pixelSize: 11 }
                Text { text: "← → ↑ ↓"; color: "#a6e3a1"; font.pixelSize: 11; font.bold: true }
            }
        }

        Rectangle {
            height: 24
            width: hintTab.implicitWidth + 14
            radius: 6
            color: "#1e1e2e"
            border.width: 1
            border.color: "#313244"
            Text {
                id: hintTab
                anchors.centerIn: parent
                text: "Tab / ⇧Tab"
                color: "#a6adc8"
                font.pixelSize: 11
                font.bold: true
            }
        }
    }
}
