// Icons.js: Dynamic FreeDesktop candidate generator and icon resolver for omalt-tab

.pragma library

var BROWSER_PREFIX_REGEX = /^(?:brave|chrome|chromium|google-chrome|microsoft-edge|edge|opera|vivaldi|helium|firefox|epiphany)-/i;
var PROFILE_SUFFIX_REGEX = /(?:__-[^/]+|-Default|-Profile.*|__.*)$/i;
var REVERSE_DNS_PREFIX_REGEX = /^(?:com|org|io|net|dev|app|xyz|me|tv|de|fr|uk|nl|cz|md|ca|eu)\./i;
var TLD_REGEX = /\.(?:com|org|net|edu|gov|io|co|ai|app|dev|xyz|me|tv|fm|so|cc|us|uk|ca|in|de|fr|jp|info|biz|eu)(?:\.[a-z]{2})?$/i;
var SUBDOMAIN_REGEX = /^(?:web|app|m|mobile|www|mail|chat|music|play|desktop|client|portal|login|beta)\./i;

/**
 * Dynamically decomposes Wayland app_id / X11 WM_CLASS, window title, and initial title
 * into standard FreeDesktop icon candidates and web app domain identifiers.
 * Completely dynamic: handles web apps, PWAs, reverse-DNS, container prefixes, and case normalization.
 */
