// src/ipc-handlers.js
// All `ipcMain.handle(...)` registrations, factored out of main.js.
// Wiring is injected via `deps`, so the function is testable in isolation
// with a mocked `ipcMain`.

'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Register every IPC handler this app exposes.
 *
 * @param {object} deps
 * @param {object} deps.ipcMain     - electron.ipcMain (or a mock)
 * @param {object} deps.app         - electron.app
 * @param {object} deps.shell       - electron.shell
 * @param {object} deps.dialog      - electron.dialog
 * @param {object} deps.nativeTheme - electron.nativeTheme
 * @param {object} deps.logger      - logger instance from src/logger.js
 * @param {object} deps.settings    - Settings instance from src/settings.js
 * @param {object} deps.dshPath     - src/dsh-path.js helpers
 * @param {object} deps.runtime     - live runtime state, see below
 *
 * `runtime`:
 *   - getMainWindow() -> BrowserWindow | null
 *   - sendToRenderer(channel, payload)
 *   - reloadDshProcess()
 *   - takeScreenshotToDisk()
 *   - refreshTrayMenu()
 *
 * Returns a list of channel names that were registered (handy for tests).
 */
function registerIpcHandlers(deps) {
  const {
    ipcMain, app, shell, dialog, nativeTheme,
    logger, settings, dshPath,
    runtime = {},
  } = deps;

  const {
    getMainWindow = () => null,
    sendToRenderer = () => {},
    reloadDshProcess = () => {},
    takeScreenshotToDisk = () => {},
    refreshTrayMenu = () => {},
  } = runtime;

  const registered = [];

  function handle(channel, fn) {
    ipcMain.handle(channel, fn);
    registered.push(channel);
  }

  handle('dsh:getVersion', () => app.getVersion());

  handle('dsh:getAbout', () => {
    const apiKey = dshPath.readApiKey();
    const { bin, cwd } = dshPath.resolveDshPaths(settings.all());
    return {
      name: app.getName(),
      productName: 'DeepSeek Harness',
      version: app.getVersion(),
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
      platform: `${os.type()} ${os.release()} (${os.arch()})`,
      dshBin: bin,
      dshBinExists: fs.existsSync(bin),
      dshCwd: cwd,
      apiKeySet: !!apiKey,
      apiKeyMasked: dshPath.maskApiKey(apiKey),
      repoUrl: 'https://github.com/deepseek-ai/deepseek-harness',
      clientRepoUrl: 'https://github.com/yourname/dsh-client',
    };
  });

  handle('dsh:open-external', (_e, url) => {
    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
      shell.openExternal(url);
      return true;
    }
    return false;
  });

  handle('dsh:reload', () => {
    const win = getMainWindow();
    if (win) win.webContents.reload();
  });
  handle('dsh:hide', () => {
    const win = getMainWindow();
    if (win) win.hide();
  });
  handle('dsh:minimize', () => {
    const win = getMainWindow();
    if (win) win.minimize();
  });
  handle('dsh:quit', () => {
    app.isQuiting = true;
    app.quit();
  });
  handle('dsh:openInBrowser', () => shell.openExternal('http://127.0.0.1:3080'));

  handle('dsh:getTheme', () => (nativeTheme.shouldUseDarkColors ? 'dark' : 'light'));

  function applyTheme(theme) {
    const dark = theme === 'dark';
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.setBackgroundColor(dark ? '#0A2540' : '#FFFFFF');
      if (typeof win.setTitleBarOverlay === 'function') {
        win.setTitleBarOverlay({
          color: dark ? '#0A2540' : '#FFFFFF',
          symbolColor: dark ? '#ffffff' : '#1F2937',
          height: 36,
        });
      }
    }
  }

  handle('dsh:toggleTheme', () => {
    const next = nativeTheme.shouldUseDarkColors ? 'light' : 'dark';
    nativeTheme.themeSource = next;
    settings.set({ theme: next });
    sendToRenderer('dsh:theme-changed', next);
    applyTheme(next);
    refreshTrayMenu();
    return next;
  });

  handle('dsh:setTheme', (_e, theme) => {
    if (theme !== 'dark' && theme !== 'light') return null;
    nativeTheme.themeSource = theme;
    settings.set({ theme });
    sendToRenderer('dsh:theme-changed', theme);
    applyTheme(theme);
    return theme;
  });

  handle('dsh:reloadDsh', () => { reloadDshProcess(); return true; });

  handle('dsh:takeScreenshot', async () => takeScreenshotToDisk());

  handle('dsh:getSettings', () => settings.all());

  handle('dsh:setDshPath', (_e, payload) => {
    if (typeof payload !== 'object' || !payload) return { ok: false, error: 'invalid payload' };
    const { bin, cwd } = payload;
    const patch = {};
    if (typeof bin === 'string' && bin.trim()) patch.dshBin = bin.trim();
    if (typeof cwd === 'string' && cwd.trim()) patch.dshCwd = cwd.trim();
    settings.set(patch);
    return { ok: true, settings: settings.all() };
  });

  handle('dsh:pickDshPath', async () => {
    const { bin, cwd } = dshPath.resolveDshPaths(settings.all());
    const startDir = fs.existsSync(cwd) ? cwd : path.dirname(bin);
    const win = getMainWindow();
    const r = await dialog.showOpenDialog(win || undefined, {
      title: '选择 dsh 可执行文件 (例如 dsh.cmd / dsh / dsh.exe)',
      defaultPath: startDir,
      properties: ['openFile'],
      filters: [
        { name: 'Executables & Scripts', extensions: ['cmd', 'exe', 'bat', 'sh', 'js'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (r.canceled || !r.filePaths || !r.filePaths[0]) return { ok: false, canceled: true };
    const chosen = r.filePaths[0];
    settings.set({ dshBin: chosen, dshCwd: path.dirname(chosen) });
    return { ok: true, bin: chosen, cwd: path.dirname(chosen) };
  });

  handle('dsh:pickDshCwd', async () => {
    const { cwd } = dshPath.resolveDshPaths(settings.all());
    const startDir = fs.existsSync(cwd) ? cwd : app.getPath('home');
    const win = getMainWindow();
    const r = await dialog.showOpenDialog(win || undefined, {
      title: '选择 dsh 工作目录',
      defaultPath: startDir,
      properties: ['openDirectory'],
    });
    if (r.canceled || !r.filePaths || !r.filePaths[0]) return { ok: false, canceled: true };
    settings.set({ dshCwd: r.filePaths[0] });
    return { ok: true, cwd: r.filePaths[0] };
  });

  handle('dsh:getLogs', () => logger.snapshot());

  handle('dsh:clearLogs', () => {
    logger.clear();
    return { ok: true };
  });

  handle('dsh:checkUpdate', async () => ({
    currentVersion: app.getVersion(),
    updateAvailable: false,
    checkedAt: new Date().toISOString(),
    source: 'local-stub',
  }));

  return registered;
}

module.exports = { registerIpcHandlers };
