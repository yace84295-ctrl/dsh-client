// docs/screenshot-script.js
// Generate README hero screenshots without needing a live dsh backend.
//
// Usage:  node docs/screenshot-script.js
// Output: docs/screenshots/screenshot-light.png
//         docs/screenshots/screenshot-dark.png

'use strict';

const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, nativeTheme } = require('electron');

const OUT_DIR = path.join(__dirname, 'screenshots');

async function captureTheme(theme) {
  nativeTheme.themeSource = theme;
  const win = new BrowserWindow({
    width: 1600,
    height: 1000,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  await win.loadFile(path.join(__dirname, '..', 'index.html'));
  // Wait for layout to settle
  await new Promise(r => setTimeout(r, 600));
  const image = await win.webContents.capturePage();
  const outPath = path.join(OUT_DIR, `screenshot-${theme}.png`);
  fs.writeFileSync(outPath, image.toPNG());
  console.log(`✓ wrote ${outPath}`);
  win.close();
}

app.whenReady().then(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await captureTheme('light');
  await captureTheme('dark');
  app.quit();
});