function getNativeIconCandidates(clientClass, initialClass, title, initialTitle) {
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
    var webAppBrowsers = [];

    for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (!c || typeof c !== "string") continue;

        add(c);
        add(c.toLowerCase());

        // 1. Detect Web App / PWA patterns (e.g. "brave-web.whatsapp.com__-Default")
        var bPrefixMatch = c.match(BROWSER_PREFIX_REGEX);
        var isWebApp = false;

        if (bPrefixMatch) {
            var browserName = bPrefixMatch[0].replace(/-$/, "").toLowerCase();
            webAppBrowsers.push(browserName);

            var strippedBrowser = c.slice(bPrefixMatch[0].length);
            var webTarget = strippedBrowser.replace(PROFILE_SUFFIX_REGEX, "");

            // Ignore standard browser binary suffixes like "browser" in "brave-browser"
            if (!/^(?:browser|desktop|bin|stable|beta|dev|nightly|electron)$/i.test(webTarget)) {
                isWebApp = true;
                add(webTarget);
                add(webTarget.toLowerCase());

                if (webTarget.indexOf(".") !== -1) {
                    var withoutSub = webTarget.replace(SUBDOMAIN_REGEX, "");
                    if (withoutSub !== webTarget) {
                        add(withoutSub);
                        add(withoutSub.toLowerCase());
                    }

                    var withoutTld = withoutSub.replace(TLD_REGEX, "");
                    if (withoutTld && withoutTld !== withoutSub) {
                        add(withoutTld);
                        add(withoutTld.toLowerCase());
                        add(withoutTld.charAt(0).toUpperCase() + withoutTld.slice(1));
                    }

                    var directWithoutTld = webTarget.replace(TLD_REGEX, "");
                    if (directWithoutTld && directWithoutTld !== webTarget) {
                        add(directWithoutTld);
                        add(directWithoutTld.toLowerCase());
                        add(directWithoutTld.replace(/\./g, "-"));
                        add(directWithoutTld.replace(/\./g, "-").toLowerCase());
                    }

                    var labels = webTarget.split(/[.-]/);
                    var skipLabels = { "web": 1, "app": 1, "www": 1, "m": 1, "mobile": 1, "mail": 1, "chat": 1, "music": 1, "play": 1, "desktop": 1, "client": 1, "portal": 1, "login": 1, "beta": 1, "com": 1, "org": 1, "net": 1, "edu": 1, "gov": 1, "io": 1, "co": 1, "ai": 1, "dev": 1, "xyz": 1, "me": 1, "tv": 1, "fm": 1, "so": 1, "cc": 1, "us": 1, "uk": 1, "ca": 1, "in": 1, "default": 1, "profile": 1 };
                    for (var l = 0; l < labels.length; l++) {
                        var lbl = labels[l].toLowerCase();
                        if (lbl && !skipLabels[lbl] && lbl.length > 2) {
                            add(labels[l]);
                            add(lbl);
                            add(lbl.charAt(0).toUpperCase() + lbl.slice(1));
                        }
                    }
                }
            }
        }

        // 2. Reverse-DNS extraction (e.g. "org.telegram.desktop", "com.spotify.Client", "com.mitchellh.ghostty")
        if (!isWebApp && REVERSE_DNS_PREFIX_REGEX.test(c)) {
            var parts = c.split(".");
            var last = parts[parts.length - 1];
            var secondLast = parts.length > 2 ? parts[parts.length - 2] : "";

            var genericEnds = { "desktop": 1, "client": 1, "app": 1, "ui": 1, "bin": 1, "x11": 1, "wayland": 1 };
            if (genericEnds[last.toLowerCase()] && secondLast) {
                add(secondLast);
                add(secondLast.toLowerCase());
                add(secondLast + "-" + last);
                add((secondLast + "-" + last).toLowerCase());
            } else {
                add(last);
                add(last.toLowerCase());
                if (secondLast && !/^(?:com|org|net|io|dev|app|xyz)$/i.test(secondLast)) {
                    add(secondLast + "-" + last);
                    add((secondLast + "-" + last).toLowerCase());
                }
            }
        }

        // 3. Generic suffix normalization (e.g., "code-url-handler" -> "code", "brave-browser" -> "brave")
        var stripped = c.replace(/-(browser|desktop|bin|nightly|stable|electron|wayland|x11|url-handler|wrapper|launcher|gtk|qt|qt5|qt6)$/i, "");
        if (stripped !== c) {
            add(stripped);
            add(stripped.toLowerCase());
        }

        // 4. Container / Distrobox prefix stripping (e.g., "uub-code" -> "code")
        var containerMatch = c.match(/^[a-zA-Z0-9_-]+-(code|firefox|chromium|chrome|brave|slack|discord|spotify|terminal|gimp|inkscape|vlc|mpv|obs)$/i);
        if (containerMatch) {
            add(containerMatch[1]);
            add(containerMatch[1].toLowerCase());
        }
    }

    // 5. Clues from title and initialTitle
    var titleList = [title, initialTitle];
    for (var tIdx = 0; tIdx < titleList.length; tIdx++) {
        var rawT = titleList[tIdx];
        if (!rawT || typeof rawT !== "string") continue;
        var t = rawT.trim();
        if (!t) continue;

        // Strip notification badge counts: (1) , [2] 
        t = t.replace(/^\s*[\(\[][0-9+*!]+[\)\]]\s*/, "");
        // Strip browser title suffixes: " - Brave", " - Google Chrome", etc.
        t = t.replace(/\s+[-—|]\s+(?:Brave|Google Chrome|Chromium|Mozilla Firefox|Firefox|Microsoft Edge|Opera|Vivaldi|Helium|Visual Studio Code).*$/i, "");
        t = t.trim();

        if (t.length > 0 && t.length < 50) {
            var cleanUrl = t.replace(/\/.*$/, "").replace(/_.*$/, "");
            if (cleanUrl.indexOf(".") !== -1 && !/\s/.test(cleanUrl)) {
                var domainWithoutSub = cleanUrl.replace(SUBDOMAIN_REGEX, "");
                var nameFromDomain = domainWithoutSub.replace(TLD_REGEX, "");
                if (nameFromDomain && nameFromDomain !== domainWithoutSub) {
                    add(nameFromDomain);
                    add(nameFromDomain.toLowerCase());
                    add(nameFromDomain.charAt(0).toUpperCase() + nameFromDomain.slice(1));
                }
            }
            add(t);
            add(t.toLowerCase());
            var firstWord = t.split(/\s+/)[0];
            if (firstWord && firstWord.length > 2 && firstWord !== t) {
                add(firstWord);
                add(firstWord.toLowerCase());
            }
        }
    }

    // Add browser fallback for web apps at the end
    for (var b = 0; b < webAppBrowsers.length; b++) {
        add(webAppBrowsers[b]);
    }

    // Common app aliases
    if (seen["code"] || seen["Code"]) {
        add("vscode");
    } else if (seen["vscode"]) {
        add("code");
    }

    return candidates;
}

