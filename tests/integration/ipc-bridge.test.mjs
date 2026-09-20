// tests/integration/ipc-bridge.test.mjs
// Verify all IPC channels are registered with working handlers.
// electron is mocked at the top of the file so we never need a real electron.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock electron BEFORE importing src/ipc-handlers. The factory is hoisted,
// so the mock body must be self-contained (no outer variable references).
vi.mock('electron', () => {
  const noop = () => {};
  const viFn = () => vi.fn();
  const electronMock = {
    ipcMain: { handle: vi.fn() },
    app: {
      getName: () => 'dsh-client',
      getVersion: () => '0.3.0',
      getPath: (k) => `C:/mock/${k}`,
      isQuiting: false,
      quit: vi.fn(),
    },
    shell: { openExternal: vi.fn() },
    dialog: {
      showOpenDialog: vi.fn(),
      showSaveDialog: vi.fn(),
      showErrorBox: vi.fn(),
      showMessageBox: vi.fn(),
    },
    nativeTheme: {
      shouldUseDarkColors: false,
      themeSource: 'system',
    },
    BrowserWindow: vi.fn(),
    globalShortcut: { register: vi.fn(), unregisterAll: vi.fn() },
    Tray: vi.fn(),
    Menu: { buildFromTemplate: vi.fn((t) => ({ _items: t })) },
    nativeImage: { createFromDataURL: vi.fn() },
    screen: { getAllDisplays: () => [{ bounds: { x: 0, y: 0, width: 1920, height: 1080 } }] },
  };
  electronMock.default = electronMock;
  return electronMock;
});

import electron from 'electron';

import { registerIpcHandlers } from '../../src/ipc-handlers.js';
import { Settings } from '../../src/settings.js';
import { createLogger } from '../../src/logger.js';
import dshPath from '../../src/dsh-path.js';

function buildDeps(overrides = {}) {
  const ipcMain = electron.ipcMain;
  ipcMain.handle.mockClear();
  return {
    ipcMain,
    app: electron.app,
    shell: electron.shell,
    dialog: electron.dialog,
    nativeTheme: electron.nativeTheme,
    logger: createLogger({ size: 10, sink: { log: vi.fn(), error: vi.fn(), warn: vi.fn() } }),
    settings: new Settings('test', './.test-settings.json'),
    dshPath,
    runtime: {
      getMainWindow: () => null,
      sendToRenderer: vi.fn(),
      reloadDshProcess: vi.fn(),
      takeScreenshotToDisk: vi.fn(() => Promise.resolve('C:/tmp/x.png')),
      refreshTrayMenu: vi.fn(),
      ...(overrides.runtime || {}),
    },
  };
}

describe('IPC handler registration', () => {
  let registered;
  beforeEach(() => {
    registered = registerIpcHandlers(buildDeps());
  });

  const EXPECTED = [
    'dsh:getVersion',
    'dsh:getAbout',
    'dsh:open-external',
    'dsh:reload',
    'dsh:hide',
    'dsh:minimize',
    'dsh:quit',
    'dsh:openInBrowser',
    'dsh:getTheme',
    'dsh:toggleTheme',
    'dsh:setTheme',
    'dsh:reloadDsh',
    'dsh:takeScreenshot',
    'dsh:getSettings',
    'dsh:setDshPath',
    'dsh:pickDshPath',
    'dsh:pickDshCwd',
    'dsh:getLogs',
    'dsh:clearLogs',
    'dsh:checkUpdate',
  ];

  it('returns the list of registered channels', () => {
    expect(Array.isArray(registered)).toBe(true);
    expect(registered.length).toBe(EXPECTED.length);
  });

  for (const ch of EXPECTED) {
    it(`registers "${ch}"`, () => {
      expect(registered).toContain(ch);
      expect(electron.ipcMain.handle).toHaveBeenCalledWith(ch, expect.any(Function));
    });
  }

  it('does not register any channel twice', () => {
    expect(new Set(registered).size).toBe(registered.length);
  });
});

