# dsh-client — screenshots / 截图

This directory holds screenshots used in the README and docs.

## Capturing screenshots

The project ships an Electron `BrowserWindow.capturePage()` helper that we use for the in-app screenshot tool (`Ctrl+Shift+S`). To capture **the README hero shots** specifically:

### Option 1 — manual

1. `npm start` to launch dsh-client.
2. Resize to a clean 1600×1000.
3. Press `Ctrl+Shift+S` and save into this folder as `screenshot-light.png` / `screenshot-dark.png`.
4. Repeat with the alternate theme (`Ctrl+Shift+T`).

### Option 2 — automated (recommended)

Run the helper script:

```bash
node docs/screenshot-script.js
```

It will:

1. Launch a hidden Electron window pointing at `index.html`.
2. Inject a mock `dshFrame` (so no real dsh backend is needed).
3. Capture both light and dark themes.
4. Write `screenshot-light.png` and `screenshot-dark.png` here.

## Currently

| File | Status |
|------|--------|
| `screenshot-light.png` | ⏳ TODO — capture manually or run `screenshot-script.js` |
| `screenshot-dark.png`  | ⏳ TODO — capture manually or run `screenshot-script.js` |
| `palette.png`          | ⏳ TODO — open palette, then capture |
| `log-viewer.png`       | ⏳ TODO — open log viewer, then capture |
| `about.png`            | ⏳ TODO — open about modal, then capture |

Pull requests that add real screenshots are very welcome. 🎨
