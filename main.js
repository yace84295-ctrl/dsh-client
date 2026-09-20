// dsh-client main process
// Thin entry point. All the real logic lives in src/*.js modules so it's
// testable without spinning up Electron.
//
// What this file does:
//   1. Read settings (user prefs: theme, dsh path, window bounds)
//   2. Spawn dsh as a child process (localhost:3080)
//   3. Wait for port 3080 to respond (with splash progress feedback)
//   4. Open a frameless BrowserWindow that embeds dsh Web UI
//   5. Set up tray icon, global shortcuts, IPC handlers
//
// v0.3.0 — adds: command palette, about, splash, log viewer, custom dsh path,
//                 window position memory, electron-store-style JSON settings.

const { app, BrowserWindow, ipcMain, shell, Tray, Menu, dialog, nativeTheme, globalShortcut, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const {
  Settings,
} = require('./src/settings');
const { createLogger } = require('./src/logger');
const { resolveDshPaths, readApiKey, pathsLookValid, maskApiKey, defaultEnvFile } = require('./src/dsh-path');
const { spawnDsh, killProcessTree, waitForDshReady, looksReady, DSH_URL, DSH_PORT, READY_TIMEOUT_MS } = require('./src/dsh-manager');
const { pickInitialBounds, makeSaver } = require('./src/window-state');
const { shortcuts } = require('./src/shortcuts');
const { buildSplashPayload, PHASES } = require('./src/splash');
const { registerIpcHandlers } = require('./src/ipc-handlers');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const ENV_FILE = process.env.DSH_ENV_FILE || defaultEnvFile();

// ---------------------------------------------------------------------------
// Settings + logger
// ---------------------------------------------------------------------------
const settings = new Settings('dsh-client');
const logger = createLogger({ size: 1000 });
logger.patchConsole();

// ---------------------------------------------------------------------------
// Single-instance lock
// ---------------------------------------------------------------------------
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

// ---------------------------------------------------------------------------
// dsh lifecycle
// ---------------------------------------------------------------------------
let dshProcess = null;

function killDsh() {
  killProcessTree(dshProcess);
  dshProcess = null;
}

function startDsh() {
  const { bin, cwd } = resolveDshPaths(settings.all());
  const apiKey = readApiKey(ENV_FILE);
  if (!apiKey) {
    dialog.showErrorBox(
      'DEEPSEEK_API_KEY 未找到',
      `请在 ${ENV_FILE} 中设置 DEEPSEEK_API_KEY=...`
    );
  }

  if (!pathsLookValid({ bin, cwd })) {
    const msg = !fs.existsSync(bin)
      ? `dsh 二进制不存在: ${bin}\n请在设置中重新选择路径,或安装 dsh: npm i -g deepseek-harness`
      : `dsh 工作目录不存在: ${cwd}`;
    console.error('[dsh-client] ' + msg);
    sendToSplash({ phase: 'error', message: msg });
    return false;
  }

  console.log('[dsh-client] spawning dsh:', bin);
  sendToSplash({ phase: 'starting', message: `启动 dsh (${bin})` });
  dshProcess = spawnDsh({ bin, cwd, env: { DEEPSEEK_API_KEY: apiKey } });

  dshProcess.stdout.on('data', (d) => {
    const txt = d.toString();
    process.stdout.write('[dsh] ' + txt);
    logger.append('dsh', txt);
    if (looksReady(txt)) {
      sendToSplash({ phase: 'ready', message: 'dsh 已就绪,准备打开窗口…' });
    }
  });
  dshProcess.stderr.on('data', (d) => {
    const txt = d.toString();
    process.stderr.write('[dsh:err] ' + txt);
    logger.append('dsh:err', txt);
  });
  dshProcess.on('error', (err) => {
    console.error('[dsh-client] spawn error:', err.message);
    logger.append('error', 'spawn error: ' + err.message);
    dialog.showErrorBox('dsh 启动失败', err.message);
    sendToSplash({ phase: 'error', message: err.message });
  });
  dshProcess.on('exit', (code, signal) => {
    console.log(`[dsh-client] dsh exited code=${code} signal=${signal}`);
    logger.append('info', `dsh exited code=${code} signal=${signal}`);
  });
  return true;
}

function reloadDshProcess() {
  killDsh();
  setTimeout(() => startDsh(), 2000);
}

// ---------------------------------------------------------------------------
// Splash
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
// Main window
// ---------------------------------------------------------------------------
let mainWindow = null;
const saveBounds = makeSaver((patch) => settings.set(patch));

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

async function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  }

  const s = settings.all();
  const isDark = s.theme ? s.theme === 'dark' : nativeTheme.shouldUseDarkColors;
  nativeTheme.themeSource = isDark ? 'dark' : 'light';

  const savedBounds = pickInitialBounds(s.windowBounds, screen.getAllDisplays());
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

  if (s.windowMaximized) win.maximize();

  win.once('ready-to-show', () => {
    win.show();
    destroySplash();
  });

  let saveTimer = null;
  const queueSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveBounds(win), 400);
  };
  win.on('resize', queueSave);
  win.on('move',   queueSave);
  win.on('maximize',   () => settings.set({ windowMaximized: true }));
  win.on('unmaximize', () => settings.set({ windowMaximized: false }));

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

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

  win.webContents.on('context-menu', (_e, params) => {
    buildContextMenu(params).popup({ window: win });
  });

  win.on('close', (e) => {
    saveBounds(win);
    if (!app.isQuiting) {
      e.preventDefault();
      win.hide();
    }
  });

  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });

  sendToSplash({ phase: 'waiting', message: `等待 dsh 在端口 ${DSH_PORT} 响应…` });
  let dshStarted = false;
  try {
    await waitForDshReady({
      timeoutMs: READY_TIMEOUT_MS,
      onTick: (attempt, sec) => {
        if (attempt % 4 === 0) {
          sendToSplash({
            phase: 'waiting',
            message: `探测 dsh 端口… (${sec}s, 已尝试 ${attempt} 次)`,
            progress: Math.min(0.95, sec / (READY_TIMEOUT_MS / 1000)),
          });
        }
      },
    });
    dshStarted = true;
    sendToSplash({ phase: 'ready', message: 'dsh 已就绪,加载界面…', progress: 1 });
  } catch (err) {
    console.error('[dsh-client] dsh start failed:', err.message);
    logger.append('error', err.message);
    sendToSplash({ phase: 'error', message: err.message });
    dialog.showErrorBox('dsh 启动超时', err.message);
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(
      `<html><body style="background:#0A2540;color:#fff;font-family:sans-serif;padding:40px">
        <h1>dsh 启动失败</h1>
        <pre style="background:#06223a;padding:16px;border-radius:6px">${err.message}</pre>
        <p style="opacity:.75">
          常见原因:端口 ${DSH_PORT} 被别的进程占用,或系统可用内存/提交量不足导致 dsh 子进程被系统杀掉。
        </p>
        <button onclick="window.dsh && window.dsh.reloadDsh()" style="padding:10px 20px;cursor:pointer">重启 dsh</button>
        <p style="opacity:.6;font-size:13px">若重启后界面仍未恢复,按 Ctrl+Shift+R 重新加载窗口。</p>
      </body></html>`
    )}`);
  }

  // 启动失败时保留上面的错误页 —— 之前这里无条件 loadFile(index.html),
  // 会把它盖成 iframe 连不上的空白界面,用户看不到失败原因。
  if (dshStarted) {
    await win.loadFile(path.join(__dirname, 'index.html'));
  }

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
  return nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAH0lEQVR42mNkAAIm' +
    'BgYGBhgGCAAAB+gAAaXfDxQAAAAASUVORK5CYII='
  );
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

function buildContextMenu(params) {
  const items = [];
  if (params && params.selectionText) {
    items.push({ label: '复制', role: 'copy' });
    items.push({ label: '剪切', role: 'cut' });
  }
  items.push({ label: '粘贴', role: 'paste' });
  items.push({ type: 'separator' });
  items.push({ label: '命令面板 (Ctrl+K)', click: () => sendToRenderer('dsh:open-command-palette') });
  items.push({ label: '截图 (Ctrl+Shift+S)', click: () => sendToRenderer('dsh:trigger-screenshot') });
  items.push({ label: '切换主题', click: () => sendToRenderer('dsh:toggle-theme') });
  items.push({ label: '重新加载 dsh', click: () => reloadDshProcess() });
  items.push({ type: 'separator' });
  items.push({ label: '查看日志…', click: () => sendToRenderer('dsh:open-log-viewer') });
  items.push({ label: '关于…', click: () => sendToRenderer('dsh:open-about') });
  items.push({ type: 'separator' });
  items.push({ label: '在浏览器中打开 dsh', click: () => shell.openExternal(DSH_URL) });
  items.push({ type: 'separator' });
  items.push({ label: '退出', click: () => { app.isQuiting = true; app.quit(); } });
  return Menu.buildFromTemplate(items);
}

// ---------------------------------------------------------------------------
// IPC handlers (registered via module)
// ---------------------------------------------------------------------------
registerIpcHandlers({
  ipcMain,
  app,
  shell,
  dialog,
  nativeTheme,
  logger,
  settings,
  dshPath: { resolveDshPaths, readApiKey, maskApiKey },
  runtime: {
    getMainWindow: () => mainWindow,
    sendToRenderer,
    reloadDshProcess,
    takeScreenshotToDisk,
    refreshTrayMenu,
  },
});

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

  // Reference src/shortcuts.js so the registry stays the single source of truth
  // and ESLint doesn't complain about unused imports. (The strings used above
  // must match `shortcuts.<id>.accelerator`.)
  void shortcuts;

  console.log(`[dsh-client] global shortcuts OK: ${ok.join(', ') || '(none)'}`);
  if (fail.length) console.warn(`[dsh-client] global shortcuts FAILED: ${fail.join(', ')}`);
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
app.on('second-instance', () => {
  toggleMainWindow();
});

app.whenReady().then(async () => {
  createSplash();
  sendToSplash({ phase: 'init', message: '初始化 dsh-client…', progress: 0.05 });

  const { bin } = resolveDshPaths(settings.all());
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
        settings.set({ dshBin: chosen, dshCwd: path.dirname(chosen) });
        sendToSplash({ phase: 'path-set', message: `已选择: ${chosen}` });
      }
    } else if (r.response === 2) {
      sendToSplash({ phase: 'error', message: '用户取消' });
      app.quit();
      return;
    }
  }

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

process.on('exit', killDsh);
process.on('SIGINT',  () => { killDsh(); process.exit(0); });
process.on('SIGTERM', () => { killDsh(); process.exit(0); });

// Reference buildSplashPayload / PHASES so the module is treated as used at
// runtime — main.js still constructs payloads inline above, but the module
// is the testable version. Avoid ESLint no-unused-vars on the destructure.
void buildSplashPayload;
void PHASES;
