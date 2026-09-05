import QtQuick
import qs.Commons
import qs.Ui

Item {
    id: root

    property string title: "OMALT-TAB"
    property bool devMode: false

    implicitHeight: Math.max(34, Style.space(34))
    implicitWidth: Math.max(leftRow.implicitWidth + 20, 260)

    // Left: Brand Icon + Title
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
            border.color: Util.alpha(Color.accent, 0.35)

            Text {
                anchors.centerIn: parent
                text: "󰕴"
                color: Color.accent
                font.pixelSize: Math.max(25, Style.font.title)
                font.family: Style.font.resolvedFamily || Style.font.family
            }
        }

        Text {
            anchors.verticalCenter: parent.verticalCenter
            text: root.title
            color: Color.menu.text
            font.family: Style.font.resolvedFamily || Style.font.family
            font.pixelSize: Style.font.title
            font.bold: true
            font.letterSpacing: 1.2
        }

        // Dev Mode Tag (Visible on main card header when devMode is active)
        Rectangle {
            visible: root.devMode
            anchors.verticalCenter: parent.verticalCenter
            height: Math.max(20, Style.space(22))
            width: devTagRow.implicitWidth + 14
            radius: Math.max(3, Math.round(Style.cornerRadius * 0.35))
            color: Util.alpha(Color.accent, 0.20)
            border.width: 1
            border.color: Color.accent

            Row {
                id: devTagRow
                anchors.centerIn: parent
                spacing: 5

                Text {
                    anchors.verticalCenter: parent.verticalCenter
                    text: "󰅩"
                    color: Color.accent
                    font.family: Style.font.resolvedFamily || Style.font.family
                    font.pixelSize: Style.font.caption
                }

                Text {
                    id: txtDev
                    anchors.verticalCenter: parent.verticalCenter
                    text: "DEV MODE"
                    color: Color.accent
                    font.family: Style.font.resolvedFamily || Style.font.family
                    font.pixelSize: Style.font.caption
                    font.bold: true
                    font.letterSpacing: 0.8
                }
            }
        }
    }

    // Right: Ergonomic Direct Jump Shortcuts (Clean, uncrowded)
    Row {
        id: rightRow
        anchors.right: parent.right
        anchors.verticalCenter: parent.verticalCenter
        spacing: Style.spacing.md

        // Workspace direct jump hint (Home-row keys)
        Rectangle {
            id: hintWs
            height: Math.max(22, Style.space(24))
            width: txtWs.implicitWidth + 16
            radius: Math.max(3, Math.round(Style.cornerRadius * 0.35))
            color: Util.alpha(Color.foreground, Style.normalFillAlpha)
            border.width: 1
            border.color: Util.alpha(Color.foreground, Style.normalBorderAlpha)
            visible: root.width >= 340

            Text {
                id: txtWs
                anchors.centerIn: parent
                text: "WS [A-Z]"
                color: Color.foreground
                font.family: Style.font.resolvedFamily || Style.font.family
                font.pixelSize: Style.font.caption
                font.bold: true
            }
        }

        // Window direct jump hint (1-9 keys)
        Rectangle {
            id: hintWin
            height: Math.max(22, Style.space(24))
            width: txtWin.implicitWidth + 16
            radius: Math.max(3, Math.round(Style.cornerRadius * 0.35))
            color: Util.alpha(Color.foreground, Style.normalFillAlpha)
            border.width: 1
            border.color: Util.alpha(Color.foreground, Style.normalBorderAlpha)
            visible: root.width >= 430

            Text {
                id: txtWin
                anchors.centerIn: parent
                text: "Win [1-9]"
                color: Color.foreground
                font.family: Style.font.resolvedFamily || Style.font.family
                font.pixelSize: Style.font.caption
                font.bold: true
            }
        }
    }
}
