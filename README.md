# omalt-tab

An ergonomic, race-condition-free Quickshell Alt+Tab window switcher with home-row workspace navigation and spatial miniature desktop layout for **Omarchy** and **Hyprland**.

Built by **Sarthak Siddhpura**.

---

## Features

- **Race-Condition-Free Switching**:
  - The client list and workspaces are snapshotted **once** when the switcher opens.
  - While cycling (`Alt+Tab`, `Shift+Alt+Tab`, arrows, numbers), the selection index updates purely in RAM. Hyprland focus history is **never mutated** mid-cycle.
  - Hyprland's `focuswindow` is dispatched **atomically only when you release `Alt`** (or press Enter / click).
- **Sub-Millisecond IPC**:
  - Communicates directly via a lightweight UNIX domain socket (`$XDG_RUNTIME_DIR/omalt-tab.sock`) with automatic fallback to `omarchy-shell shell call`.
- **Ergonomic Home Row Workspace Keys**:
  - Workspaces are mapped sequentially across the home row:
    - **1** &rarr; `A`
    - **2** &rarr; `S`
    - **3** &rarr; `D`
    - **4** &rarr; `F`
    - **5** &rarr; `G`
    - **6** &rarr; `H`
    - **7** &rarr; `J`
    - **8** &rarr; `K`
    - **9** &rarr; `L`
    - **10** &rarr; `;`
  - Pressing any home-row key (`A`–`;`) instantly jumps to that workspace and selects its window.
- **Numbered Window Badges**:
  - Each window inside a workspace displays a distinct index badge (`1`–`9`).
  - Pressing a number immediately selects that window.
- **2D Spatial Navigation**:
  - Navigate spatially between adjacent windows and workspaces with `Left`, `Right`, `Up`, and `Down`.
- **Hyprswitch-Style Miniature Desktop Layout**:
  - Proportional miniature desktop preview for each workspace showing actual window positions.
  - Application icons from current icon theme, glowing active borders, and window metadata footer.

---

## Installation

### From Omarchy Marketplace / Git

```sh
omarchy plugin add https://github.com/codesmith28/omalt-tab.git --enable
```

### Local Development / Manual Installation

To install or develop locally in Omarchy:

```sh
cp -r ~/Projects/omalt-tab ~/.config/omarchy/plugins/io.github.codesmith28.omalt-tab
omarchy-shell shell rescanPlugins
omarchy plugin enable io.github.codesmith28.omalt-tab
```

---

## Hyprland Bindings Setup

Plugins in Omarchy are stored in `~/.config/omarchy/plugins/`. Keybindings can be loaded directly from this standard location without copying any files.

In your `~/.config/hypr/bindings.lua`:

### Option A: Automatic Plugin Bindings Loader (Recommended)
Automatically loads keybindings from all installed Omarchy plugins that provide `hypr/bindings.lua`:

```lua
-- Auto-load keybindings from installed Omarchy plugins (~/.config/omarchy/plugins/*/hypr/bindings.lua)
local plugins_dir = os.getenv("HOME") .. "/.config/omarchy/plugins"
local p = io.popen("find " .. plugins_dir .. " -maxdepth 3 -name 'bindings.lua' 2>/dev/null")
if p then
  for file in p:lines() do
    dofile(file)
  end
  p:close()
end
```

### Option B: Direct Sourcing
Source `omalt-tab` specifically from its default plugin path:

```lua
local omalt_tab = os.getenv("HOME") .. "/.config/omarchy/plugins/io.github.codesmith28.omalt-tab/hypr/bindings.lua"
if io.open(omalt_tab, "r") then
  dofile(omalt_tab)
end
```

---

## Controls

| Key | Action |
| --- | --- |
| `Alt + Tab` | Next window (MRU order) |
| `Alt + Shift + Tab` | Previous window |
| `A`, `S`, `D`, `F`, `G`, `H`, `J`, `K`, `L`, `;` | Jump directly to workspace `1..10` |
| `1` – `9` | Select window by number in current workspace |
| `Left` / `Right` | 2D horizontal spatial navigation |
| `Up` / `Down` | 2D vertical spatial navigation |
| `Home` / `End` | First / Last window in MRU list |
| **Release `Alt`** | Commit and focus selected window |
| `Return` / `Space` | Commit and focus selected window |
| `Escape` / Click outside | Cancel switcher without changing focus |
| Left Click on Window | Immediately focus that window |
| Left Click on Workspace | Immediately switch to that workspace |

---

## Project Structure & Architecture

```
omalt-tab/
├── manifest.json            # Omarchy plugin manifest contract (schemaVersion: 1)
├── AltTabOverlay.qml        # Shell overlay entry point (IPC, socket server, lifecycle)
├── components/              # Modular UI components
│   ├── WindowTile.qml       # Scaled window tile with icon, badge, and selection glow
│   ├── WorkspaceCard.qml    # Miniature desktop workspace preview
│   ├── HeaderBar.qml        # Header with title and keyboard shortcut hints
│   └── FooterBar.qml        # Selected window title, class, and metadata footer
├── js/                      # Decoupled business and navigation logic
│   ├── WindowModel.js       # Hyprland JSON snapshot parser & coordinate scaler
│   └── Navigation.js        # MRU cycler, spatial navigation, & jump resolvers
├── hypr/                    # Compositor integration
│   ├── bindings.lua         # Hyprland submap configuration with Alt release timer
│   └── omalt-tab-client     # Sub-millisecond UNIX domain socket client
├── LICENSE                  # Apache 2.0 License
└── README.md                # Documentation
```

---

## Validation

Validate the plugin against Omarchy's manifest requirements:

```sh
omarchy plugin validate ~/Projects/omalt-tab
```

## Removal

```sh
omarchy plugin remove io.github.codesmith28.omalt-tab
```

---

## License

[Apache-2.0](LICENSE) © 2026 Sarthak Siddhpura
