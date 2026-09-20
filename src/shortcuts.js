// src/shortcuts.js
// Global + in-app shortcut registry.
// Pure data — main.js wires up `globalShortcut.register` from this.

'use strict';

// Each shortcut: { accelerator, label, scope: 'global'|'local', channel? }
// `channel` is the IPC channel main→renderer should fire when the shortcut
// is pressed. If absent, the renderer expects the action to be local.

const shortcuts = {
  toggleWindow: {
    accelerator: 'CommandOrControl+Shift+D',
    label: '显示 / 隐藏主窗口',
    scope: 'global',
    onPress: 'toggleMainWindow',
  },
  reloadDsh: {
    accelerator: 'CommandOrControl+Shift+R',
    label: '重启 dsh 子进程',
    scope: 'global',
    onPress: 'reloadDshAndReload',
  },
  quit: {
    accelerator: 'CommandOrControl+Shift+Q',
    label: '完全退出 (含 dsh)',
    scope: 'global',
    onPress: 'quit',
  },
  screenshot: {
    accelerator: 'CommandOrControl+Shift+S',
    label: '截图整个窗口',
    scope: 'global',
    channel: 'dsh:trigger-screenshot',
  },
  themeToggle: {
    accelerator: 'CommandOrControl+Shift+T',
    label: '切换深色 / 浅色主题',
    scope: 'global',
    channel: 'dsh:toggle-theme',
  },
  openCommandPalette: {
    accelerator: 'CommandOrControl+K',
    label: '打开命令面板',
    scope: 'local',
    channel: 'dsh:open-command-palette',
  },
  openCommandPaletteAlt: {
    accelerator: 'CommandOrControl+Shift+P',
    label: '打开命令面板 (备选)',
    scope: 'local',
    channel: 'dsh:open-command-palette',
  },
  openLogs: {
    accelerator: 'CommandOrControl+Shift+L',
    label: '打开日志查看器',
    scope: 'global',
    channel: 'dsh:open-log-viewer',
  },
};

// All accelerators, useful for the tray menu's "shortcuts" submenu.
function acceleratorsByScope(scope) {
  return Object.values(shortcuts)
    .filter((s) => !scope || s.scope === scope)
    .map((s) => s.accelerator);
}

module.exports = { shortcuts, acceleratorsByScope };
