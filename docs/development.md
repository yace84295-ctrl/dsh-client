# Development Guide / 开发指南

This guide is for contributors who want to **run dsh-client locally** and **iterate quickly**.

## Prerequisites

- **Node.js 22+** — [download](https://nodejs.org/)
- **npm 10+** (ships with Node 22)
- **Windows 10 / 11** for native testing (the build target is Windows-only, but the source is portable Electron)
- **dsh** — install globally or in a scratch directory:
  ```bash
  mkdir dsh-scratch && cd dsh-scratch
  npm init -y
  npm i deepseek-harness
  ```
- **DeepSeek API key** — set `%APPDATA%\dsh-client\.env` (or `DSH_ENV_FILE`):
  ```env
  DEEPSEEK_API_KEY=sk-...
  ```

## First-time setup

```bash
git clone https://github.com/yace84295-ctrl/dsh-client.git
cd dsh-client
npm install            # downloads Electron (~200 MB) and electron-builder
npm start              # launches Electron in dev mode
```

On first launch:
1. The splash screen appears.
2. If the default dsh path is missing, a dialog appears asking you to pick one.
3. The main window opens, embedding the dsh Web UI from `localhost:3080`.

## Hot-reload workflow

`npm start` launches Electron pointing at the source on disk, so:

- Edit `main.js` → **restart** (`Ctrl+C`, then `npm start` again) to pick up changes. The Electron window reloads.
- Edit `index.html` / `styles.css` / `splash.html` → **no restart needed**: press `Ctrl+R` inside the dsh-client window to reload the renderer.
- Edit `preload.js` → **must restart** (`Ctrl+C`, then `npm start`) — preload scripts don't hot-reload.

> Tip: while debugging, run with `ELECTRON_ENABLE_LOGGING=1` to surface renderer console logs in the terminal:
>
> ```bash
> ELECTRON_ENABLE_LOGGING=1 npm start
> ```

## Project layout

```
dsh-client/
├── main.js              # Main process (Node + Electron)
├── preload.js           # IPC bridge (the only place that uses ipcRenderer)
├── index.html           # Renderer UI (vanilla JS + DOM)
├── styles.css           # All styling; theme variables at top
├── splash.html          # Standalone splash window
├── package.json         # Deps + electron-builder config
├── build.bat            # Windows one-click build
├── eslint.config.js     # Flat-config ESLint
├── .prettierrc.json     # Prettier config
├── .editorconfig        # Cross-editor defaults
├── .github/             # CI workflows + issue / PR templates
├── docs/                # Architecture, shortcuts, this file
└── dist/                # Build output (gitignored)
```

## Adding a new IPC channel

Three steps, every time:

1. **Main process** — add to `main.js`:
   ```js
   ipcMain.handle('dsh:myNewThing', (_e, payload) => {
     // ...do work...
     return result;
   });
   ```
2. **Preload** — expose via `preload.js`:
   ```js
   myNewThing: (payload) => ipcRenderer.invoke('dsh:myNewThing', payload),
   ```
3. **Renderer** — call from `index.html`:
   ```js
   const result = await window.dsh.myNewThing({ foo: 1 });
   ```

Always:
- Validate `payload` (type-check; reject malformed input).
- Return a value (or `null` / `false` on failure — never throw into the renderer unless you really mean to).
- Update the **IPC channel inventory** in [`docs/architecture.md`](architecture.md).

## Adding a global shortcut

In `main.js` → `registerGlobalShortcuts()`:

```js
tryReg('CommandOrControl+Shift+N', () => {
  sendToRenderer('dsh:myNewShortcut');
});
```

Then handle the push in the renderer:

```js
// index.html
window.dsh.onMyNewShortcut = (cb) => {
  ipcRenderer.on('dsh:my-new-shortcut', () => cb());
};
```

> Always wrap registration in `tryReg`. If it fails (another app owns the binding), Electron returns `false` — your handler will just never fire, but the app keeps running.

## Adding a CSS theme variable

If you find yourself hard-coding a color, stop and add a variable to `styles.css`:

```css
:root {
  --my-new-color: #abc;
}
[data-theme="dark"] {
  --my-new-color: #def;
}
```

Then in your component:

```css
.my-component { color: var(--my-new-color); }
```

## Building

```bash
# Dev launch
npm start

# Portable single-file .exe (~92 MB)
npm run build:portable

# NSIS installer
npm run build:nsis

# Just unpack to dist/win-unpacked/ (fast, for debugging the bundle)
npm run pack
```

Output lives in `dist/`. The portable .exe is fully self-contained — copy it anywhere and double-click.

## CI / CD

GitHub Actions:

- [`build.yml`](../.github/workflows/build.yml) — runs on every push to `main` and every PR. Lints, syntax-checks, builds, uploads artifact.
- [`release.yml`](../.github/workflows/release.yml) — runs on `v*.*.*` tags. Builds and creates a draft GitHub Release with the portable .exe attached.
- [`lint.yml`](../.github/workflows/lint.yml) — quick lint pass.

To enable auto-update, set the GitHub repo in `package.json`'s `build.publish`:

```json
"publish": [{ "provider": "github", "owner": "yace84295-ctrl", "repo": "dsh-client" }]
```

then set `DSH_AUTO_UPDATE=1` in your build env.

## Debugging tips

| Problem | Try |
|---------|-----|
| Renderer won't load | Open DevTools (`Ctrl+Shift+I`), check console. |
| dsh won't start | Open log viewer (`Ctrl+Shift+L`), look for `[dsh:err]` lines. |
| Tray icon missing | Check `icon.ico` exists in the project root. |
| Port 3080 in use | `taskkill /f /im node.exe` (kill orphaned dsh), then restart. |
| Build artifact is huge | Set `ELECTRON_BUILDER_COMPRESSION_LEVEL=9` for tighter compression (~73 MB). |
| Window opens off-screen | Delete `userData/dsh-client-settings.json` to reset bounds. |

## Releasing a new version

For maintainers:

1. Bump `version` in `package.json` (follow [semver](https://semver.org/)).
2. Move `[Unreleased]` items in [CHANGELOG.md](../CHANGELOG.md) into a new dated section.
3. Commit + push to `main`.
4. `git tag -a vX.Y.Z -m "vX.Y.Z"` and `git push --tags`.
5. The `release.yml` workflow will create a draft GitHub Release with the .exe attached.
6. Edit the release notes (the workflow adds a default body) and publish.

## Code review checklist

Before sending a PR, run through this list:

- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] `npm run format` was run
- [ ] `npm run build:portable` succeeds on Windows
- [ ] Manual smoke test: `npm start` → window opens → command palette works → log viewer works
- [ ] CHANGELOG.md updated under `[Unreleased]`
- [ ] No `console.log` calls left behind (use `console.error` for expected errors, `console.warn` for recoverable issues)
- [ ] No new deps added without justification
- [ ] If you added an IPC channel, updated `docs/architecture.md`

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](../LICENSE).
