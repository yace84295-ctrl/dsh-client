// tests/unit/shortcuts.test.mjs
import { describe, it, expect } from 'vitest';
import { shortcuts, acceleratorsByScope } from '../../src/shortcuts.js';

describe('shortcuts registry', () => {
  it('defines the core shortcut set', () => {
    const ids = Object.keys(shortcuts);
    for (const id of ['toggleWindow', 'reloadDsh', 'quit', 'screenshot', 'themeToggle', 'openCommandPalette', 'openLogs']) {
      expect(ids).toContain(id);
    }
  });

  it('each shortcut has accelerator + label + scope', () => {
    for (const s of Object.values(shortcuts)) {
      expect(typeof s.accelerator).toBe('string');
      expect(s.accelerator.length).toBeGreaterThan(0);
      expect(typeof s.label).toBe('string');
      expect(['global', 'local']).toContain(s.scope);
    }
  });

  it('global-scope shortcuts have either onPress or channel', () => {
    for (const s of Object.values(shortcuts)) {
      if (s.scope === 'global') {
        expect(typeof s.onPress === 'string' || typeof s.channel === 'string').toBe(true);
      }
    }
  });

  it('accelerators are unique within the registry', () => {
    const accels = Object.values(shortcuts).map((s) => s.accelerator);
    expect(new Set(accels).size).toBe(accels.length);
  });
});

describe('acceleratorsByScope', () => {
  it('returns only global accelerators when called with "global"', () => {
    const global = acceleratorsByScope('global');
    expect(global.length).toBeGreaterThan(0);
    expect(global).toContain('CommandOrControl+Shift+D');
    expect(global).not.toContain('CommandOrControl+K');
  });

  it('returns only local accelerators when called with "local"', () => {
    const local = acceleratorsByScope('local');
    expect(local).toContain('CommandOrControl+K');
  });

  it('returns all accelerators when called with no arg', () => {
    expect(acceleratorsByScope().length).toBe(Object.keys(shortcuts).length);
  });
});
