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
  candidateEnvFiles,
  resolveEnvFile,
  dshBinCandidates,
  detectDshBin,
  dshCwdFor,
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

describe('env file resolution', () => {
  let root;
  let saved;
  const KEYS = ['DSH_ENV_FILE', 'APPDATA', 'LOCALAPPDATA'];

  beforeEach(() => {
    saved = {};
    for (const k of KEYS) saved[k] = process.env[k];
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-envres-'));
    process.env.APPDATA = path.join(root, 'roaming');
    process.env.LOCALAPPDATA = path.join(root, 'local');
    delete process.env.DSH_ENV_FILE;
  });

  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    try { fs.rmSync(root, { recursive: true, force: true }); } catch (_) {}
  });

  const own = () => path.join(process.env.APPDATA, 'dsh-client', '.env');
  const legacy = () => path.join(process.env.LOCALAPPDATA, 'hermes', '.env');

  function write(file, body) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body);
  }

  it('lists our own config dir before the legacy hermes location', () => {
    expect(candidateEnvFiles()).toEqual([own(), legacy()]);
  });

  it('puts DSH_ENV_FILE first when set', () => {
    process.env.DSH_ENV_FILE = path.join(root, 'custom.env');
    expect(candidateEnvFiles()[0]).toBe(process.env.DSH_ENV_FILE);
  });

  it('resolves and reads our own env file when it exists', () => {
    write(own(), 'DEEPSEEK_API_KEY=sk-own\n');
    expect(resolveEnvFile()).toBe(own());
    expect(readApiKey()).toBe('sk-own');
  });

  it('falls back to the legacy hermes env file when ours is absent', () => {
    write(legacy(), 'DEEPSEEK_API_KEY=sk-legacy\n');
    expect(resolveEnvFile()).toBe(legacy());
    expect(readApiKey()).toBe('sk-legacy');
  });

  it('points error messages at our own path when nothing exists', () => {
    expect(resolveEnvFile()).toBe(own());
  });

  it('lets DSH_ENV_FILE win over both', () => {
    write(own(), 'DEEPSEEK_API_KEY=sk-own\n');
    write(legacy(), 'DEEPSEEK_API_KEY=sk-legacy\n');
    process.env.DSH_ENV_FILE = path.join(root, 'explicit.env');
    write(process.env.DSH_ENV_FILE, 'DEEPSEEK_API_KEY=sk-explicit\n');
    expect(resolveEnvFile()).toBe(process.env.DSH_ENV_FILE);
    expect(readApiKey()).toBe('sk-explicit');
  });
});

describe('dsh binary discovery', () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-detect-'));
  });
  afterEach(() => {
    try { fs.rmSync(root, { recursive: true, force: true }); } catch (_) {}
  });

  const shim = (dir) => {
    const f = path.join(dir, 'dsh.cmd');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(f, '@echo off');
    return f;
  };

  it("prefers npm's global shim directory over PATH", () => {
    const appData = path.join(root, 'roaming');
    const want = shim(path.join(appData, 'npm'));
    shim(path.join(root, 'onpath'));
    expect(detectDshBin({ home: root, appData, pathEnv: path.join(root, 'onpath') })).toBe(want);
  });

  it('falls back to PATH before the dsh-scratch convention', () => {
    const onPath = shim(path.join(root, 'onpath'));
    shim(path.join(root, 'dsh-scratch', 'node_modules', '.bin'));
    expect(detectDshBin({ home: root, appData: path.join(root, 'none'), pathEnv: path.join(root, 'onpath') }))
      .toBe(onPath);
  });

  it('uses the dsh-scratch install when PATH has nothing', () => {
    const scratch = shim(path.join(root, 'dsh-scratch', 'node_modules', '.bin'));
    expect(detectDshBin({ home: root, appData: path.join(root, 'none'), pathEnv: path.join(root, 'empty') }))
      .toBe(scratch);
  });

  it('returns "" when nothing is installed, so the app asks the user instead of guessing', () => {
    expect(detectDshBin({ home: root, appData: path.join(root, 'none'), pathEnv: path.join(root, 'empty') }))
      .toBe('');
  });

  it('uses the project owning node_modules/.bin as cwd, else the home directory', () => {
    const bin = shim(path.join(root, 'proj', 'node_modules', '.bin'));
    expect(dshCwdFor(bin, { home: root })).toBe(path.join(root, 'proj'));
    expect(dshCwdFor('', { home: root })).toBe(root);
  });

  it('derives the built-in default by detection instead of baking in a path', () => {
    // the source itself must not contain a machine-specific user profile
    const src = fs.readFileSync(new URL('../../src/dsh-path.js', import.meta.url), 'utf8');
    expect(src).not.toMatch(/Users[\\/]\\d+/);
    // whatever the default ends up being here, it came from the candidate list
    if (DEFAULT_DSH_BIN) expect(dshBinCandidates()).toContain(DEFAULT_DSH_BIN);
    if (DEFAULT_DSH_CWD) expect(fs.existsSync(DEFAULT_DSH_CWD)).toBe(true);
  });

  it('still lists candidates for a machine where nothing exists', () => {
    const c = dshBinCandidates({ home: root, appData: path.join(root, 'roaming'), pathEnv: path.join(root, 'onpath') });
    expect(c[0]).toBe(path.join(root, 'roaming', 'npm', 'dsh.cmd'));
    expect(c).toContain(path.join(root, 'onpath', 'dsh.cmd'));
    expect(c).toContain(path.join(root, 'dsh-scratch', 'node_modules', '.bin', 'dsh.cmd'));
  });
});
