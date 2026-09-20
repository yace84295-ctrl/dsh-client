# Keyboard Shortcuts / 快捷键速查表

> All shortcuts work in **both English and Chinese** — the project uses `CmdOrCtrl` internally so Windows + Linux users get `Ctrl`, macOS gets `Cmd`.

## Global (work even when window is hidden)

| Shortcut | Action | Notes |
|----------|--------|-------|
| `Ctrl+Shift+D` | Show / hide main window | Toggles visibility. |
| `Ctrl+Shift+R` | Restart dsh subprocess + reload window | Uses `taskkill /f /t` on Windows. |
| `Ctrl+Shift+Q` | Fully quit (kills dsh) | No confirmation prompt. |
| `Ctrl+Shift+S` | Trigger screenshot | Renderer pops the save dialog. |
| `Ctrl+Shift+T` | Toggle theme | Dark ↔ light. |
| `Ctrl+Shift+L` | Open log viewer | New in v0.3.0. |

> **Note:** If a global shortcut fails to register (taken by another app), the failure is logged but does **not** crash. The corresponding toolbar button still works.

## Window-focused (work only when dsh-client has focus)

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open command palette |
| `Ctrl+Shift+P` | Open command palette (alias, matches VS Code) |
| `Ctrl+R` | Reload dsh Web UI (iframe only, does not kill dsh) |
| `Ctrl+F` | Focus log search box (opens log viewer if not open) |
| `Ctrl+Shift+I` | Open DevTools (Electron default, not bound by us) |
| `Esc` | Close topmost modal (palette / about / logs / path) |
| `F11` | Toggle fullscreen (Electron default) |
| `Alt+F4` / window `✕` | Hide to tray (does **not** quit) |

## Command palette quick reference

The command palette (Ctrl+K) is the **fastest way** to access every action. Type to filter:

| Fuzzy match | Command |
|-------------|---------|
| `theme` / `主题` (via pinyin) | Toggle theme |
| `shot` / `截图` | Take screenshot |
| `reload` | Reload dsh Web UI |
| `restart` / `reloaddsh` | Restart dsh subprocess |
| `update` | Check for updates |
| `browser` | Open dsh in system browser |
| `hide` | Hide window to tray |
| `minimize` | Minimize window |
| `logs` / `log` | Open log viewer |
| `path` | Open dsh path settings |
| `about` | Open About dialog |
| `quit` / `退出` | Fully quit |

## Tray menu (right-click the tray icon)

- 显示/隐藏窗口 (`Ctrl+Shift+D`)
- 命令面板 (`Ctrl+K`)
- 截图 (`Ctrl+Shift+S`)
- 切换主题 (`Ctrl+Shift+T`)
- ──────────
- 查看日志…
- 重新加载 dsh (`Ctrl+Shift+R`)
- 在浏览器中打开 dsh
- ──────────
- 快捷键 (submenu — display only)
- ──────────
- 关于…
- 退出 (`Ctrl+Shift+Q`)

## Customizing shortcuts

Currently shortcuts are **not user-rebindable** from the UI (planned for a future release). If you need to free up a binding:

1. Open `main.js`.
2. Edit the `tryReg('CommandOrControl+Shift+X', ...)` calls inside `registerGlobalShortcuts()`.
3. Rebuild with `npm run build:portable`.

If you only want to disable a shortcut, comment out the corresponding `tryReg(...)` line.

## Conflict resolution

Electron's `globalShortcut.register()` returns `false` (and we log a warning) if the OS already has the binding for another app. If a shortcut seems to "do nothing":

1. Close other apps that might own it (chat apps often claim `Ctrl+Shift+S`, `Ctrl+Shift+D`).
2. Open Windows Settings → Apps → Startup to disable background apps.
3. Check the main-process log (in our log viewer: `Ctrl+Shift+L`) for `global shortcuts FAILED: ...`.
