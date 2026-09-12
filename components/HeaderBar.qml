import QtQuick
import qs.Commons
import qs.Ui
import "../js/Dimensions.js" as Dimensions

Item {
    id: root

    property string title: "OMALT-TAB"
    property bool devMode: false
    signal screenshotRequested()

    implicitHeight: Dimensions.header.height
    implicitWidth: Math.max(leftRow.implicitWidth + 20, Dimensions.header.minWidth)

    // Left: Brand Icon + Title
    Row {
        id: leftRow
        anchors.left: parent.left
        anchors.verticalCenter: parent.verticalCenter
        spacing: Dimensions.header.spacing

        Rectangle {
            width: Dimensions.header.brandBoxSize
            height: width
            radius: Dimensions.header.brandBoxRadius
            color: Util.alpha(Color.accent, 0.15)
            border.width: 1
            border.color: Util.alpha(Color.accent, 0.35)

            Text {
                anchors.centerIn: parent
                text: "󰕴"
                color: Color.accent
                font.pixelSize: Dimensions.header.brandIconSize
                font.family: Style.font.resolvedFamily || Style.font.family
            }
        }

        Text {
            anchors.verticalCenter: parent.verticalCenter
            text: root.title
            color: Color.menu.text
            font.family: Style.font.resolvedFamily || Style.font.family
            font.pixelSize: Dimensions.header.titleFontSize
            font.bold: true
            font.letterSpacing: Dimensions.header.titleLetterSpacing
        }

        // Dev Mode Tag (Visible on main card header when devMode is active)
        Rectangle {
            visible: root.devMode
            anchors.verticalCenter: parent.verticalCenter
            height: Dimensions.header.devTagHeight
            width: devTagRow.implicitWidth + Dimensions.header.devTagPadding
            radius: Dimensions.header.devTagRadius
            color: Util.alpha(Color.accent, 0.20)
            border.width: 1
            border.color: Color.accent

            Row {
                id: devTagRow
                anchors.centerIn: parent
                spacing: Dimensions.header.devTagSpacing

                Text {
                    anchors.verticalCenter: parent.verticalCenter
                    text: "󰅩"
                    color: Color.accent
                    font.family: Style.font.resolvedFamily || Style.font.family
                    font.pixelSize: Dimensions.header.devTagFontSize
                }

                Text {
                    id: txtDev
                    anchors.verticalCenter: parent.verticalCenter
                    text: "DEV MODE"
                    color: Color.accent
                    font.family: Style.font.resolvedFamily || Style.font.family
                    font.pixelSize: Dimensions.header.devTagFontSize
                    font.bold: true
                    font.letterSpacing: Dimensions.header.devTagLetterSpacing
                }
            }
        }

        // Dev Mode Screenshot Action Button (Click or press PrtScn to capture)
        Rectangle {
            id: btnScreenshot
            visible: root.devMode
            anchors.verticalCenter: parent.verticalCenter
            height: Dimensions.header.shotBtnHeight
            width: shotRow.implicitWidth + Dimensions.header.shotBtnPadding
            radius: Dimensions.header.shotBtnRadius
            color: shotMouse.containsMouse ? Util.alpha(Color.accent, 0.28) : Util.alpha(Color.foreground, 0.08)
            border.width: 1
            border.color: shotMouse.containsMouse ? Color.accent : Util.alpha(Color.foreground, 0.20)

            Row {
                id: shotRow
                anchors.centerIn: parent
                spacing: Dimensions.header.shotBtnSpacing

                Text {
                    anchors.verticalCenter: parent.verticalCenter
                    text: ""
                    color: shotMouse.containsMouse ? Color.accent : Color.foreground
                    font.family: Style.font.resolvedFamily || Style.font.family
                    font.pixelSize: Dimensions.header.shotBtnFontSize
                }

                Text {
                    id: txtShot
                    anchors.verticalCenter: parent.verticalCenter
                    text: "Screenshot"
                    color: shotMouse.containsMouse ? Color.accent : Color.foreground
                    font.family: Style.font.resolvedFamily || Style.font.family
                    font.pixelSize: Dimensions.header.shotBtnFontSize
                    font.bold: true
                }
            }

            MouseArea {
                id: shotMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: root.screenshotRequested()
            }
        }
    }

    // Right: Ergonomic Direct Jump Shortcuts (Clean, uncrowded)
    Row {
        id: rightRow
        anchors.right: parent.right
        anchors.verticalCenter: parent.verticalCenter
        spacing: Dimensions.header.spacing

        // Screenshot hint (PrtScn in dev mode)
        Rectangle {
            id: hintPrtScn
            height: Dimensions.header.shortcutHeight
            width: txtPrtScn.implicitWidth + Dimensions.header.shortcutPadding
            radius: Dimensions.header.shortcutRadius
            color: Util.alpha(Color.foreground, Style.normalFillAlpha)
            border.width: 1
            border.color: Util.alpha(Color.foreground, Style.normalBorderAlpha)
            visible: root.devMode && root.width >= Dimensions.header.shortcutThresholdWide

            Text {
                id: txtPrtScn
                anchors.centerIn: parent
                text: "PrtScn"
                color: Color.foreground
                font.family: Style.font.resolvedFamily || Style.font.family
                font.pixelSize: Dimensions.header.shortcutFontSize
                font.bold: true
            }
        }

        // Workspace direct jump hint (Home-row keys)
        Rectangle {
            id: hintWs
            height: Dimensions.header.shortcutHeight
            width: txtWs.implicitWidth + Dimensions.header.shortcutPadding
            radius: Dimensions.header.shortcutRadius
            color: Util.alpha(Color.foreground, Style.normalFillAlpha)
            border.width: 1
            border.color: Util.alpha(Color.foreground, Style.normalBorderAlpha)
            visible: root.width >= Dimensions.header.shortcutThresholdCompact

            Text {
                id: txtWs
                anchors.centerIn: parent
                text: "WS [A-Z]"
                color: Color.foreground
                font.family: Style.font.resolvedFamily || Style.font.family
                font.pixelSize: Dimensions.header.shortcutFontSize
                font.bold: true
            }
        }

        // Window direct jump hint (1-9 keys)
        Rectangle {
            id: hintWin
            height: Dimensions.header.shortcutHeight
            width: txtWin.implicitWidth + Dimensions.header.shortcutPadding
            radius: Dimensions.header.shortcutRadius
            color: Util.alpha(Color.foreground, Style.normalFillAlpha)
            border.width: 1
            border.color: Util.alpha(Color.foreground, Style.normalBorderAlpha)
            visible: root.width >= Dimensions.header.shortcutThresholdMid

            Text {
                id: txtWin
                anchors.centerIn: parent
                text: "Win [1-9]"
                color: Color.foreground
                font.family: Style.font.resolvedFamily || Style.font.family
                font.pixelSize: Dimensions.header.shortcutFontSize
                font.bold: true
            }
        }
    }
}
