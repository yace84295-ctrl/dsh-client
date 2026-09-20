// preload.js — secure IPC bridge.
// Exposes a tiny, typed API on window.dsh. No nodeIntegration, no remote.
// v0.3.0: adds command-palette, about, logs, settings (custom dsh path)
//         bridges, plus open-external and several main→renderer pushes.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dsh', {
  // App info
  getVersion:   ()        => ipcRenderer.invoke('dsh:getVersion'),
  // Window controls
  reload:       ()        => ipcRenderer.invoke('dsh:reload'),
  hide:         ()        => ipcRenderer.invoke('dsh:hide'),
  minimize:     ()        => ipcRenderer.invoke('dsh:minimize'),
  quit:         ()        => ipcRenderer.invoke('dsh:quit'),
  // External links
  openInBrowser: ()       => ipcRenderer.invoke('dsh:openInBrowser'),
  openExternal:  (url)    => ipcRenderer.invoke('dsh:open-external', url),
  // Convenience — direct access to the embedded dsh webview
  dshUrl: 'http://127.0.0.1:3080',

  // --- Theme ---
  getTheme:     ()        => ipcRenderer.invoke('dsh:getTheme'),
  toggleTheme:  ()        => ipcRenderer.invoke('dsh:toggleTheme'),
  setTheme:     (t)       => ipcRenderer.invoke('dsh:setTheme', t),
  onThemeChanged: (cb)    => {
    const handler = (_e, t) => cb(t);
    ipcRenderer.on('dsh:theme-changed', handler);
    return () => ipcRenderer.removeListener('dsh:theme-changed', handler);
  },
  // dsh lifecycle
  reloadDsh:    ()        => ipcRenderer.invoke('dsh:reloadDsh'),
  // Screenshot
  takeScreenshot: ()      => ipcRenderer.invoke('dsh:takeScreenshot'),
  onScreenshotSaved: (cb) => {
    const handler = (_e, payload) => cb(payload);
    ipcRenderer.on('dsh:screenshot-saved', handler);
    return () => ipcRenderer.removeListener('dsh:screenshot-saved', handler);
  },
  onTriggerScreenshot: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('dsh:trigger-screenshot', handler);
    return () => ipcRenderer.removeListener('dsh:trigger-screenshot', handler);
  },
  // Update
  checkUpdate:  ()        => ipcRenderer.invoke('dsh:checkUpdate'),

  // --- v0.3.0 additions ---
  // About
  getAbout:     ()        => ipcRenderer.invoke('dsh:getAbout'),

  // Command palette events from main (global shortcut)
  onOpenCommandPalette: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('dsh:open-command-palette', handler);
    return () => ipcRenderer.removeListener('dsh:open-command-palette', handler);
  },

  // About / log viewer events from main (tray / menu)
  onOpenAbout: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('dsh:open-about', handler);
    return () => ipcRenderer.removeListener('dsh:open-about', handler);
  },
  onOpenLogViewer: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('dsh:open-log-viewer', handler);
    return () => ipcRenderer.removeListener('dsh:open-log-viewer', handler);
  },

  // Settings (custom dsh path)
  getSettings:  ()        => ipcRenderer.invoke('dsh:getSettings'),
  setDshPath:   (p)       => ipcRenderer.invoke('dsh:setDshPath', p),
  pickDshPath:  ()        => ipcRenderer.invoke('dsh:pickDshPath'),
  pickDshCwd:   ()        => ipcRenderer.invoke('dsh:pickDshCwd'),

  // Logs
  getLogs:      ()        => ipcRenderer.invoke('dsh:getLogs'),
  clearLogs:    ()        => ipcRenderer.invoke('dsh:clearLogs'),
});
