# Architecture / 架构

> Audience: contributors who want to understand *why* the project is shaped the way it is.

## High-level diagram / 总体架构

```
            ┌────────────────────────────────────────┐
            │            USER (Windows)              │
            └────────────────────┬───────────────────┘
                                 │ double-click .exe
                                 ▼
            ┌────────────────────────────────────────┐
            │        Electron Main Process           │
            │             (main.js)                  │
            │  ────────────────────────────────      │
            │  • readSettings() → JSON file          │
            │  • createSplash() → splash.html        │
            │  • startDsh() → spawn child proc       │
            │  • waitForDshReady() → poll :3080      │
            │  • createWindow() → main BrowserWindow │
            │  • registerGlobalShortcuts()           │
            │  • createTray()                        │
            │  • logBuffer (1000-line ring)          │
            │  • ipcMain handlers (24 channels)      │
            └──────┬──────────────────────────┬──────┘
                   │                          │
       spawn       │                          │ loadFile()
                   ▼                          ▼
       ┌────────────────────┐      ┌──────────────────────────┐
       │  dsh child proc    │      │  Main BrowserWindow      │
       │  (cmd /c dsh web)  │      │      (index.html)        │
       │  localhost:3080    │      │  ────────────────────    │
       └────────┬───────────┘      │  • title bar (36px)      │
                │                  │  • iframe → dsh Web UI   │
                │ HTTP             │  • command palette       │
                └─────────┼───────▶│  • about / log / path    │
                          │        │    modals                │
                          │        └──────────┬───────────────┘
                          │                   │ IPC bridge
                          │                   │ (preload.js)
                          │                   ▼
                          │        ┌──────────────────────┐
                          │        │    window.dsh API    │
                          │        │   (exposed to JS)    │
                          │        └──────────────────────┘
                          │
                          ▼
                  ┌───────────────────┐
                  │  System Tray      │
                  │  (right-click →   │
                  │   context menu)   │
                  └───────────────────┘
```

## Why an Electron wrapper? / 为什么要用 Electron 包一层?

dsh already ships a Web UI on `localhost:3080`. We could just open Chrome to it.
But:

- ❌ Chrome doesn't auto-spawn dsh; the user has to start it manually first.
- ❌ Chrome can't kill dsh on close → port 3080 leaks.
- ❌ No native notifications, tray, global shortcuts, file dialogs, window memory.
- ❌ Can't be packaged as a single .exe.

Electron gives us all of that with ~600 lines of glue code.

## Process model

dsh-client uses the classic **two-process** Electron model:

| Process | File | Role |
|---------|------|------|
| Main | `main.js` | Node.js context. Owns the BrowserWindow, spawns dsh, exposes IPC, owns tray. |
| Renderer | `index.html` + `preload.js` | Sandboxed Chromium context. Loads our custom shell, embeds dsh via `<iframe>`, handles UI. |
| Splash | `splash.html` | A second BrowserWindow with no chrome — shown until dsh is ready. |

The renderer and main never share memory; they talk exclusively through `ipcMain.handle` (request/reply) and `webContents.send` (push).

## Security stance

| Concern | Mitigation |
|---------|------------|
| `nodeIntegration` in renderer | **Off.** Renderer is plain Chromium. |
| `contextIsolation` | **On.** Each renderer gets a clean JS context. |
| Preload script | The *only* place that touches `ipcRenderer`. Exposes a typed, minimal API via `contextBridge.exposeInMainWorld`. |
| Iframe sandbox | dsh runs in an `<iframe sandbox="allow-scripts allow-same-origin ...">` so a bug in dsh can't reach our preload. |
| CSP | `default-src 'self' http://127.0.0.1:3080 ws://127.0.0.1:3080; ...` |
| External links | `setWindowOpenHandler` denies them and routes to `shell.openExternal`. |

## State management

We deliberately avoid Redux / Zustand / etc. State lives in three places:

1. **Files on disk** — `userData/dsh-client-settings.json` (theme, dsh paths, window bounds).
2. **In-memory ring buffer** — last 1000 log lines, exposed via IPC.
3. **`nativeTheme`** — single source of truth for theme; the renderer just observes it.

