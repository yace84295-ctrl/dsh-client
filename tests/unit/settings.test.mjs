// tests/unit/settings.test.mjs
// Settings persistence: round-trip, defaults, corruption recovery, clear.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { Settings } from '../../src/settings.js';

function tmpFile(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `dsh-test-${label}-`));
  return path.join(dir, 'settings.json');
}

describe('Settings', () => {
  let file;
  let settings;

  beforeEach(() => {
    file = tmpFile('settings');
    settings = new Settings('dsh-client', file);
  });

  afterEach(() => {
    try { fs.rmSync(path.dirname(file), { recursive: true, force: true }); } catch (_) {}
  });

  it('returns the default value when a key has not been set', () => {
    expect(settings.get('theme', 'light')).toBe('light');
  });

  it('saves and reads back a value', () => {
    settings.set({ theme: 'dark' });
    expect(settings.get('theme')).toBe('dark');
  });

  it('persists across instances (re-reads from disk)', () => {
    settings.set({ windowBounds: { x: 100, y: 100, width: 1200, height: 800 } });
    const other = new Settings('dsh-client', file);
    expect(other.get('windowBounds')).toEqual({ x: 100, y: 100, width: 1200, height: 800 });
  });

  it('merges patches without dropping existing keys', () => {
    settings.set({ theme: 'dark' });
    settings.set({ windowBounds: { x: 0, y: 0, width: 800, height: 600 } });
    expect(settings.get('theme')).toBe('dark');
    expect(settings.get('windowBounds').width).toBe(800);
  });

  it('handles a corrupted JSON file gracefully', () => {
    fs.writeFileSync(file, 'corrupted{json');
    const fresh = new Settings('dsh-client', file);
    expect(() => fresh.get('theme', 'light')).not.toThrow();
    expect(fresh.get('theme', 'light')).toBe('light');
  });

  it('handles a missing file gracefully', () => {
    // File was never written in the first place — that's the setup.
    expect(fs.existsSync(file)).toBe(false);
    const fresh = new Settings('dsh-client', file);
    expect(fresh.get('anything', 42)).toBe(42);
  });

  it('clear() removes the on-disk file and resets cache', () => {
    settings.set({ theme: 'dark' });
    settings.clear();
    expect(fs.existsSync(file)).toBe(false);
    expect(settings.get('theme', 'light')).toBe('light');
  });

  it('all() returns a copy, not a reference', () => {
    settings.set({ theme: 'dark' });
    const a = settings.all();
    a.theme = 'light';
    expect(settings.get('theme')).toBe('dark');
  });

  it('creates the parent directory on first write', () => {
    const nested = path.join(path.dirname(file), 'sub', 'nested', 'settings.json');
    const s = new Settings('nested', nested);
    s.set({ x: 1 });
    expect(fs.existsSync(nested)).toBe(true);
  });

  it('coerces non-object JSON values to an empty object', () => {
    fs.writeFileSync(file, '"hello"');
    const fresh = new Settings('dsh-client', file);
    expect(fresh.get('theme', 'light')).toBe('light');
  });
});
