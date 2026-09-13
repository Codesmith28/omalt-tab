// js/Utils.js: Centralized security, sanitization, and text formatting utilities for omalt-tab
.pragma library

/**
 * Sanitizes arbitrary text strings from Hyprland window snapshots to prevent
 * rich-text injection, Unicode direction override spoofing, and layout disruption.
 *
 * @param {string|any} raw - Input string from Hyprland client snapshot
 * @returns {string} Sanitized plain text
 */
function sanitizeText(raw) {
    if (raw === undefined || raw === null) return "";
    var str = String(raw);
    // Strip Unicode bidirectional control characters (CVE RTL-override spoofing: U+200E, U+200F, U+202A-U+202E, U+2066-U+2069)
    str = str.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "");
    // Replace control characters (newlines, carriage returns, tabs, null bytes) with single spaces
    str = str.replace(/[\r\n\t\0]/g, " ").trim();
    return str;
}

/**
 * Formats a safe plain-text window title for display in FooterBar or tooltips.
 *
 * @param {Object} clientData - Window or workspace client object
 * @param {string} [fallback="No window selected"] - Default title if clientData is absent
 * @returns {string} Safe title string
 */
function safeTitle(clientData, fallback) {
    if (!clientData) return sanitizeText(fallback || "No window selected");
    if (clientData.isWorkspace) {
        return sanitizeText(clientData.title || ("Workspace " + (clientData.workspaceId || "")));
    }
    return sanitizeText(clientData.title || clientData.initialTitle || fallback || "Window");
}

/**
 * Formats a safe plain-text workspace label badge.
 *
 * @param {Object} clientData - Window or workspace client object
 * @returns {string} Formatted workspace label (e.g. "WS [A] 1")
 */
function safeWorkspaceLabel(clientData) {
    if (!clientData) return "WS";
    var letter = sanitizeText(clientData.wsLetter || "");
    var wsId = sanitizeText(clientData.workspaceId || "");
    return "WS [" + letter + "] " + wsId;
}