## Lifecycle

```
app.whenReady()
  │
  ├── createSplash()                         ┐
  │   sendToSplash({phase: 'init'})          │ user sees splash
  │                                           │
  ├── detect dsh path                        │
  │   if missing → dialog.showMessageBox()  │ user picks path
  │                                           │
  ├── startDsh() → spawn child proc         │
  │   sendToSplash({phase: 'starting'})      │
  │                                           │
  ├── waitForDshReady()  (poll :3080)       │
  │   sendToSplash({phase: 'waiting', ...})  │
  │                                           │
  ├── createWindow()                         │
  │   loadFile('index.html')                 │
  │   win.once('ready-to-show')              │
  │     → win.show()                         │
  │     → destroySplash()                    ┘
  │
  ├── createTray()
  │
  └── registerGlobalShortcuts()

app.on('window-all-closed')
  └── if !darwin → app.quit() (after killDsh)

app.on('before-quit')
  └── app.isQuiting = true  (so close → real quit, not hide)
```

## IPC channel inventory

### Main → Renderer (push)

| Channel | Payload | Purpose |
|---------|---------|---------|
| `dsh:theme-changed` | `'dark' \| 'light'` | Theme changed (system or user). |
| `dsh:screenshot-saved` | `{ filePath } \| { error }` | Screenshot result. |
| `dsh:trigger-screenshot` | none | Global shortcut fired, ask renderer to start. |
| `dsh:open-command-palette` | none | Tray / shortcut → open palette. |
| `dsh:open-about` | none | Tray / shortcut → open about modal. |
| `dsh:open-log-viewer` | none | Tray / shortcut → open log viewer. |
| `dsh:update-available` | none | electron-updater stub. |
| `dsh:update-downloaded` | none | electron-updater stub. |

### Renderer → Main (invoke / handle)

| Channel | Args | Returns |
|---------|------|---------|
| `dsh:getVersion` | — | string |
| `dsh:reload` / `hide` / `minimize` / `quit` | — | void |
| `dsh:openInBrowser` | — | void |
| `dsh:open-external` | url | bool |
| `dsh:getTheme` / `toggleTheme` / `setTheme` | — / theme | string |
| `dsh:reloadDsh` | — | true |
| `dsh:takeScreenshot` | — | filePath \| null |
| `dsh:checkUpdate` | — | updateInfo |
| `dsh:getAbout` | — | AboutInfo |
| `dsh:getSettings` | — | Settings |
| `dsh:setDshPath` | `{ bin, cwd }` | `{ ok, settings }` |
| `dsh:pickDshPath` / `dsh:pickDshCwd` | — | `{ ok, bin?, cwd? }` |
| `dsh:getLogs` | — | `{ buffer, size, total }` |
| `dsh:clearLogs` | — | `{ ok }` |

## Module boundaries

```
main.js  (everything that needs Node + Electron)
   │
   ├── settings.js  (conceptual — currently inline: readSettings/writeSettings)
   ├── logBuffer    (conceptual — currently inline: appendLog + ring buffer)
   ├── splash       (createSplash / sendToSplash / destroySplash)
   └── bounds       (loadSavedBounds / saveBounds)

preload.js  (the ONLY file allowed to require ipcRenderer)

index.html  (the ONLY file that talks to window.dsh)
   │
   ├── ui/  titlebar, status pill
   ├── modals/  palette, about, logs, path picker
   └── keybinds/  global keydown handler
```

These boundaries are conventions, not enforced by tooling. Keep them.

## Why no React / Vue / Svelte?

The renderer is ~600 lines of vanilla JS. Adding a framework would:

- Force a build step (Vite / webpack) just to ship.
- Pull in 100s of KB of runtime.
- Make the CSP harder to write (no `unsafe-eval`).

Vanilla JS + a thin `const $ = id => ...` helper is faster, smaller, and easier to audit.

If/when the renderer exceeds ~2000 lines, revisit.
