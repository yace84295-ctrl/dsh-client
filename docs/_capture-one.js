// docs/_capture-one.js — single Electron capture run via child_process
// Args: JSON variant object
'use strict';

const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, nativeTheme } = require('electron');

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.disableHardwareAcceleration();

const variant = JSON.parse(process.argv[2]);
const OUT_DIR = path.join(__dirname, 'screenshots');
const INDEX = path.join(__dirname, '..', 'index.html');

async function main() {
  nativeTheme.themeSource = variant.theme;
  await new Promise((r) => setTimeout(r, 300));
  const win = new BrowserWindow({
    width: 1600,
    height: 1000,
    show: false,
    backgroundColor: variant.theme === 'dark' ? '#0A2540' : '#FFFFFF',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  await win.loadFile(INDEX);
  await new Promise((r) => setTimeout(r, 1200));

  // The iframe normally points at http://127.0.0.1:3080 which may or may not
  // be running. Force it to about:blank so screenshots show the chrome UI
  // predictably across machines.
  await win.webContents.executeJavaScript(`
    (function() {
      const f = document.getElementById('dshFrame');
      if (f && f.src && !f.src.endsWith('about:blank')) {
        // Save the original src so a renderer (main.js) could restore it.
        f.dataset.originalSrc = f.src;
        f.src = 'about:blank';
      }
    })();
  `);
  await new Promise((r) => setTimeout(r, 200));

  if (variant.theme === 'light') {
    await win.webContents.executeJavaScript(`
      document.body.dataset.theme = 'light';
      document.documentElement.dataset.theme = 'light';
    `);
    await new Promise((r) => setTimeout(r, 200));
  }

  if (variant.openPalette) {
    await win.webContents.executeJavaScript(`
      (function() {
        const el = document.getElementById('commandPalette');
        if (el) {
          el.hidden = false;
          el.removeAttribute('hidden');
          el.style.display = 'flex';
          el.style.visibility = 'visible';
          el.style.zIndex = '9999';
          const inp = document.querySelector('#commandPalette input[type="text"], #commandPalette input');
          if (inp) {
            inp.focus();
            inp.value = 'theme';
            inp.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      })();
    `);
    await new Promise((r) => setTimeout(r, 700));
  }

  if (variant.openAbout) {
    await win.webContents.executeJavaScript(`
      (function() {
        const el = document.getElementById('aboutModal');
        if (el) {
          el.hidden = false;
          el.removeAttribute('hidden');
          const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
          set('aboutVersion', '0.3.0');
          set('aboutElectron', '32.2.0');
          set('aboutNode', '22.x');
          set('aboutChrome', '128.x');
          set('aboutPlatform', 'Windows 11 x64');
          set('aboutDshBin', 'C:/Users/.../dsh.cmd');
          set('aboutDshCwd', 'C:/Users/.../dsh-scratch');
          set('aboutApiKey', 'sk-1234…cdef');
        }
      })();
    `);
    await new Promise((r) => setTimeout(r, 800));
  }

  const image = await win.webContents.capturePage();
  fs.writeFileSync(path.join(OUT_DIR, `${variant.name}.png`), image.toPNG());
  console.log(`✓ wrote ${variant.name}.png`);
}

app.whenReady().then(main).then(() => app.quit()).catch((err) => {
  console.error(err);
  app.quit();
});