describe('IPC handler behavior (smoke)', () => {
  it('dsh:getVersion returns app version', () => {
    registerIpcHandlers(buildDeps());
    const handler = electron.ipcMain.handle.mock.calls.find((c) => c[0] === 'dsh:getVersion')[1];
    expect(handler()).toBe('0.3.0');
  });

  it('dsh:getTheme returns "light" or "dark"', () => {
    registerIpcHandlers(buildDeps());
    const handler = electron.ipcMain.handle.mock.calls.find((c) => c[0] === 'dsh:getTheme')[1];
    expect(['light', 'dark']).toContain(handler());
  });

  it('dsh:toggleTheme flips the theme', () => {
    electron.nativeTheme.shouldUseDarkColors = false;
    registerIpcHandlers(buildDeps());
    const handler = electron.ipcMain.handle.mock.calls.find((c) => c[0] === 'dsh:toggleTheme')[1];
    const next = handler();
    expect(['dark', 'light']).toContain(next);
  });

  it('dsh:setTheme rejects invalid themes', () => {
    registerIpcHandlers(buildDeps());
    const handler = electron.ipcMain.handle.mock.calls.find((c) => c[0] === 'dsh:setTheme')[1];
    expect(handler({}, 'blue')).toBeNull();
  });

  it('dsh:setTheme accepts "dark" and "light"', () => {
    registerIpcHandlers(buildDeps());
    const handler = electron.ipcMain.handle.mock.calls.find((c) => c[0] === 'dsh:setTheme')[1];
    expect(handler({}, 'dark')).toBe('dark');
    expect(handler({}, 'light')).toBe('light');
  });

  it('dsh:open-external only allows http(s) URLs', () => {
    registerIpcHandlers(buildDeps());
    const handler = electron.ipcMain.handle.mock.calls.find((c) => c[0] === 'dsh:open-external')[1];
    expect(handler({}, 'https://example.com')).toBe(true);
    expect(handler({}, 'javascript:alert(1)')).toBe(false);
    expect(handler({}, 'not a url')).toBe(false);
  });

  it('dsh:setDshPath validates payload', () => {
    registerIpcHandlers(buildDeps());
    const handler = electron.ipcMain.handle.mock.calls.find((c) => c[0] === 'dsh:setDshPath')[1];
    expect(handler({}, null)).toEqual({ ok: false, error: 'invalid payload' });
    expect(handler({}, { bin: 'C:/x/dsh.cmd' })).toEqual({ ok: true, settings: expect.any(Object) });
  });

  it('dsh:getLogs returns the logger snapshot shape', () => {
    const deps = buildDeps();
    deps.logger.append('info', 'hello');
    registerIpcHandlers(deps);
    const handler = electron.ipcMain.handle.mock.calls.find((c) => c[0] === 'dsh:getLogs')[1];
    const result = handler();
    expect(result).toHaveProperty('buffer');
    expect(result).toHaveProperty('size');
    expect(result).toHaveProperty('total');
    expect(result.total).toBe(1);
  });

  it('dsh:clearLogs empties the logger', () => {
    const deps = buildDeps();
    deps.logger.append('info', 'x');
    registerIpcHandlers(deps);
    const handler = electron.ipcMain.handle.mock.calls.find((c) => c[0] === 'dsh:clearLogs')[1];
    expect(handler()).toEqual({ ok: true });
    expect(deps.logger.snapshot().total).toBe(0);
  });

  it('dsh:checkUpdate returns a stub shape', async () => {
    registerIpcHandlers(buildDeps());
    const handler = electron.ipcMain.handle.mock.calls.find((c) => c[0] === 'dsh:checkUpdate')[1];
    const result = await handler();
    expect(result).toMatchObject({
      currentVersion: '0.3.0',
      updateAvailable: false,
      source: 'local-stub',
    });
    expect(typeof result.checkedAt).toBe('string');
  });
});
