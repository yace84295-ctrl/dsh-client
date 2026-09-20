// dsh-client main process
// Launches dsh as a child process (localhost:3080), waits for it,
// opens a frameless BrowserWindow that embeds the dsh Web UI,
// and provides a tray icon for quick access.
//
// v0.3.0 — adds:
//   - Command palette (Ctrl+K / Ctrl+Shift+P)
//   - About dialog with versions
//   - Splash screen with progress
//   - Custom dsh path detection + settings
//   - Window position/size memory
//   - In-app log viewer (ring buffer)
//   - electron-store-style JSON settings
//   - "open-external" IPC for the about dialog link

const { app, BrowserWindow, ipcMain, shell, Tray, Menu, dialog, nativeTheme, globalShortcut, nativeImage, screen } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');

// ---------------------------------------------------------------------------
// Paths & config (overridable via env for portability)
// ---------------------------------------------------------------------------
const DEFAULT_DSH_BIN  = 'C:/Users/111/dsh-scratch/node_modules/.bin/dsh.cmd';
const DEFAULT_DSH_CWD  = 'C:/Users/111/dsh-scratch';
const ENV_FILE         = process.env.DSH_ENV_FILE || 'C:/Users/111/AppData/Local/hermes/.env';
const DSH_URL          = 'http://127.0.0.1:3080';
const DSH_PORT         = 3080;
const READY_TIMEOUT_MS = 60000;

// ---------------------------------------------------------------------------
// Persisted user settings — plain JSON next to userData.
// ---------------------------------------------------------------------------
const SETTINGS_FILE = path.join(app.getPath('userData'), 'dsh-client-settings.json');

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  } catch (_) {
    return {};
  }
}

function writeSettings(patch) {
  const cur = readSettings();
  const next = { ...cur, ...patch };
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(next, null, 2));
  } catch (e) {
    console.error('[dsh-client] settings write failed:', e.message);
  }
  return next;
}

// Resolved dsh paths (settings override defaults).
function getDshPaths() {
  const s = readSettings();
  return {
    bin: s.dshBin || process.env.DSH_BIN || DEFAULT_DSH_BIN,
    cwd: s.dshCwd || process.env.DSH_CWD || DEFAULT_DSH_CWD,
  };
}

// ---------------------------------------------------------------------------
// Ring-buffer log store — keeps the last 1000 lines of dsh-client + dsh output
// ---------------------------------------------------------------------------
const LOG_BUFFER_SIZE = 1000;
const logBuffer = [];
function appendLog(level, line) {
  const stamp = new Date().toISOString().replace('T', ' ').replace('Z', '');
  const entry = `[${stamp}] [${level}] ${line.replace(/\r?\n$/, '')}`;
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_SIZE) logBuffer.splice(0, logBuffer.length - LOG_BUFFER_SIZE);
}

// Patch console.log/error/warn to also feed the ring buffer.
const _origLog   = console.log.bind(console);
const _origErr   = console.error.bind(console);
const _origWarn  = console.warn.bind(console);
console.log   = (...a) => { _origLog(...a);   appendLog('info', a.map(String).join(' ')); };
console.error = (...a) => { _origErr(...a);   appendLog('error', a.map(String).join(' ')); };
console.warn  = (...a) => { _origWarn(...a);  appendLog('warn',  a.map(String).join(' ')); };

// ---------------------------------------------------------------------------
// API key loader — read from .env, never hardcode
// ---------------------------------------------------------------------------
function readApiKey() {
  try {
    const env = fs.readFileSync(ENV_FILE, 'utf8');
    const m = env.match(/^DEEPSEEK_API_KEY\s*=\s*(.+)$/m);
    return m ? m[1].trim() : '';
  } catch (e) {
    console.error('[dsh-client] .env read failed:', e.message);
    return '';
  }
}

// ---------------------------------------------------------------------------
// Single-instance lock — avoid two clients fighting over port 3080
// ---------------------------------------------------------------------------
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Child-process management
// ---------------------------------------------------------------------------
let dshProcess = null;

