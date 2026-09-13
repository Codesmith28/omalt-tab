// js/Dimensions.js: Centralized design system metrics and tokens for omalt-tab
// Full design overhaul: enlarged, high-legibility desktop presentation.
.pragma library

// -----------------------------------------------------------------------------
// Switcher Overlay & Container Dimensions (1.1x sweet-spot scale)
// -----------------------------------------------------------------------------

var overlay = {
    screenMargin: 64,
    containerPadding: 50,
    containerPaddingVertical: 42,
    minAllowedWidth: 400,
    minAllowedHeight: 320,
    panelGap: 12,
    cardSpacing: 15,
    rowSpacing: 14,
    flickableExtraHeight: 10,
    cornerRadius: 14
};

// -----------------------------------------------------------------------------
// Workspace Card Dimensions (1.1x scale - 6 workspace sweet spot default)
// -----------------------------------------------------------------------------

var card = {
    // Responsive dynamic card width calculation tokens
    maxAvailBase: 380,
    minWidth: 210,
    maxWidthSingle: 330,
    maxWidthDouble: 310,
    maxWidthMulti: 285, // Sweet-spot default size matching 6 workspaces

    // Dimensions
    headerHeight: 28,
    headerSpacing: 9,
    margins: 9,
    spacing: 5,
    radius: 12,

    // Header letter badge
    letterBadgeSize: 26,
    letterBadgeRadius: 4,
    letterBadgeFontSize: 12,

    // Header workspace label
    nameFontSize: 12,
    nameThresholdCompact: 240,

    // Header window count badge
    countBadgeHeight: 20,
    countBadgePadding: 13,
    countBadgeRadius: 4,
    countBadgeFontSize: 11,
    countBadgeThreshold: 220,

    // Viewport
    viewportRadius: 7,
    viewportInset: 18, // cardWidth - viewportInset = viewportWidth
    canvasMargin: 2,

    // Empty state
    emptyIconSize: 24,
    emptyTitleSize: 13,
    emptyHintSize: 11,
    emptySpacing: 4
};

// -----------------------------------------------------------------------------
// Window Tile Dimensions (1.1x scale)
// -----------------------------------------------------------------------------

var windowTile = {
    minWidth: 33,
    minHeight: 26,
    radius: 4,

    borderWidthNormal: 1,
    borderWidthSelected: 2,
    innerRingMargin: 2,

    // Index hotkey badge [1], [2], ...
    indexBadgeSize: 20,
    indexBadgeMinSize: 15,
    indexBadgeMargin: 4,
    indexBadgeRadius: 3,
    indexBadgeFontSize: 11,

    // Mini group badge for small tiles
    miniGroupBadgeSize: 18,
    miniGroupBadgeMargin: 4,
    miniGroupBadgeRadius: 3,
    miniGroupBadgeFontSize: 9,

    // Group Tab Bar
    tabBarHeight: 22,
    tabBarRadius: 3,
    tabBarMargin: 2,
    tabBarSpacing: 2,
    tabBarThresholdHeight: 42,
    tabBarThresholdWidth: 60,

    // Individual Tab Pill
    tabPillHeight: 18,
    tabPillMinWidth: 26,
    tabPillMaxWidth: 95,
    tabPillRadius: 3,
    tabPillSpacing: 3,
    tabPillFontSize: 10,
    tabPillIconSize: 13,
    tabPillIconThreshold: 38,

    // Tab Bar Group Counter
    groupCounterThreshold: 100,
    groupCounterNumberThreshold: 120,
    groupCounterMargin: 5,
    groupCounterSpacing: 2,
    groupCounterIconSize: 10,
    groupCounterFontSize: 9,

    // Center App Icon
    appIconSize: 36,
    appIconSourceSize: 48
};

// -----------------------------------------------------------------------------
// Header Bar Dimensions (1.1x scale)
// -----------------------------------------------------------------------------

var header = {
    height: 38,
    minWidth: 290,
    spacing: 13,

    // Brand icon box
    brandBoxSize: 31,
    brandBoxRadius: 4,
    brandIconSize: 26,

    // Title
    titleFontSize: 18,
    titleLetterSpacing: 1.3,

    // Dev mode tag
    devTagHeight: 24,
    devTagPadding: 15,
    devTagRadius: 4,
    devTagSpacing: 5,
    devTagFontSize: 11,
    devTagLetterSpacing: 0.9,

    // Screenshot button
    shotBtnHeight: 24,
    shotBtnPadding: 15,
    shotBtnRadius: 4,
    shotBtnSpacing: 5,
    shotBtnFontSize: 11,

    // Direct jump shortcuts
    shortcutHeight: 26,
    shortcutPadding: 17,
    shortcutRadius: 4,
    shortcutFontSize: 11,
    shortcutThresholdWide: 550,
    shortcutThresholdMid: 470,
    shortcutThresholdCompact: 375
};

// -----------------------------------------------------------------------------
// Footer Bar Dimensions (1.1x scale)
// -----------------------------------------------------------------------------

var footer = {
    height: 62,
    minWidth: 350,
    radius: 6,
    padding: 13,

    // App icon container
    iconContainerSize: 40,
    appIconSourceSize: 64,
    workspaceIconRadius: 4,
    workspaceIconFontSize: 20,

    // Status & hints
    statusSpacing: 13,
    statusThreshold: 510,
    statusDividerHeight: 15,
    statusFontSize: 11,

    // Center text
    textSpacing: 3,
    titleFontSize: 14,

    // Metadata Badges
    badgeHeight: 20,
    badgePadding: 13,
    badgeRadius: 3,
    badgeSpacing: 5,
    badgeFontSize: 11,

    // Group Tab Badge
    groupBadgeSpacing: 4,
    groupBadgeIconSize: 11,
    groupBadgeFontSize: 11
};
