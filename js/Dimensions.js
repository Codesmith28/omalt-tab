// js/Dimensions.js: Centralized design system metrics and tokens for omalt-tab
// Full design overhaul: enlarged, high-legibility desktop presentation.
.pragma library

// -----------------------------------------------------------------------------
// Switcher Overlay & Container Dimensions (1.2x balanced desktop scale)
// -----------------------------------------------------------------------------

var overlay = {
    screenMargin: 64,
    containerPadding: 58,
    containerPaddingVertical: 48,
    minAllowedWidth: 432,
    minAllowedHeight: 360,
    panelGap: 14,
    cardSpacing: 17,
    flickableExtraHeight: 10,
    cornerRadius: 14
};

// -----------------------------------------------------------------------------
// Workspace Card Dimensions (1.2x scale)
// -----------------------------------------------------------------------------

var card = {
    // Responsive dynamic card width calculation tokens
    maxAvailBase: 408,
    minWidth: 222,
    maxWidthSingle: 384,
    maxWidthDouble: 360,
    maxWidthMulti: 342,

    // Dimensions
    headerHeight: 31,
    headerSpacing: 10,
    margins: 10,
    spacing: 5,
    radius: 14,

    // Header letter badge
    letterBadgeSize: 29,
    letterBadgeRadius: 4,
    letterBadgeFontSize: 13,

    // Header workspace label
    nameFontSize: 13,
    nameThresholdCompact: 264,

    // Header window count badge
    countBadgeHeight: 22,
    countBadgePadding: 14,
    countBadgeRadius: 4,
    countBadgeFontSize: 12,
    countBadgeThreshold: 240,

    // Viewport
    viewportRadius: 7,
    viewportInset: 19, // cardWidth - viewportInset = viewportWidth
    canvasMargin: 2,

    // Empty state
    emptyIconSize: 26,
    emptyTitleSize: 14,
    emptyHintSize: 12,
    emptySpacing: 5
};

// -----------------------------------------------------------------------------
// Window Tile Dimensions (1.2x scale)
// -----------------------------------------------------------------------------

var windowTile = {
    minWidth: 36,
    minHeight: 29,
    radius: 5,

    borderWidthNormal: 1,
    borderWidthSelected: 2,
    innerRingMargin: 2,

    // Index hotkey badge [1], [2], ...
    indexBadgeSize: 22,
    indexBadgeMinSize: 16,
    indexBadgeMargin: 5,
    indexBadgeRadius: 4,
    indexBadgeFontSize: 11,

    // Mini group badge for small tiles
    miniGroupBadgeSize: 19,
    miniGroupBadgeMargin: 4,
    miniGroupBadgeRadius: 3,
    miniGroupBadgeFontSize: 10,

    // Group Tab Bar
    tabBarHeight: 24,
    tabBarRadius: 4,
    tabBarMargin: 2,
    tabBarSpacing: 2,
    tabBarThresholdHeight: 46,
    tabBarThresholdWidth: 66,

    // Individual Tab Pill
    tabPillHeight: 20,
    tabPillMinWidth: 29,
    tabPillMaxWidth: 102,
    tabPillRadius: 3,
    tabPillSpacing: 3,
    tabPillFontSize: 11,
    tabPillIconSize: 14,
    tabPillIconThreshold: 41,

    // Tab Bar Group Counter
    groupCounterThreshold: 108,
    groupCounterNumberThreshold: 132,
    groupCounterMargin: 5,
    groupCounterSpacing: 2,
    groupCounterIconSize: 11,
    groupCounterFontSize: 10,

    // Center App Icon
    appIconSize: 40,
    appIconSourceSize: 48
};

// -----------------------------------------------------------------------------
// Header Bar Dimensions (1.2x scale)
// -----------------------------------------------------------------------------

var header = {
    height: 41,
    minWidth: 312,
    spacing: 14,

    // Brand icon box
    brandBoxSize: 34,
    brandBoxRadius: 5,
    brandIconSize: 29,

    // Title
    titleFontSize: 19,
    titleLetterSpacing: 1.4,

    // Dev mode tag
    devTagHeight: 26,
    devTagPadding: 17,
    devTagRadius: 4,
    devTagSpacing: 6,
    devTagFontSize: 11,
    devTagLetterSpacing: 1.0,

    // Screenshot button
    shotBtnHeight: 26,
    shotBtnPadding: 17,
    shotBtnRadius: 4,
    shotBtnSpacing: 5,
    shotBtnFontSize: 12,

    // Direct jump shortcuts
    shortcutHeight: 29,
    shortcutPadding: 19,
    shortcutRadius: 4,
    shortcutFontSize: 12,
    shortcutThresholdWide: 600,
    shortcutThresholdMid: 516,
    shortcutThresholdCompact: 408
};

// -----------------------------------------------------------------------------
// Footer Bar Dimensions (1.2x scale)
// -----------------------------------------------------------------------------

var footer = {
    height: 68,
    minWidth: 384,
    radius: 7,
    padding: 14,

    // App icon container
    iconContainerSize: 43,
    appIconSourceSize: 64,
    workspaceIconRadius: 4,
    workspaceIconFontSize: 22,

    // Status & hints
    statusSpacing: 14,
    statusThreshold: 552,
    statusDividerHeight: 17,
    statusFontSize: 12,

    // Center text
    textSpacing: 4,
    titleFontSize: 15,

    // Metadata Badges
    badgeHeight: 22,
    badgePadding: 14,
    badgeRadius: 3,
    badgeSpacing: 6,
    badgeFontSize: 12,

    // Group Tab Badge
    groupBadgeSpacing: 5,
    groupBadgeIconSize: 12,
    groupBadgeFontSize: 12
};
