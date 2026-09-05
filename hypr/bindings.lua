-- bindings.lua: Hyprland & Omarchy bindings for omalt-tab window switcher

-- Unbind default Tab switchers if present
hl.unbind("ALT + TAB")
hl.unbind("ALT + SHIFT + TAB")

local release_timer = nil
local is_switching = false

-- Locate plugin directory and client dynamically
local script_dir = nil
local info = debug.getinfo(1, "S")
if info and info.source and info.source:sub(1, 1) == "@" then
    script_dir = info.source:sub(2):match("(.*/)")
end

local home = os.getenv("HOME") or ""
local plugin_dirs = {
    script_dir and (script_dir:match("(.-)/hypr/?$") or script_dir),
    home .. "/.config/omarchy/plugins/io.github.codesmith28.omalt-tab",
    home .. "/Projects/omalt-tab"
}

local function find_existing_file(subpath)
    for _, dir in ipairs(plugin_dirs) do
        if dir then
            local p = dir .. "/" .. subpath
            local f = io.open(p, "r")
            if f then
                f:close()
                return p
            end
        end
    end
    return nil
end

local client_cmd = find_existing_file("hypr/omalt-tab-client") or (home .. "/.local/bin/omalt-tab-client") or "omalt-tab-client"

-- Detect if Dev Mode is enabled (either via OMALT_TAB_DEV env or js/Config.js)
local function read_dev_mode()
    if os.getenv("OMALT_TAB_DEV") == "1" then return true end
    local config_path = find_existing_file("js/Config.js")
    if config_path then
        local f = io.open(config_path, "r")
        if f then
            local content = f:read("*a")
            f:close()
            return content and content:match("devMode%s*=%s*true") ~= nil
        end
    end
    return false
end

local is_dev_mode = read_dev_mode()

local function stop_release_watcher()
    if release_timer then
        release_timer:set_enabled(false)
        release_timer = nil
    end
end

local function finish_and_reset(action)
    stop_release_watcher()
    is_switching = false
    hl.exec_cmd(client_cmd .. " " .. action)
    hl.dispatch(hl.dsp.submap("reset"))
end

local function commit_and_reset() finish_and_reset("commit") end
local function cancel_and_reset() finish_and_reset("cancel") end

local function start_release_watcher()
    stop_release_watcher()
    is_switching = true
    -- In dev mode, releasing Alt does NOT commit; user must press Enter to switch
    if is_dev_mode then return end

    local checks = 0
    release_timer = hl.timer(function()
        if not is_switching or hl.get_current_submap() ~= "omalt-tab" then
            stop_release_watcher()
            return
        end
        checks = checks + 1
        -- Grace period (~80ms) before polling key state to avoid race condition on initial Alt+Tab press
        if checks < 4 then return end
        if not hl.is_key_down("Alt_L") and not hl.is_key_down("Alt_R") then
            commit_and_reset()
        end
    end, { timeout = 25, type = "repeat" })
end

-- Define omalt-tab submap for robust modal switching
hl.define_submap("omalt-tab", function()
    local function bind_action(key, action)
        local cmd = hl.dsp.exec_cmd(client_cmd .. " " .. action)
        hl.bind(key, cmd)
        hl.bind("ALT + " .. key, cmd)
    end

    -- Tab cycling
    bind_action("TAB", "next")
    bind_action("SHIFT + TAB", "prev")

    -- Directional spatial navigation
    for _, dir in ipairs({ "Left", "Right", "Up", "Down" }) do
        bind_action(dir, dir:lower())
    end

    -- Home row workspace keys: asdfghjkl;
    local ws_keys = { "a", "s", "d", "f", "g", "h", "j", "k", "l", "semicolon" }
    local ws_letters = { "a", "s", "d", "f", "g", "h", "j", "k", "l", ";" }
    for idx, k in ipairs(ws_keys) do
        bind_action(k, "workspace " .. ws_letters[idx])
    end

    -- Window numbers: 1-9
    for i = 1, 9 do
        bind_action(tostring(i), "window " .. i)
    end

    if not is_dev_mode then
        -- Fallback explicit release binds (production mode only: release Alt to commit)
        hl.bind("Alt_L", commit_and_reset, { release = true })
        hl.bind("Alt_R", commit_and_reset, { release = true })
    end

    -- Manual confirmation (Return / KP_Enter / Space)
    -- Hyprland/XKB uses "Return" (not "Enter") for the main Enter key
    -- Covers Return, RETURN, KP_Enter, space, SPACE
    -- Handles bare keys, ALT +, SHIFT +, and ALT + SHIFT + variants
    local confirm_keys = {
        "Return",
        "RETURN",
        "KP_Enter",
        "space",
        "SPACE"
    }
    for _, key in ipairs(confirm_keys) do
        bind_action(key, "commit")
        bind_action("SHIFT + " .. key, "commit")
        hl.bind(key, commit_and_reset)
        hl.bind("ALT + " .. key, commit_and_reset)
        hl.bind("SHIFT + " .. key, commit_and_reset)
        hl.bind("ALT + SHIFT + " .. key, commit_and_reset)
    end

    -- Unlock PrintScreen and screenshot tool shortcuts (unlocked in dev mode and submap)
    local screenshot_cmd = "omarchy-capture-screenshot 2>/dev/null || grimblast copysave area 2>/dev/null || hyprshot -m region 2>/dev/null || grim"
    local screenshot_keys = {
        "PRINT",
        "SHIFT + PRINT",
        "SUPER + PRINT",
        "SUPER + SHIFT + PRINT",
        "SUPER + SHIFT + S",
        "CTRL + PRINT",
        "SUPER + CTRL + PRINT"
    }
    for _, sk in ipairs(screenshot_keys) do
        hl.bind(sk, hl.dsp.exec_cmd(screenshot_cmd))
        hl.bind("ALT + " .. sk, hl.dsp.exec_cmd(screenshot_cmd))
    end

    -- Cancel on Escape
    local cancel_keys = { "Escape", "ESCAPE" }
    for _, ck in ipairs(cancel_keys) do
        bind_action(ck, "cancel")
        bind_action("SHIFT + " .. ck, "cancel")
        hl.bind(ck, cancel_and_reset)
        hl.bind("ALT + " .. ck, cancel_and_reset)
        hl.bind("SHIFT + " .. ck, cancel_and_reset)
        hl.bind("ALT + SHIFT + " .. ck, cancel_and_reset)
    end
end)

-- Main triggers: open switcher, enter submap, and start release watcher
local function trigger_switcher(action)
    hl.exec_cmd(client_cmd .. " " .. action)
    hl.dispatch(hl.dsp.submap("omalt-tab"))
    start_release_watcher()
end

o.bind("ALT + TAB", "Window switcher (next)", function() trigger_switcher("next") end)
o.bind("ALT + SHIFT + TAB", "Window switcher (prev)", function() trigger_switcher("prev") end)
