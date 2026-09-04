import QtQuick
import qs.Commons
import qs.Ui

Item {
    id: root

    property string title: "OMALT-TAB"

    implicitHeight: Math.max(32, Style.space(32))
    implicitWidth: Math.max(leftRow.implicitWidth + 20, 240)

    // Left: Icon + Title
    Row {
        id: leftRow
        anchors.left: parent.left
        anchors.verticalCenter: parent.verticalCenter
        spacing: Style.spacing.md

        Rectangle {
            width: Math.max(26, Style.space(28))
            height: width
            radius: Math.max(3, Math.round(Style.cornerRadius * 0.4))
            color: Util.alpha(Color.accent, 0.15)
            border.width: 1
            border.color: Util.alpha(Color.accent, 0.3)
            Text {
                anchors.centerIn: parent
                text: "⇄"
                color: Color.accent
                font.pixelSize: Style.font.title
                font.bold: true
                font.family: Style.font.family
            }
        }

        Text {
            anchors.verticalCenter: parent.verticalCenter
            text: root.title
            color: Color.menu.text
            font.family: Style.font.menuFamily
            font.pixelSize: Style.font.title
            font.bold: true
            font.letterSpacing: 1.5
        }
    }

    // Right: Ergonomic Keyboard shortcuts guide (responsively adapts to width)
    Row {
        id: rightRow
        anchors.right: parent.right
        anchors.verticalCenter: parent.verticalCenter
        spacing: Style.spacing.sm

        Rectangle {
            id: hintWs
            height: Math.max(22, Style.space(24))
            width: txtWs.implicitWidth + 14
            radius: Math.max(3, Math.round(Style.cornerRadius * 0.35))
            color: Util.alpha(Color.foreground, Style.normalFillAlpha)
            border.width: 1
            border.color: Util.alpha(Color.foreground, Style.normalBorderAlpha)
            visible: root.width >= 360
            Row {
                id: txtWs
                anchors.centerIn: parent
                spacing: 4
                Text {
                    text: "WS:"
                    color: Color.muted
                    font.family: Style.font.menuFamily
                    font.pixelSize: Style.font.caption
                }
                Text {
                    text: "A S D F G H J K L ;"
                    color: Color.accent
                    font.family: Style.font.family
                    font.pixelSize: Style.font.caption
                    font.bold: true
                }
            }
        }

        Rectangle {
            id: hintWin
            height: Math.max(22, Style.space(24))
            width: txtWin.implicitWidth + 14
            radius: Math.max(3, Math.round(Style.cornerRadius * 0.35))
            color: Util.alpha(Color.foreground, Style.normalFillAlpha)
            border.width: 1
            border.color: Util.alpha(Color.foreground, Style.normalBorderAlpha)
            visible: root.width >= 450
            Row {
                id: txtWin
                anchors.centerIn: parent
                spacing: 4
                Text {
                    text: "Win:"
                    color: Color.muted
                    font.family: Style.font.menuFamily
                    font.pixelSize: Style.font.caption
                }
                Text {
                    text: "1-9"
                    color: Color.accent
                    font.family: Style.font.family
                    font.pixelSize: Style.font.caption
                    font.bold: true
                }
            }
        }

        Rectangle {
            id: hintArrows
            height: Math.max(22, Style.space(24))
            width: txtArrows.implicitWidth + 14
            radius: Math.max(3, Math.round(Style.cornerRadius * 0.35))
            color: Util.alpha(Color.foreground, Style.normalFillAlpha)
            border.width: 1
            border.color: Util.alpha(Color.foreground, Style.normalBorderAlpha)
            visible: root.width >= 530
            Row {
                id: txtArrows
                anchors.centerIn: parent
                spacing: 4
                Text {
                    text: "Nav:"
                    color: Color.muted
                    font.family: Style.font.menuFamily
                    font.pixelSize: Style.font.caption
                }
                Text {
                    text: "← → ↑ ↓"
                    color: Color.accent
                    font.family: Style.font.family
                    font.pixelSize: Style.font.caption
                    font.bold: true
                }
            }
        }

        Rectangle {
            id: hintTab
            height: Math.max(22, Style.space(24))
            width: txtTab.implicitWidth + 14
            radius: Math.max(3, Math.round(Style.cornerRadius * 0.35))
            color: Util.alpha(Color.foreground, Style.normalFillAlpha)
            border.width: 1
            border.color: Util.alpha(Color.foreground, Style.normalBorderAlpha)
            visible: root.width >= 610
            Text {
                id: txtTab
                anchors.centerIn: parent
                text: "Tab / ⇧Tab"
                color: Color.foreground
                font.family: Style.font.menuFamily
                font.pixelSize: Style.font.caption
                font.bold: true
            }
        }
    }
}