var _iconCache = {};

function clearIconCache() {
    _iconCache = {};
}

/**
 * Resolves the native FreeDesktop icon path for an application using Quickshell & DesktopEntries.
 * Supports web apps, PWAs, Flatpaks, containers, native themes, and system fallbacks.
 */
function resolveIcon(quickshell, desktopEntries, clientClass, initialClass, shellAppLib, title, initialTitle) {
    if (!quickshell) return "";

    var cClass = clientClass;
    var iClass = initialClass;
    var wTitle = title;
    var iTitle = initialTitle;

    // Handle object passed as clientClass (e.g. winData / selectedClientData)
    if (clientClass && typeof clientClass === "object") {
        var obj = clientClass;
        cClass = obj.clientClass || obj.class || "";
        iClass = obj.initialClass || "";
        wTitle = obj.title || "";
        iTitle = obj.initialTitle || "";
        if (!shellAppLib && initialClass && typeof initialClass === "object" && !initialClass.toLowerCase) {
            shellAppLib = initialClass;
        }
    }

    var key = (cClass || "") + "::" + (iClass || "") + "::" + (wTitle || "");
    if (_iconCache[key]) {
        return _iconCache[key];
    }

    function isFallbackIcon(path) {
        if (!path || typeof path !== "string") return false;
        return path.indexOf("application-x-executable") !== -1 || path.indexOf("system-run") !== -1;
    }

    function queryPath(iconName) {
        if (!iconName) return "";

        // 1. AppLibrary iconIndex directly (instant lookup for disk paths in ~/.local/share/icons etc.)
        if (shellAppLib && shellAppLib.iconIndex && shellAppLib.iconIndex[iconName]) {
            var direct = shellAppLib.iconIndex[iconName];
            if (direct) {
                return (direct.indexOf("://") !== -1) ? direct : ("file://" + direct);
            }
        }

        // 2. Quickshell native theme lookup
        if (typeof quickshell.iconPath === "function") {
            var r = quickshell.iconPath(iconName, true);
            if (r && r.length > 0 && !isFallbackIcon(r)) return r;
        }

        // 3. AppLibrary iconSource (with guard against returning fallback application-x-executable on miss)
        if (shellAppLib && typeof shellAppLib.iconSource === "function") {
            var r = shellAppLib.iconSource(iconName);
            if (r && r.length > 0 && !isFallbackIcon(r)) return r;
        }

        return "";
    }

    function save(p) {
        if (p) {
            _iconCache[key] = p;
            return p;
        }
        return "";
    }

    var candidates = getNativeIconCandidates(cClass, iClass, wTitle, iTitle);

    // Extract potential web app domains for Exec matching
    var webAppDomains = [];
    var bPrefixMatch = (cClass || "").match(BROWSER_PREFIX_REGEX);
    if (bPrefixMatch) {
        var stripped = (cClass || "").slice(bPrefixMatch[0].length).replace(PROFILE_SUFFIX_REGEX, "");
        if (stripped.indexOf(".") !== -1) {
            webAppDomains.push(stripped.toLowerCase());
            var noSub = stripped.replace(SUBDOMAIN_REGEX, "");
            if (noSub !== stripped) webAppDomains.push(noSub.toLowerCase());
        }
    }
    if (wTitle && wTitle.indexOf(".") !== -1 && !/\s/.test(wTitle.trim())) {
        var cleanTitleUrl = wTitle.trim().replace(/\/.*$/, "").replace(/_.*$/, "");
        if (cleanTitleUrl.indexOf(".") !== -1) webAppDomains.push(cleanTitleUrl.toLowerCase());
    }

    // 1. DesktopEntries direct lookup by candidate ID (e.g. "Whatsapp", "brave-browser", "code")
    if (desktopEntries && typeof desktopEntries.byId === "function") {
        for (var i = 0; i < candidates.length; i++) {
            var cand = candidates[i];
            var entry = desktopEntries.byId(cand) || desktopEntries.byId(cand + ".desktop");
            if (entry && entry.icon) {
                var p = queryPath(entry.icon);
                if (p) return save(p);
            }
        }
    }

    // 2. DesktopEntries heuristic lookup
    if (desktopEntries && typeof desktopEntries.heuristicLookup === "function") {
        for (var i = 0; i < candidates.length; i++) {
            var entry = desktopEntries.heuristicLookup(candidates[i]);
            if (entry && entry.icon) {
                var p = queryPath(entry.icon);
                if (p) return save(p);
            }
        }
    }

    // Collect list of desktop entries
    var apps = [];
    if (desktopEntries && desktopEntries.applications && desktopEntries.applications.values) {
        apps = desktopEntries.applications.values;
    } else if (shellAppLib && typeof shellAppLib.sortedEntries === "function") {
        try {
            var se = shellAppLib.sortedEntries("");
            for (var k = 0; k < se.length; k++) apps.push(se[k].entry || se[k]);
        } catch (e) {}
    }

    // 3. Web app domain match against desktop entry Exec commands (e.g. Exec=omarchy-launch-webapp "https://web.whatsapp.com/")
    if (webAppDomains.length > 0 && apps.length > 0) {
        for (var d = 0; d < webAppDomains.length; d++) {
            var domain = webAppDomains[d];
            for (var j = 0; j < apps.length; j++) {
                var a = apps[j].entry || apps[j];
                if (!a) continue;
                var exec = (a.execString || (a.command ? (typeof a.command.join === "function" ? a.command.join(" ") : String(a.command)) : "") || "").toLowerCase();
                if (exec && exec.indexOf(domain) !== -1) {
                    if (a.icon) {
                        var p = queryPath(a.icon);
                        if (p) return save(p);
                    }
                }
            }
        }
    }

    // 4. DesktopEntries list lookup matching startupClass, id, name, genericName, or comment
    if (apps.length > 0) {
        for (var i = 0; i < candidates.length; i++) {
            var target = candidates[i].toLowerCase();
            for (var j = 0; j < apps.length; j++) {
                var a = apps[j].entry || apps[j];
                if (!a) continue;
                var sCls = (a.startupClass || "").toLowerCase();
                var aId = (a.id || "").toLowerCase().replace(/\.desktop$/, "");
                var aName = (a.name || "").toLowerCase();
                var aGen = (a.genericName || "").toLowerCase();
                var aComm = (a.comment || "").toLowerCase();
                if (sCls === target || aId === target || aName === target || aGen === target || aComm === target) {
                    if (a.icon) {
                        var p = queryPath(a.icon);
                        if (p) return save(p);
                    }
                }
            }
        }
    }

    // 5. Probing native icon theme directly with candidates
    for (var i = 0; i < candidates.length; i++) {
        var p = queryPath(candidates[i]);
        if (p) return save(p);
    }

    // 6. Default system application icon fallback
    var fallback = "";
    if (typeof quickshell.iconPath === "function") {
        fallback = quickshell.iconPath("application-x-executable", true) || quickshell.iconPath("system-run", true);
    }
    if (!fallback && shellAppLib && typeof shellAppLib.iconSource === "function") {
        fallback = shellAppLib.iconSource("application-x-executable");
    }
    if (fallback) return save(fallback);

    return "";
}

/**
 * Fallback Nerd Font icon glyph for workspaces.
 */
function getFallbackIcon(isWorkspace) {
    return isWorkspace ? "󰨇" : "";
}
