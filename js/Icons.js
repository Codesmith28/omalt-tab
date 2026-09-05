// Icons.js: Dynamic FreeDesktop candidate generator and Nerd Font icons for omalt-tab

.pragma library

/**
 * Dynamically decomposes Wayland app_id / X11 WM_CLASS into standard FreeDesktop icon candidates.
 * Completely dynamic: uses reverse-DNS extraction, case normalization, and suffix stripping.
 * Zero hardcoded application names.
 */
function getNativeIconCandidates(clientClass, initialClass) {
    var candidates = [];
    var seen = {};

    function add(name) {
        if (!name || typeof name !== "string") return;
        var s = name.trim();
        if (!s || seen[s]) return;
        seen[s] = true;
        candidates.push(s);
    }

    var list = [clientClass, initialClass];
    for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (!c) continue;

        add(c);
        add(c.toLowerCase());

        // Reverse-DNS extraction (e.g., "com.mitchellh.ghostty" -> "ghostty", "org.gnome.Nautilus" -> "nautilus")
        if (c.indexOf(".") !== -1) {
            var parts = c.split(".");
            var last = parts[parts.length - 1];
            add(last);
            add(last.toLowerCase());
        }

        // Generic suffix normalization (e.g., "brave-browser" -> "brave", "code-url-handler" -> "code")
        var stripped = c.replace(/-(browser|desktop|bin|nightly|stable|electron|wayland|x11|url-handler)$/i, "");
        if (stripped !== c) {
            add(stripped);
            add(stripped.toLowerCase());
        }
    }

    return candidates;
}

var _iconCache = {};

function clearIconCache() {
    _iconCache = {};
}

/**
 * Resolves the native FreeDesktop icon path for an application class using Quickshell & DesktopEntries.
 * Checks DesktopEntries by ID, startupClass, and app name, then probes native theme candidates,
 * and falls back to system application executable icon ("application-x-executable") exactly like the app menu.
 */
function resolveIcon(quickshell, desktopEntries, clientClass, initialClass, shellAppLib) {
    if (!quickshell) return "";

    var key = (clientClass || "") + "::" + (initialClass || "");
    if (_iconCache[key]) {
        return _iconCache[key];
    }

    function queryPath(iconName) {
        if (!iconName) return "";
        if (shellAppLib && typeof shellAppLib.iconSource === "function") {
            var r = shellAppLib.iconSource(iconName);
            if (r && r.length > 0) return r;
        }
        if (typeof quickshell.iconPath === "function") {
            var r = quickshell.iconPath(iconName, true);
            if (r && r.length > 0) return r;
        }
        return "";
    }

    var candidates = getNativeIconCandidates(clientClass, initialClass);

    // 1. DesktopEntries direct lookup by candidate ID (e.g. "brave-browser", "code")
    if (desktopEntries && typeof desktopEntries.byId === "function") {
        for (var i = 0; i < candidates.length; i++) {
            var entry = desktopEntries.byId(candidates[i]);
            if (entry && entry.icon) {
                var p = queryPath(entry.icon);
                if (p) {
                    _iconCache[key] = p;
                    return p;
                }
            }
        }
    }

    // 2. DesktopEntries list lookup matching startupClass, id, or name (e.g. startupClass "Code")
    if (desktopEntries && desktopEntries.applications && desktopEntries.applications.values) {
        var apps = desktopEntries.applications.values;
        for (var i = 0; i < candidates.length; i++) {
            var target = candidates[i].toLowerCase();
            for (var j = 0; j < apps.length; j++) {
                var a = apps[j];
                if (!a) continue;
                var sCls = (a.startupClass || "").toLowerCase();
                var aId = (a.id || "").toLowerCase();
                var aName = (a.name || "").toLowerCase();
                if (sCls === target || aId === target || aName === target) {
                    if (a.icon) {
                        var p = queryPath(a.icon);
                        if (p) {
                            _iconCache[key] = p;
                            return p;
                        }
                    }
                }
            }
        }
    }

    // 3. Probing native icon theme directly with candidates (e.g. "com.mitchellh.ghostty", "ghostty")
    for (var i = 0; i < candidates.length; i++) {
        var p = queryPath(candidates[i]);
        if (p) {
            _iconCache[key] = p;
            return p;
        }
    }

    // 4. Default system application icon (as in Omarchy app menu)
    var fallback = queryPath("application-x-executable") || queryPath("system-run");
    if (fallback) {
        _iconCache[key] = fallback;
        return fallback;
    }

    return "";
}

/**
 * Fallback Nerd Font icon glyph for workspaces.
 */
function getFallbackIcon(isWorkspace) {
    return isWorkspace ? "󰨇" : "";
}