function killDsh() {
  if (dshProcess && !dshProcess.killed) {
    try {
      // On Windows, spawn taskkill to make sure the whole cmd.exe tree dies,
      // otherwise the .cmd wrapper can hang around holding the port.
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(dshProcess.pid), '/f', '/t'], { windowsHide: true });
      } else {
        dshProcess.kill();
      }
    } catch (e) {
      console.error('[dsh-client] kill error:', e.message);
    }
    dshProcess = null;
  }
}

function startDsh() {
  const { bin, cwd } = getDshPaths();
  const apiKey = readApiKey();
  if (!apiKey) {
    dialog.showErrorBox(
      'DEEPSEEK_API_KEY 未找到',
      `请在 ${ENV_FILE} 中设置 DEEPSEEK_API_KEY=...`
    );
  }

  if (!fs.existsSync(bin)) {
    const msg = `dsh 二进制不存在: ${bin}\n请在设置中重新选择路径,或安装 dsh: npm i -g deepseek-harness`;
    console.error('[dsh-client] ' + msg);
    sendToSplash({ phase: 'error', message: msg });
    return false;
  }
  if (!fs.existsSync(cwd)) {
    const msg = `dsh 工作目录不存在: ${cwd}`;
    console.error('[dsh-client] ' + msg);
    sendToSplash({ phase: 'error', message: msg });
    return false;
  }

  console.log('[dsh-client] spawning dsh:', bin);
  sendToSplash({ phase: 'starting', message: `启动 dsh (${bin})` });
  dshProcess = spawn('cmd.exe', ['/c', bin, 'web'], {
    cwd,
    env: {
      ...process.env,
      DEEPSEEK_API_KEY: apiKey,
      NODE_ENV: process.env.NODE_ENV || 'production',
    },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  dshProcess.stdout.on('data', d => {
    const txt = d.toString();
    process.stdout.write('[dsh] ' + txt);
    appendLog('dsh', txt);
    // Heuristic progress: report "listening on port 3080" once we see it.
    if (/listening|ready|started|3080/i.test(txt)) {
      sendToSplash({ phase: 'ready', message: 'dsh 已就绪,准备打开窗口…' });
    }
  });
  dshProcess.stderr.on('data', d => {
    const txt = d.toString();
    process.stderr.write('[dsh:err] ' + txt);
    appendLog('dsh:err', txt);
  });

  dshProcess.on('error', err => {
    console.error('[dsh-client] spawn error:', err.message);
    appendLog('error', 'spawn error: ' + err.message);
    dialog.showErrorBox('dsh 启动失败', err.message);
    sendToSplash({ phase: 'error', message: err.message });
  });

  dshProcess.on('exit', (code, signal) => {
    console.log(`[dsh-client] dsh exited code=${code} signal=${signal}`);
    appendLog('info', `dsh exited code=${code} signal=${signal}`);
  });
  return true;
}

function reloadDshProcess() {
  killDsh();
  // Wait briefly, then re-spawn so port 3080 has time to free up.
  setTimeout(() => startDsh(), 2000);
}

function waitForDshReady(timeoutMs = READY_TIMEOUT_MS, onTick) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    let attempts = 0;
    const tryConnect = () => {
      attempts++;
      if (onTick) onTick(attempts, Math.round((Date.now() - start) / 1000));
      const req = http.get({ host: '127.0.0.1', port: DSH_PORT, path: '/', timeout: 1500 }, res => {
        res.resume();
        console.log(`[dsh-client] dsh ready after ${attempts} attempt(s)`);
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`dsh 启动超时 (${Math.round(timeoutMs / 1000)}s),端口 ${DSH_PORT} 未响应`));
        } else {
          setTimeout(tryConnect, 500);
        }
      });
      req.on('timeout', () => req.destroy(new Error('timeout')));
    };
    tryConnect();
  });
}

// ---------------------------------------------------------------------------
// Splash window — shown while dsh boots, then closed
// ---------------------------------------------------------------------------
let splashWindow = null;

function createSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) return splashWindow;
  splashWindow = new BrowserWindow({
    width: 420,
    height: 280,
    frame: false,
    transparent: false,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    backgroundColor: '#0A2540',
    skipTaskbar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  return splashWindow;
}

function sendToSplash(payload) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('splash:update', payload);
  }
}

function destroySplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }
  splashWindow = null;
}

// ---------------------------------------------------------------------------
// Window position memory — save bounds on close, restore on next launch
// ---------------------------------------------------------------------------
function loadSavedBounds() {
  const s = readSettings();
  if (!s.windowBounds) return null;
  // Sanity check: must fit on at least one currently-connected display.
  const displays = screen.getAllDisplays();
  const { x, y, width, height } = s.windowBounds;
  const fits = displays.some(d =>
    x + width  > d.bounds.x &&
    y + height > d.bounds.y &&
    x < d.bounds.x + d.bounds.width &&
    y < d.bounds.y + d.bounds.height
  );
  return fits ? s.windowBounds : null;
}

function saveBounds(win) {
  if (!win || win.isDestroyed()) return;
  const isMax = win.isMaximized();
  const bounds = isMax ? win.getNormalBounds() : win.getBounds();
  writeSettings({ windowBounds: bounds, windowMaximized: isMax });
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------
let mainWindow = null;

async function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  }

  const settings = readSettings();
  const isDark = settings.theme ? settings.theme === 'dark' : nativeTheme.shouldUseDarkColors;
  nativeTheme.themeSource = isDark ? 'dark' : 'light';

  const savedBounds = loadSavedBounds();
  const win = new BrowserWindow({
    width:  savedBounds ? savedBounds.width  : 1400,
    height: savedBounds ? savedBounds.height : 900,
    x:      savedBounds ? savedBounds.x      : undefined,
    y:      savedBounds ? savedBounds.y      : undefined,
    minWidth: 1100,
    minHeight: 700,
    title: 'DeepSeek Harness',
    backgroundColor: isDark ? '#0A2540' : '#FFFFFF',
    show: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: isDark ? '#0A2540' : '#FFFFFF',
      symbolColor: isDark ? '#ffffff' : '#1F2937',
      height: 36,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      devTools: true,
    },
  });

  if (settings.windowMaximized) win.maximize();

  // Show only after first paint to avoid white flash.
  win.once('ready-to-show', () => {
    win.show();
    destroySplash();
  });

  // Save bounds on resize/move (debounced) and on close.
  let saveTimer = null;
  const queueSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveBounds(win), 400);
  };
  win.on('resize', queueSave);
  win.on('move',   queueSave);
  win.on('maximize',   () => writeSettings({ windowMaximized: true }));
  win.on('unmaximize', () => writeSettings({ windowMaximized: false }));

  // External links should open in the real browser, not in our window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Loading failure → fall back to an error overlay so the user isn't staring
  // at a blank window.
  win.webContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL) => {
    console.error(`[dsh-client] did-fail-load ${errorCode} ${errorDescription} ${validatedURL}`);
    if (validatedURL === DSH_URL) {
      win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(
        `<html><body style="background:#0A2540;color:#fff;font-family:sans-serif;padding:40px">
          <h1>无法连接到 dsh</h1>
          <p>地址: ${DSH_URL}</p>
          <p>请确认 dsh 服务已启动,或重启本应用。</p>
          <button onclick="location.reload()" style="padding:10px 20px;cursor:pointer">重试</button>
        </body></html>`
      )}`);
    }
  });

  // Right-click custom context menu — see buildContextMenu().
  win.webContents.on('context-menu', (_e, params) => {
    const menu = buildContextMenu(params);
    menu.popup({ window: win });
  });

  win.on('close', (e) => {
    // Hide-to-tray by default; tray menu "退出" really quits.
    saveBounds(win);
    if (!app.isQuiting) {
      e.preventDefault();
      win.hide();
    }
  });

  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });

  // Wait for dsh to be ready, with splash progress feedback.
  sendToSplash({ phase: 'waiting', message: `等待 dsh 在端口 ${DSH_PORT} 响应…` });
  try {
    await waitForDshReady(READY_TIMEOUT_MS, (attempt, sec) => {
      if (attempt % 4 === 0) {
        sendToSplash({
          phase: 'waiting',
          message: `探测 dsh 端口… (${sec}s, 已尝试 ${attempt} 次)`,
          progress: Math.min(0.95, sec / (READY_TIMEOUT_MS / 1000)),
        });
      }
    });
    sendToSplash({ phase: 'ready', message: 'dsh 已就绪,加载界面…', progress: 1 });
  } catch (err) {
    console.error('[dsh-client] dsh start failed:', err.message);
    appendLog('error', err.message);
    sendToSplash({ phase: 'error', message: err.message });
    dialog.showErrorBox('dsh 启动超时', err.message);
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(
      `<html><body style="background:#0A2540;color:#fff;font-family:sans-serif;padding:40px">
        <h1>dsh 启动失败</h1>
        <pre style="background:#06223a;padding:16px;border-radius:6px">${err.message}</pre>
        <button onclick="location.reload()" style="padding:10px 20px;cursor:pointer">重试</button>
      </body></html>`
    )}`);
  }

  // Load our custom shell, which embeds dsh via an iframe.
  await win.loadFile(path.join(__dirname, 'index.html'));

  mainWindow = win;
  return win;
}

