-- bindings.lua: Hyprland & Omarchy bindings for omalt-tab window switcher

-- Unbind default Tab switchers if present
hl.unbind("ALT + TAB")
hl.unbind("ALT + SHIFT + TAB")

local release_timer = nil
local is_switching = false

-- Locate omalt-tab-client binary dynamically
local script_dir = nil
local info = debug.getinfo(1, "S")
if info and info.source and info.source:sub(1, 1) == "@" then
  script_dir = info.source:sub(2):match("(.*/)")
end

local client_cmd = (script_dir and script_dir .. "omalt-tab-client") or "omalt-tab-client"
local test_file = io.open(client_cmd, "r")
if test_file then
  test_file:close()
else
  local home = os.getenv("HOME")
  for _, candidate in ipairs({
    home .. "/.local/bin/omalt-tab-client",
    home .. "/.config/omarchy/plugins/io.github.codesmith28.omalt-tab/hypr/omalt-tab-client",
    home .. "/Projects/omalt-tab/hypr/omalt-tab-client"
  }) do
    local f = io.open(candidate, "r")
    if f then
      f:close()
      client_cmd = candidate
      break
    end
  end
end

local function stop_release_watcher()
  if release_timer then
    release_timer:set_enabled(false)
    release_timer = nil
  end
end

local function commit_and_reset()
  stop_release_watcher()
  if not is_switching then return end
  is_switching = false
  hl.exec_cmd(client_cmd .. " commit")
  hl.dispatch(hl.dsp.submap("reset"))
end

local function cancel_and_reset()
  stop_release_watcher()
  if not is_switching then return end
  is_switching = false
  hl.exec_cmd(client_cmd .. " cancel")
  hl.dispatch(hl.dsp.submap("reset"))
end

local function start_release_watcher()
  stop_release_watcher()
  is_switching = true
  local checks = 0
  release_timer = hl.timer(function()
    if not is_switching or hl.get_current_submap() ~= "omalt-tab" then
      stop_release_watcher()
      return
    end
    checks = checks + 1
    -- Grace period (~80ms) before polling key state to avoid race condition on initial Alt+Tab press
    if checks < 4 then
      return
    end
    local alt_l = hl.is_key_down("Alt_L")
    local alt_r = hl.is_key_down("Alt_R")
    if not alt_l and not alt_r then
      commit_and_reset()
    end
  end, { timeout = 25, type = "repeat" })
end

-- Define omalt-tab submap for robust modal switching
hl.define_submap("omalt-tab", function()
  -- Cycling inside switcher
  hl.bind("TAB", hl.dsp.exec_cmd(client_cmd .. " next"))
  hl.bind("ALT + TAB", hl.dsp.exec_cmd(client_cmd .. " next"))
  hl.bind("SHIFT + TAB", hl.dsp.exec_cmd(client_cmd .. " prev"))
  hl.bind("ALT + SHIFT + TAB", hl.dsp.exec_cmd(client_cmd .. " prev"))

  -- Directional spatial navigation
  hl.bind("Left", hl.dsp.exec_cmd(client_cmd .. " left"))
  hl.bind("ALT + Left", hl.dsp.exec_cmd(client_cmd .. " left"))
  hl.bind("Right", hl.dsp.exec_cmd(client_cmd .. " right"))
  hl.bind("ALT + Right", hl.dsp.exec_cmd(client_cmd .. " right"))
  hl.bind("Up", hl.dsp.exec_cmd(client_cmd .. " up"))
  hl.bind("ALT + Up", hl.dsp.exec_cmd(client_cmd .. " up"))
  hl.bind("Down", hl.dsp.exec_cmd(client_cmd .. " down"))
  hl.bind("ALT + Down", hl.dsp.exec_cmd(client_cmd .. " down"))

  -- Home row workspace keys: asdfghjkl;
  local ws_keys = { "a", "s", "d", "f", "g", "h", "j", "k", "l", "semicolon" }
  local ws_letters = { "a", "s", "d", "f", "g", "h", "j", "k", "l", ";" }
  for idx, k in ipairs(ws_keys) do
    local letter = ws_letters[idx]
    hl.bind(k, hl.dsp.exec_cmd(client_cmd .. " workspace " .. letter))
    hl.bind("ALT + " .. k, hl.dsp.exec_cmd(client_cmd .. " workspace " .. letter))
  end

  -- Window numbers: 1-9
  for i = 1, 9 do
    hl.bind(tostring(i), hl.dsp.exec_cmd(client_cmd .. " window " .. i))
    hl.bind("ALT + " .. tostring(i), hl.dsp.exec_cmd(client_cmd .. " window " .. i))
  end

  -- Fallback explicit release binds
  hl.bind("Alt_L", commit_and_reset, { release = true })
  hl.bind("Alt_R", commit_and_reset, { release = true })

  -- Manual confirmation (Enter / Space)
  hl.bind("Return", commit_and_reset)
  hl.bind("space", commit_and_reset)

  -- Cancel on Escape
  hl.bind("Escape", cancel_and_reset)
end)

-- Main triggers: open switcher, enter submap, and watch for Alt release
o.bind("ALT + TAB", "Window switcher (next)", function()
  hl.exec_cmd(client_cmd .. " next")
  hl.dispatch(hl.dsp.submap("omalt-tab"))
  start_release_watcher()
end)

o.bind("ALT + SHIFT + TAB", "Window switcher (prev)", function()
  hl.exec_cmd(client_cmd .. " prev")
  hl.dispatch(hl.dsp.submap("omalt-tab"))
  start_release_watcher()
end)
