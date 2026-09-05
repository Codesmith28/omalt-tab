# omalt-tab

An ergonomic, race-condition-free Quickshell Alt+Tab window switcher with home-row workspace navigation and spatial miniature desktop layout for **Omarchy** and **Hyprland**.

Built by **Sarthak Siddhpura**.

---

## Features

- **Native Omarchy Theme Integration**:
  - Dynamically follows the active Omarchy theme (`omarchy theme set <theme>`) including Hackerman, Tokyo Night, Catppuccin, Nord, Rose Pine, etc.
  - Seamlessly inherits theme palette colors (`Color.menu`, `Color.accent`, `Color.foreground`, `Color.background`, `Color.muted`) and scrim dimming.
  - Automatically matches active system fonts (`Style.font.family`, `Style.font.menuFamily`) and typography scale (`Style.font.*`).
  - Directly respects Hyprland corner rounding (`Style.cornerRadius`) and active border gradients via `BorderSurface`.
  - Updates reactively in real time when themes or fonts are switched.
- **Dynamic Proportional Box Dimensions**:
  - Automatically sizes and scales cards based on current screen resolution and aspect ratio (16:9, 16:10, ultrawide).
  - Flexibly accommodates anywhere from 1 to 10 workspaces without clipping or overflow.
- **Empty Workspace In-Between Navigation**:
  - Automatically identifies gaps between active workspaces and presents them as empty desktop cards.
  - You can navigate directly into empty workspaces using spatial keys or their assigned home-row letters (`A`–`;`), then release `Alt` to switch Hyprland directly to that empty workspace.
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
  - Pressing any home-row key (`A`–`;`) instantly jumps to that workspace and selects its window (or focuses the workspace if empty).
- **Numbered Window Badges**:
  - Each window inside a workspace displays a distinct index badge (`1`–`9`).
  - Pressing a number immediately selects that window.
- **2D Spatial Navigation**:
  - Navigate spatially between adjacent windows and workspaces with `Left`, `Right`, `Up`, and `Down`.
- **Hyprswitch-Style Miniature Desktop Layout**:
  - Proportional miniature desktop preview for each workspace showing actual window positions.
  - Application icons from current icon theme, glowing active borders, and window metadata footer.

---

## Installation & Setup

### 1. Developer Mode (`make dev`)
If you are developing or testing `omalt-tab`, run `make dev`. This configures the plugin in **Dev Mode** and sets up a development symlink in `~/.config/omarchy/plugins/`:
- **Switcher stays open**: Releasing `Alt` does **not** automatically switch tasks.
- **Enter required**: You must press `Enter` (`Return`) to enter into / focus the selected task.
- **Header DEV badge**: Displays a visual `DEV` badge in the header.
- **Footer prompt**: Shows `Press Enter to switch` in accent color.
- **Debug logs**: Enables verbose logging for socket commands, snapshots, and lifecycle events.

```sh
git clone https://github.com/codesmith28/omalt-tab.git ~/Projects/omalt-tab
cd ~/Projects/omalt-tab
make dev
```

### 2. Production Mode (`make prod` or `make install`)
To deploy or restore standard production behavior (where releasing `Alt` switches immediately):

```sh
cd ~/Projects/omalt-tab
make prod
# Or make install to install a clean standalone copy
```

### 3. Native Omarchy Package Manager (Git URL)
Once hosted on GitHub or another remote, end users can install directly via Omarchy's plugin manager:

```sh
omarchy plugin add https://github.com/codesmith28/omalt-tab.git --enable
```

### 4. Updating
- If using `make dev`: Simply edit your code and run `make restart` (or `omarchy restart shell`).
- If using `make install`: Run `make update` in this repo.
- If installed via `omarchy plugin add`: Run `omarchy plugin update io.github.codesmith28.omalt-tab`.

### 5. Makefile Target Reference
| Target | Description |
| --- | --- |
| `make dev` | Replaces installed plugin with **Dev Mode** plugin (switcher stays open; press Enter to switch) |
| `make prod` | Replaces installed plugin with **Production Mode** plugin (release Alt to switch immediately) |
| `make install` | Copies files to Omarchy plugins directory in production mode, enables plugin, and restarts shell |
| `make mode-dev` | Sets `devMode = true` in `js/Config.js` |
| `make mode-prod` | Sets `devMode = false` in `js/Config.js` |
| `make update` | Syncs latest changes and reloads shell |
| `make check` | Runs unit tests, manifest validation, bash syntax, and lua syntax checks |
| `make test` | Executes automated Node.js unit tests for model, navigation, and config |
| `make restart` | Restarts `omarchy-shell` to reload QML components into memory |
| `make status` | Displays active mode (Dev/Prod), installation type, socket health, and legacy switcher status |
| `make clean-legacy` | Disables obsolete standalone `hyprswitch` service and autostart script |
| `make uninstall` | Disables plugin in Omarchy and removes it from `~/.config/omarchy/plugins` |

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
│   ├── Config.js            # Central configuration, devMode flag, and feature flags
│   ├── WindowModel.js       # Hyprland JSON snapshot parser & coordinate scaler
│   ├── Navigation.js        # MRU cycler, spatial navigation, & jump resolvers
│   └── Icons.js             # FreeDesktop icon candidate resolver and cache
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