// ---------------------------------------------------------------------------
// Tray
// ---------------------------------------------------------------------------
let tray = null;

function buildTrayIcon() {
  const icoPath = path.join(__dirname, 'icon.ico');
  if (fs.existsSync(icoPath)) return icoPath;
  const pngPath = path.join(__dirname, 'icon.png');
  if (fs.existsSync(pngPath)) return pngPath;
  // Fallback: 16x16 brand-color PNG (deep navy + white "D"), base64 encoded.
  const fallbackPng = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAH0lEQVR42mNkAAIm' +
    'BgYGBhgGCAAAB+gAAaXfDxQAAAAASUVORK5CYII='
  );
  return fallbackPng;
}

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    { label: '显示/隐藏窗口', accelerator: 'Ctrl+Shift+D', click: () => toggleMainWindow() },
    { label: '命令面板 (Ctrl+K)', click: () => sendToRenderer('dsh:open-command-palette') },
    { label: '截图 (Ctrl+Shift+S)', click: () => takeScreenshotToDisk() },
    { label: '切换主题 (Ctrl+Shift+T)', click: () => sendToRenderer('dsh:toggle-theme') },
    { type: 'separator' },
    { label: '查看日志…', click: () => sendToRenderer('dsh:open-log-viewer') },
    { label: '重新加载 dsh (Ctrl+Shift+R)', click: () => reloadDshProcess() },
    { label: '在浏览器中打开 dsh', click: () => shell.openExternal(DSH_URL) },
    { type: 'separator' },
    {
      label: '快捷键',
      submenu: [
        { label: 'Ctrl+Shift+D  显示/隐藏窗口', enabled: false },
        { label: 'Ctrl+Shift+R  重新加载 dsh', enabled: false },
        { label: 'Ctrl+Shift+S  截图', enabled: false },
        { label: 'Ctrl+Shift+T  切换主题', enabled: false },
        { label: 'Ctrl+Shift+Q  完全退出', enabled: false },
        { label: 'Ctrl+K        命令面板', enabled: false },
      ],
    },
    { type: 'separator' },
    { label: '关于…', click: () => sendToRenderer('dsh:open-about') },
    { label: '退出', accelerator: 'Ctrl+Shift+Q', click: () => { app.isQuiting = true; app.quit(); } },
  ]);
}

function refreshTrayMenu() {
  if (tray) tray.setContextMenu(buildTrayMenu());
}

function createTray() {
  const icon = buildTrayIcon();
  try {
    tray = new Tray(icon);
  } catch (e) {
    console.error('[dsh-client] Tray create failed:', e.message);
    return;
  }
  tray.setToolTip('DeepSeek Harness');
  tray.setContextMenu(buildTrayMenu());
  tray.on('click', () => toggleMainWindow());
  tray.on('double-click', () => toggleMainWindow());
}

// ---------------------------------------------------------------------------
// Helpers shared by IPC + tray + global shortcut handlers
// ---------------------------------------------------------------------------
function toggleMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isVisible()) mainWindow.hide();
  else { mainWindow.show(); mainWindow.focus(); }
}

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

