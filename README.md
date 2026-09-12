<div align="center">

# ❖ omalt-tab

**An ergonomic, race-condition-free Quickshell Alt+Tab window switcher with home-row workspace navigation, native Hyprland grouped window tabs, dynamic multi-row overflow, and spatial miniature desktop layout for Omarchy.**

[![Omarchy Plugin](https://img.shields.io/badge/Omarchy-Plugin-3b82f6.svg?style=for-the-badge&logo=archlinux&logoColor=white)](https://omarchy.org)
[![Quickshell](https://img.shields.io/badge/Quickshell-0.3.1-f59e0b.svg?style=for-the-badge)](https://quickshell.outfoxxed.me)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-8b5cf6.svg?style=for-the-badge)](LICENSE)
[![Tests Passing](https://img.shields.io/badge/Tests-19%20Passing-10b981.svg?style=for-the-badge)](tests/test_logic.js)

<br/>

<p align="center">
  <img src="demo/demo.gif" alt="omalt-tab in Action" width="100%" style="border-radius: 12px; box-shadow: 0 16px 40px rgba(0,0,0,0.6);" />
</p>

*Spatial desktop switching in action — miniature workspace previews, home-row jumping, native window group tabs, and real-time app outlines.*

[**Features**](#-highlights--why-omalt-tab) • [**Visual Tour**](#-visual-tour) • [**Controls**](#-controls--keymap) • [**Installation**](#-installation--setup) • [**Makefile Reference**](#-makefile-reference) • [**Architecture**](#-architecture) • [**Testing**](#-automated-testing)

</div>

---

## ✦ Highlights & Why omalt-tab?

Most Linux Wayland task switchers either blindly iterate windows in an unstructured linear strip or trigger frantic focus changes on each keystroke. **omalt-tab** re-engineers window switching from first principles:

- ⚡ **Atomic, Race-Condition-Free Focus**:
  Clients and workspaces are snapshotted **once** in RAM when the overlay opens. Cycling through tasks updates only internal selection states — window focus history is **never mutated mid-cycle**. Focus is dispatched atomically only when you release <kbd>Alt</kbd> (or press <kbd>Enter</kbd>).
- 📑 **Native Hyprland Grouped Windows (Tabs)**:
  Full first-class support for Hyprland tabbed window groups. Renders an interactive tab bar atop grouped window tiles showing app icons for each tab member, preserves active tab focus, and enables seamless intra-group tab navigation via arrow keys.
- 🌊 **Dynamic Multi-Row Overflow (> 6 Workspaces)**:
  Workspaces dynamically overflow into a balanced two-row layout when more than 6 workspaces are active (`count > 6`), comfortably fitting all 10 desktops without horizontal squishing or microscopic preview cards.
- 🧱 **Organic Staggered Row Arrangement (Brickwork Pattern)**:
  Multi-row layouts are arranged in an organic brickwork / keyboard stagger (offset by half a card width, $0.5 \times \text{stepSize}$), ensuring cards in Row 2 are **never positioned directly beneath Row 1** while maintaining screen-centered symmetry.
- 🎯 **1.1x Sweet-Spot Sizing & Centralized Design Tokens (`js/Dimensions.js`)**:
  Layout, spacing, padding, badges, and typography are decoupled into pure metrics tokens scaled to the 1.1x "sweet spot" (~285px card width). Workspaces retain this ideal size regardless of whether 1, 6, 8, or 10 workspaces are active.
- ⌨ **Home-Row Workspace Jumping (`A`–`;`)**:
  Skip tedious sequential cycling. Every workspace (`1` through `10`) is mapped straight across your keyboard's home row (`A`, `S`, `D`, `F`, `G`, `H`, `J`, `K`, `L`, `;`). Press one key to jump across your desktop instantly.
- 🔢 **Direct Window Focus Badges (`1`–`9`)**:
  Every window within each workspace card renders a distinct numbered badge styled to match your active Omarchy theme. Hit `1`–`9` to immediately jump focus to that exact window without navigating.
- 🗂 **Miniature Desktop Spatial Previews**:
  Workspaces render miniature cards matching your display's true aspect ratio (16:9, 16:10, ultrawide). Window outlines reflect their genuine screen positions and sizes, with compensation for reserved top bars.
- 🖥 **Multi-Monitor Intelligent Placement**:
  Automatically resolves the currently active monitor and attaches the switcher overlay directly to that screen, normalizing window coordinates per monitor bounds.
- 🔒 **Hardened Security & Text Sanitization (`js/Utils.js`)**:
  Centralized defense against CVE Unicode bidirectional override spoofing (CVE RTL-override: U+200E, U+200F, U+202A–U+202E, U+2066–U+2069), control character injection, and rich-text disruption across all UI sinks with explicit `PlainText` formatting.
- 🛡 **Recursion-Safe Lifecycle Engine**:
  Guarded dismissal architecture (`isDismissing`) preventing mutual recursion between overlay closing and Omarchy shell hides. Window focus is safely dispatched via `QtObject` and `Quickshell.execDetached` before surface teardown.
- 🌌 **Empty Workspace Traversal**:
  Unpopulated workspaces between active desktops are automatically detected and presented as cleanly styled empty cards. Jump to an empty desktop with a single keystroke and release `Alt` to land directly on it.
- 🎨 **Reactive Omarchy Theme Binding**:
  Inherits active palette colors (`Color.menu`, `Color.accent`, `Color.foreground`), background scrim dimming, active typography (`Style.font.*`), and corner rounding (`Style.cornerRadius`) on the fly.
- 🚀 **Sub-Millisecond UNIX Domain Socket**:
  Communicates over a dedicated socket (`$XDG_RUNTIME_DIR/omalt-tab.sock`) with automatic fallback to Omarchy shell IPC for instant response times.
- 🛠 **Zero-Dirty Git Developer Mode**:
  Developer mode toggles dynamically via a gitignored `.dev` flag file. Switch between development and production without dirtying tracked files or triggering git diffs.

---

## 📸 Visual Tour

### Miniature Spatial Workspace Layout
<p align="center">
  <img src="demo/panel.png" alt="omalt-tab Close-up Interface" width="100%" style="border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);" />
</p>

- **Header Bar**: Displays active shortcut hints, jump keymaps, and dev badges.
- **Workspace Cards**: Scaled miniatures of each desktop containing proportional window outlines, high-res FreeDesktop application icons, and numbered badges (`1`–`9`).
- **Grouped Windows**: Windows sharing a Hyprland group render integrated tab bars with icons for each member, highlighting the active tab with accent borders.
- **Footer Bar**: Displays the currently focused window title (sanitized plain-text), executable class name, and switching action hint.

### Dynamic Multi-Row & Staggered Alignment (> 6 Workspaces)
When 7 to 10 workspaces are active, the switcher automatically splits into two rows:
- **Row 1**: Upper workspaces (e.g. 1–5).
- **Row 2**: Lower workspaces (e.g. 6–10), offset by a half-step ($0.5 \times \text{stepSize}$) in an organic brickwork pattern so cards are never stacked rigidly on top of each other.
- **2D Spatial Traversal**: Pressing <kbd>↑</kbd> and <kbd>↓</kbd> navigates smoothly between rows.

### Full-Desktop Scrim Dimming
<p align="center">
  <img src="demo/full.png" alt="omalt-tab Full Desktop Scrim" width="100%" style="border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);" />
</p>

*The background is gracefully dimmed with Omarchy's menu scrim, maintaining focus entirely on your task navigation.*

---

## 🎮 Controls & Keymap

### Primary Navigation

| Input | Action |
| :--- | :--- |
| <kbd>Alt</kbd> + <kbd>Tab</kbd> | Cycle next window in MRU (Most Recently Used) order |
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>Tab</kbd> | Cycle previous window in MRU order |
| **Release <kbd>Alt</kbd>** | **Commit selection and focus window immediately** (Production mode) |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Commit and focus selected window (Required in Dev mode; supported in both) |
| <kbd>Esc</kbd> / Click outside | Cancel switcher without changing window focus |

### Direct Jumping (Home Row & Numbers)

| Key | Target |
| :---: | :--- |
| <kbd>A</kbd> | Jump to **Workspace 1** |
| <kbd>S</kbd> | Jump to **Workspace 2** |
| <kbd>D</kbd> | Jump to **Workspace 3** |
| <kbd>F</kbd> | Jump to **Workspace 4** |
| <kbd>G</kbd> | Jump to **Workspace 5** |
| <kbd>H</kbd> | Jump to **Workspace 6** |
| <kbd>J</kbd> | Jump to **Workspace 7** |
| <kbd>K</kbd> | Jump to **Workspace 8** |
| <kbd>L</kbd> | Jump to **Workspace 9** |
| <kbd>;</kbd> | Jump to **Workspace 10** |
| <kbd>1</kbd> – <kbd>9</kbd> | Select window index **1** through **9** (or active group tab) in active workspace |

### Spatial & 2D Cursor Navigation

| Input | Action |
| :--- | :--- |
| <kbd>←</kbd> / <kbd>→</kbd> | Spatial navigation left / right across adjacent windows, workspaces, and intra-group tabs |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Spatial navigation up / down across stacked windows, intra-group tabs, and **between Row 1 & Row 2** |
| <kbd>Home</kbd> / <kbd>End</kbd> | Jump to first / last window in the MRU sequence |
| **Left Click Window** | Immediately focus and switch to clicked window |
| **Left Click Workspace** | Immediately jump to clicked workspace |

---

## 📦 Installation & Setup

### Method 1: Native Omarchy Plugin Manager (Recommended) (Upcoming after plugin release)

Install and enable `omalt-tab` directly from git:

```sh
omarchy plugin add https://github.com/codesmith28/omalt-tab.git --enable
```

### Method 2: Local Developer Setup (`make dev`)

For development, testing, or customizing:

```sh
git clone https://github.com/codesmith28/omalt-tab.git ~/Projects/omalt-tab
cd ~/Projects/omalt-tab
make dev
```

`make dev` sets up:
1. A development symlink in `~/.config/omarchy/plugins/io.github.codesmith28.omalt-tab`.
2. A gitignored `.dev` flag that enables **Dev Mode** (switcher stays open after releasing `Alt`, requiring `Enter` to switch, and showing the header `DEV` badge).
3. Automatic client binary symlinks and binding loader integration.

### Method 3: Clean Production Installation (`make prod`)

To install or restore standard release-to-switch behavior:

```sh
make prod
```

### Check Installation Status

Verify active mode, symlink targets, Omarchy plugin registration, and socket health anytime:

```sh
make status
```

### Remove

To fully uninstall `omalt-tab`, including keybindings and helper symlinks:

```sh
omarchy plugin remove io.github.codesmith28.omalt-tab
```

Or from the project directory for a complete cleanup (uses `omarchy plugin remove` under the hood):

```sh
make uninstall
```

---

## ⚙ Omarchy Keybindings Setup

Plugins in Omarchy live in `~/.config/omarchy/plugins/`. Ensure your Omarchy keybindings configuration (`~/.config/hypr/bindings.lua`) includes the plugin loader:

### Option A: Automatic Plugin Loader (Recommended)
Automatically loads `bindings.lua` from all installed Omarchy plugins:

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

### Option B: Explicit omalt-tab Loader
Source `omalt-tab` specifically from its installed directory:

```lua
local omalt_tab = os.getenv("HOME") .. "/.config/omarchy/plugins/io.github.codesmith28.omalt-tab/hypr/bindings.lua"
local f = io.open(omalt_tab, "r")
if f then
  f:close()
  dofile(omalt_tab)
end
```

---

## 🛠 Makefile Reference

`omalt-tab` includes a comprehensive Makefile for lifecycle management:

| Command | Action |
| :--- | :--- |
| `make dev` | Links project into Omarchy plugins, enables `.dev` mode, and reloads shell |
| `make prod` | Installs clean copy in standard production mode (release `Alt` to switch) |
| `make mode-dev` | Enables Dev Mode flag (`.dev`, gitignored) without touching tracked files |
| `make mode-prod` | Removes `.dev` flag file, restoring production mode |
| `make status` | Displays active mode, installation symlink state, socket status, and keybindings |
| `make test` | Executes automated Node.js unit tests for model, spatial logic, and navigation |
| `make validate` | Runs unit tests, manifest validation, client bash syntax, and lua syntax checks |
| `make restart` | Restarts Omarchy shell and reloads keybindings |
| `make update` | Syncs latest code changes and reloads the active environment |
| `make uninstall` | Runs `omarchy plugin remove`, cleans keybindings, and removes helper symlinks |

---

## 🏗 Architecture & Responsibilities

The codebase follows a clean separation of concerns across presentation, core algorithms, shell integration, and testing:

```
omalt-tab/
├── components/          # Modular QML visual presentation layer
├── js/                  # Decoupled core logic, design tokens, & security
├── hypr/                # Keybinding submaps & IPC client script
├── tests/               # Automated regression and logic unit tests (19 tests)
├── scripts/             # Management scripts for install, link, and validation
├── demo/                # Showcase recordings and high-resolution media
├── AltTabOverlay.qml    # Main shell overlay entry point & IPC coordinator
└── manifest.json        # Omarchy plugin manifest contract
```

### Directory Breakdown

- **`components/` (Presentation Layer)**:
  Modular QML components handling all UI layout and styling. Houses miniature desktop cards (`WorkspaceCard`), proportional window tiles with selection glow and tab bars (`WindowTile`), shortcut hint headers (`HeaderBar`), and window metadata footers with plain-text sinks (`FooterBar`).

- **`js/` (Core Logic Engine & Design System)**:
  Framework-agnostic JavaScript business logic decoupled from Qt Quick:
  - `WindowModel.js`: Snapshot parser with top menu bar compensation and Hyprland grouped window member detection.
  - `Navigation.js`: 2D spatial traversal across windows, intra-group tabs, multi-row workspaces, and MRU cycler.
  - `Dimensions.js`: Centralized layout tokens locked to the 1.1x sweet spot (~285px card width).
  - `Utils.js`: Centralized security utilities stripping Unicode direction overrides and control characters.
  - `Icons.js`: Dynamic FreeDesktop candidate generator and Web App / PWA desktop file resolver.
  - `Config.js`: Dynamic options for dev mode, badges, and debug logging.

- **`hypr/` (Keybindings & IPC Integration)**:
  Desktop hooks and IPC dispatching. Contains the Omarchy keybinding submap configuration with dynamic Alt-release watcher (`bindings.lua`) and the sub-millisecond UNIX domain socket client (`omalt-tab-client`).

- **`tests/` (Verification Suite)**:
  Automated Node.js regression test suite (`test_logic.js`) validating coordinate normalization math, spatial traversal algorithms, empty workspace handling, icon resolution fallbacks, grouped window tabs, multi-row overflow & stagger math, security sanitization, and dismissal recursion safety.

- **`demo/` (Showcase Media)**:
  High-resolution media assets including the lossless showcase animation (`demo.gif`) and desktop screenshots.

---

## 🧪 Automated Testing

All core snapshot parsing, empty workspace detection, home-row jumping, grouped window tabs, multi-row overflow, staggered row offsets, security sanitization, and lifecycle safety algorithms are rigorously unit-tested:

```sh
make test
```

### Test Suite Highlights (19 Tests)
- **Snapshot & Geometry**: Usable geometry normalization, menu-bar exclusion, multi-monitor bounds.
- **Grouped Windows**: Hyprland tab group detection, member extraction, and tab bar models.
- **Spatial Navigation**: 2D arrow traversal across windows, intra-group tabs, and row-to-row jumping (> 6 workspaces).
- **Multi-Row & Stagger**: Threshold from 6 overflow logic and half-card brickwork `staggerShift` calculations.
- **Security & Tokens**: CVE BiDi control character stripping, plain-text sinks, and pure token separation in `Dimensions.js`.
- **Lifecycle & Dismissal**: Circular recursion prevention on `shell.hide()` and atomic `focusWindow()` dispatching.

To run the full validation suite (manifest validation, bash syntax checks, lua syntax checks, unit tests):

```sh
make validate
```

---

## 📄 License

Distributed under the [Apache-2.0 License](LICENSE).  
Created and maintained by **Sarthak Siddhpura**.
