// tests/unit/dsh-path.test.mjs
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  resolveDshBin,
  resolveDshCwd,
  resolveDshPaths,
  readApiKey,
  pathsLookValid,
  maskApiKey,
  defaultEnvFile,
  DEFAULT_DSH_BIN,
  DEFAULT_DSH_CWD,
} from '../../src/dsh-path.js';

describe('resolveDshBin', () => {
  beforeEach(() => {
    delete process.env.DSH_BIN;
  });

  it('prefers settings.dshBin', () => {
    expect(resolveDshBin({ dshBin: 'C:/custom/dsh.cmd' })).toBe('C:/custom/dsh.cmd');
  });

  it('falls back to DSH_BIN env var', () => {
    process.env.DSH_BIN = 'C:/env/dsh.cmd';
    expect(resolveDshBin({})).toBe('C:/env/dsh.cmd');
  });

  it('falls back to the hard-coded default', () => {
    expect(resolveDshBin({})).toBe(DEFAULT_DSH_BIN);
  });

  it('handles undefined settings gracefully', () => {
    expect(resolveDshBin()).toBeDefined();
  });
});

describe('resolveDshCwd', () => {
  beforeEach(() => { delete process.env.DSH_CWD; });

  it('prefers settings.dshCwd', () => {
    expect(resolveDshCwd({ dshCwd: 'C:/work' })).toBe('C:/work');
  });

  it('falls back to DSH_CWD env var', () => {
    process.env.DSH_CWD = 'D:/work';
    expect(resolveDshCwd({})).toBe('D:/work');
  });

  it('falls back to default', () => {
    expect(resolveDshCwd({})).toBe(DEFAULT_DSH_CWD);
  });
});

describe('resolveDshPaths', () => {
  it('returns both bin and cwd', () => {
    const r = resolveDshPaths({ dshBin: 'A', dshCwd: 'B' });
    expect(r.bin).toBe('A');
    expect(r.cwd).toBe('B');
  });
});

describe('readApiKey', () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-env-'));
  });
  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  });

  it('returns "" when the file does not exist', () => {
    expect(readApiKey(path.join(tmpDir, 'missing.env'))).toBe('');
  });

  it('extracts DEEPSEEK_API_KEY from a valid .env', () => {
    const f = path.join(tmpDir, '.env');
    fs.writeFileSync(f, 'DEEPSEEK_API_KEY=sk-test-1234\nOTHER=foo\n');
    expect(readApiKey(f)).toBe('sk-test-1234');
  });

  it('trims whitespace around the value', () => {
    const f = path.join(tmpDir, '.env');
    fs.writeFileSync(f, 'DEEPSEEK_API_KEY=   sk-abc   \n');
    expect(readApiKey(f)).toBe('sk-abc');
  });

  it('returns "" when the key is absent', () => {
    const f = path.join(tmpDir, '.env');
    fs.writeFileSync(f, 'OTHER=foo\n');
    expect(readApiKey(f)).toBe('');
  });
});

describe('pathsLookValid', () => {
  it('returns false when bin does not exist', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-path-'));
    const fakeBin = path.join(dir, 'no-such.cmd');
    const cwd = dir;
    expect(pathsLookValid({ bin: fakeBin, cwd })).toBe(false);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
  });

  it('returns false when cwd does not exist', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-path-'));
    const realBin = path.join(dir, 'dsh.cmd');
    fs.writeFileSync(realBin, '@echo off');
    expect(pathsLookValid({ bin: realBin, cwd: 'Z:/nope' })).toBe(false);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
  });

  it('returns true when both exist', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-path-'));
    const realBin = path.join(dir, 'dsh.cmd');
    fs.writeFileSync(realBin, '@echo off');
    expect(pathsLookValid({ bin: realBin, cwd: dir })).toBe(true);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
  });

  it('returns false for empty bin or cwd', () => {
    expect(pathsLookValid({ bin: '', cwd: '' })).toBe(false);
    expect(pathsLookValid({ bin: null, cwd: null })).toBe(false);
  });
});

describe('maskApiKey', () => {
  it('returns "" for empty input', () => {
    expect(maskApiKey('')).toBe('');
    expect(maskApiKey(null)).toBe('');
    expect(maskApiKey(undefined)).toBe('');
  });

  it('masks the middle of a long key', () => {
    expect(maskApiKey('sk-1234567890abcdef')).toMatch(/^sk-1234…cdef$/);
  });

  it('returns a generic mask for short keys', () => {
    expect(maskApiKey('short')).toBe('••••');
  });
});

describe('defaultEnvFile', () => {
  it('returns a string ending in .env by default', () => {
    expect(typeof defaultEnvFile()).toBe('string');
    expect(defaultEnvFile().endsWith('.env')).toBe(true);
  });

  it('honors DSH_ENV_FILE env var', () => {
    process.env.DSH_ENV_FILE = 'C:/custom/.env';
    try {
      expect(defaultEnvFile()).toBe('C:/custom/.env');
    } finally {
      delete process.env.DSH_ENV_FILE;
    }
  });
});