async function takeScreenshotToDisk(targetPath) {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  try {
    const image = await mainWindow.webContents.capturePage();
    const png = image.toPNG();
    let filePath = targetPath;
    if (!filePath) {
      const stamp = new Date().toISOString().replace(/[-:T]/g, '').replace(/\..+/, '');
      const defaultName = `dsh-screenshot-${stamp}.png`;
      const { filePath: chosen, canceled } = await dialog.showSaveDialog(mainWindow, {
        title: '保存截图',
        defaultPath: path.join(app.getPath('pictures'), defaultName),
        filters: [{ name: 'Images', extensions: ['png'] }],
      });
      if (canceled || !chosen) return null;
      filePath = chosen;
    }
    fs.writeFileSync(filePath, png);
    sendToRenderer('dsh:screenshot-saved', { filePath });
    return filePath;
  } catch (e) {
    console.error('[dsh-client] screenshot failed:', e.message);
    sendToRenderer('dsh:screenshot-saved', { error: e.message });
    return null;
  }
}

function buildContextMenu(params) {
  const items = [];
  if (params && params.selectionText) {
    items.push({ label: '复制', role: 'copy' });
    items.push({ label: '剪切', role: 'cut' });
  }
  items.push({ label: '粘贴', role: 'paste' });
  items.push({ type: 'separator' });
  items.push({
    label: '命令面板 (Ctrl+K)',
    click: () => sendToRenderer('dsh:open-command-palette'),
  });
  items.push({
    label: '截图 (Ctrl+Shift+S)',
    click: () => sendToRenderer('dsh:trigger-screenshot'),
  });
  items.push({
    label: '切换主题',
    click: () => sendToRenderer('dsh:toggle-theme'),
  });
  items.push({
    label: '重新加载 dsh',
    click: () => reloadDshProcess(),
  });
  items.push({ type: 'separator' });
  items.push({
    label: '查看日志…',
    click: () => sendToRenderer('dsh:open-log-viewer'),
  });
  items.push({
    label: '关于…',
    click: () => sendToRenderer('dsh:open-about'),
  });
  items.push({ type: 'separator' });
  items.push({
    label: '在浏览器中打开 dsh',
    click: () => shell.openExternal(DSH_URL),
  });
  items.push({ type: 'separator' });
  items.push({
    label: '退出',
    click: () => { app.isQuiting = true; app.quit(); },
  });
  return Menu.buildFromTemplate(items);
}

// ---------------------------------------------------------------------------
// IPC handlers
// ---------------------------------------------------------------------------
ipcMain.handle('dsh:getVersion', () => app.getVersion());

// --- About dialog ---
ipcMain.handle('dsh:getAbout', () => {
  const apiKey = readApiKey();
  const { bin, cwd } = getDshPaths();
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
    apiKeyMasked: apiKey ? `${apiKey.slice(0, 7)}…${apiKey.slice(-4)}` : '',
    repoUrl: 'https://github.com/deepseek-ai/deepseek-harness',
    clientRepoUrl: 'https://github.com/yourname/dsh-client',
  };
});

ipcMain.handle('dsh:open-external', (_e, url) => {
  if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
    shell.openExternal(url);
    return true;
  }
  return false;
});

// --- Window controls ---
ipcMain.handle('dsh:reload', () => { if (mainWindow) mainWindow.webContents.reload(); });
ipcMain.handle('dsh:hide', () => { if (mainWindow) mainWindow.hide(); });
ipcMain.handle('dsh:minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.handle('dsh:quit', () => { app.isQuiting = true; app.quit(); });
ipcMain.handle('dsh:openInBrowser', () => shell.openExternal(DSH_URL));

// --- Theme ---
ipcMain.handle('dsh:getTheme', () => {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
});

ipcMain.handle('dsh:toggleTheme', () => {
  const next = nativeTheme.shouldUseDarkColors ? 'light' : 'dark';
  nativeTheme.themeSource = next;
  writeSettings({ theme: next });
  sendToRenderer('dsh:theme-changed', next);
  if (mainWindow && !mainWindow.isDestroyed()) {
    const dark = next === 'dark';
    mainWindow.setBackgroundColor(dark ? '#0A2540' : '#FFFFFF');
    if (mainWindow.getTitleBarOverlay) {
      mainWindow.setTitleBarOverlay({
        color: dark ? '#0A2540' : '#FFFFFF',
        symbolColor: dark ? '#ffffff' : '#1F2937',
        height: 36,
      });
    }
  }
  refreshTrayMenu();
  return next;
});

ipcMain.handle('dsh:setTheme', (_e, theme) => {
  if (theme !== 'dark' && theme !== 'light') return null;
  nativeTheme.themeSource = theme;
  writeSettings({ theme });
  sendToRenderer('dsh:theme-changed', theme);
  if (mainWindow && !mainWindow.isDestroyed()) {
    const dark = theme === 'dark';
    mainWindow.setBackgroundColor(dark ? '#0A2540' : '#FFFFFF');
    if (mainWindow.setTitleBarOverlay) {
      mainWindow.setTitleBarOverlay({
        color: dark ? '#0A2540' : '#FFFFFF',
        symbolColor: dark ? '#ffffff' : '#1F2937',
        height: 36,
      });
    }
  }
  return theme;
});

// --- dsh lifecycle ---
ipcMain.handle('dsh:reloadDsh', () => { reloadDshProcess(); return true; });

// --- Screenshot ---
ipcMain.handle('dsh:takeScreenshot', async () => takeScreenshotToDisk());

// --- Settings (custom dsh path) ---
ipcMain.handle('dsh:getSettings', () => readSettings());

ipcMain.handle('dsh:setDshPath', async (_e, payload) => {
  if (typeof payload !== 'object' || !payload) return { ok: false, error: 'invalid payload' };
  const { bin, cwd } = payload;
  const patch = {};
  if (typeof bin === 'string' && bin.trim()) patch.dshBin = bin.trim();
  if (typeof cwd === 'string' && cwd.trim()) patch.dshCwd = cwd.trim();
  writeSettings(patch);
  return { ok: true, settings: readSettings() };
});

ipcMain.handle('dsh:pickDshPath', async () => {
  const { bin, cwd } = getDshPaths();
  const startDir = fs.existsSync(cwd) ? cwd : path.dirname(bin);
  const r = await dialog.showOpenDialog(mainWindow || undefined, {
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
  writeSettings({ dshBin: chosen, dshCwd: path.dirname(chosen) });
  return { ok: true, bin: chosen, cwd: path.dirname(chosen) };
});

ipcMain.handle('dsh:pickDshCwd', async () => {
  const { cwd } = getDshPaths();
  const startDir = fs.existsSync(cwd) ? cwd : app.getPath('home');
  const r = await dialog.showOpenDialog(mainWindow || undefined, {
    title: '选择 dsh 工作目录',
    defaultPath: startDir,
    properties: ['openDirectory'],
  });
  if (r.canceled || !r.filePaths || !r.filePaths[0]) return { ok: false, canceled: true };
  writeSettings({ dshCwd: r.filePaths[0] });
  return { ok: true, cwd: r.filePaths[0] };
});

// --- Logs ---
ipcMain.handle('dsh:getLogs', () => {
  return {
    buffer: logBuffer.slice(),
    size: LOG_BUFFER_SIZE,
    total: logBuffer.length,
  };
});

ipcMain.handle('dsh:clearLogs', () => {
  logBuffer.length = 0;
  return { ok: true };
});

// --- Simulated auto-update ---
ipcMain.handle('dsh:checkUpdate', async () => {
  return {
    currentVersion: app.getVersion(),
    updateAvailable: false,
    checkedAt: new Date().toISOString(),
    source: 'local-stub',
  };
});

// ---------------------------------------------------------------------------
// Auto-updater — declared so package.json can publish, but currently no-op.
// ---------------------------------------------------------------------------
let autoUpdater = null;
try {
  ({ autoUpdater } = require('electron-updater'));
  autoUpdater.autoDownload = false;
  autoUpdater.on('update-available', () => sendToRenderer('dsh:update-available'));
  autoUpdater.on('update-downloaded', () => sendToRenderer('dsh:update-downloaded'));
  if (process.env.DSH_AUTO_UPDATE === '1') {
    autoUpdater.checkForUpdatesAndNotify().catch(e =>
      console.error('[dsh-client] autoUpdater error:', e.message)
    );
  }
} catch (e) {
  console.warn('[dsh-client] electron-updater not available:', e.message);
}

// ---------------------------------------------------------------------------
// Global shortcuts
// ---------------------------------------------------------------------------
function registerGlobalShortcuts() {
  const ok = [];
  const fail = [];

  const tryReg = (accel, fn) => {
    try {
      if (globalShortcut.register(accel, fn)) ok.push(accel);
      else fail.push(accel);
    } catch (e) {
      fail.push(accel);
      console.error(`[dsh-client] shortcut ${accel} register failed:`, e.message);
    }
  };

  tryReg('CommandOrControl+Shift+D', () => toggleMainWindow());
  tryReg('CommandOrControl+Shift+R', () => {
    reloadDshProcess();
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.reload();
  });
  tryReg('CommandOrControl+Shift+Q', () => { app.isQuiting = true; app.quit(); });
  tryReg('CommandOrControl+Shift+S', () => sendToRenderer('dsh:trigger-screenshot'));
  tryReg('CommandOrControl+Shift+T', () => sendToRenderer('dsh:toggle-theme'));
  tryReg('CommandOrControl+Shift+L', () => sendToRenderer('dsh:open-log-viewer'));

  console.log(`[dsh-client] global shortcuts OK: ${ok.join(', ') || '(none)'}`);
  if (fail.length) console.warn(`[dsh-client] global shortcuts FAILED: ${fail.join(', ')}`);
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
app.on('second-instance', () => {
  toggleMainWindow();
});

app.whenReady().then(async () => {
  // 1. Show splash BEFORE we touch dsh — gives instant feedback.
  createSplash();
  sendToSplash({ phase: 'init', message: '初始化 dsh-client…', progress: 0.05 });

  // 2. Validate dsh paths early; prompt the user if missing.
  const { bin, cwd } = getDshPaths();
  if (!fs.existsSync(bin)) {
    sendToSplash({ phase: 'path-missing', message: `找不到 dsh: ${bin}`, progress: 0 });
    const r = await dialog.showMessageBox({
      type: 'warning',
      title: 'dsh 路径无效',
      message: `默认的 dsh 可执行文件不存在:\n${bin}\n\n是否手动选择 dsh 路径?`,
      buttons: ['选择路径…', '仍然继续(会失败)', '取消'],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
    });
    if (r.response === 0) {
      const pick = await dialog.showOpenDialog({
        title: '选择 dsh 可执行文件',
        properties: ['openFile'],
        filters: [
          { name: 'Executables & Scripts', extensions: ['cmd', 'exe', 'bat', 'sh'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });
      if (!pick.canceled && pick.filePaths[0]) {
        const chosen = pick.filePaths[0];
        writeSettings({ dshBin: chosen, dshCwd: path.dirname(chosen) });
        sendToSplash({ phase: 'path-set', message: `已选择: ${chosen}` });
      }
    } else if (r.response === 2) {
      sendToSplash({ phase: 'error', message: '用户取消' });
      app.quit();
      return;
    }
  }

  // 3. Start dsh, create main window, build tray, register shortcuts.
  startDsh();
  await createWindow();
  createTray();
  registerGlobalShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else if (mainWindow) mainWindow.show();
  });
});

app.on('window-all-closed', () => {
  // On macOS keep the app alive (standard), on Windows quit so the tray
  // doesn't dangle.  Users can re-launch from the tray menu.
  if (process.platform !== 'darwin') {
    app.isQuiting = true;
    app.quit();
  }
});

app.on('before-quit', () => { app.isQuiting = true; });
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  killDsh();
});

// Failsafe — if Node receives a fatal signal, still try to kill dsh.
process.on('exit', killDsh);
process.on('SIGINT',  () => { killDsh(); process.exit(0); });
process.on('SIGTERM', () => { killDsh(); process.exit(0); });
