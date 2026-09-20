// src/dsh-path.js
// dsh binary detection + .env API key loader.
// Pure functions of "settings + ENV_FILE + fs" — easy to test.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const DSH_SHIM_NAMES = process.platform === 'win32' ? ['dsh.cmd', 'dsh.exe', 'dsh.bat'] : ['dsh'];

function existsSyncSafe(p) {
  try {
    return !!p && fs.existsSync(p);
  } catch (_err) {
    return false;
  }
}

/**
 * Where a dsh shim might live, highest priority first:
 *   1. npm's global shim directory (%APPDATA%\npm on Windows)
 *   2. every directory on PATH
 *   3. the dev-scratch install documented in docs/development.md (~/dsh-scratch)
 * Every input is overridable so this stays a pure, testable function.
 */
function dshBinCandidates({
  home = os.homedir(),
  appData = process.env.APPDATA || path.join(os.homedir(), 'AppData/Roaming'),
  pathEnv = process.env.PATH,
} = {}) {
  const dirs = [];
  if (appData) dirs.push(path.join(appData, 'npm'));
  for (const dir of String(pathEnv || '').split(path.delimiter)) {
    if (dir) dirs.push(dir);
  }
  if (home) dirs.push(path.join(home, 'dsh-scratch', 'node_modules', '.bin'));
  const out = [];
  for (const dir of dirs) {
    for (const name of DSH_SHIM_NAMES) out.push(path.join(dir, name));
  }
  return out;
}

/** First dsh shim that exists on disk, or '' when the user has to point us at one. */
function detectDshBin(opts) {
  return dshBinCandidates(opts).find(existsSyncSafe) || '';
}

/** Workspace for dsh: the project owning node_modules/.bin, else the home directory. */
function dshCwdFor(bin, { home = os.homedir() } = {}) {
  if (bin) {
    const parts = path.normalize(bin).split(path.sep);
    const i = parts.lastIndexOf('node_modules');
    if (i > 0 && parts[i + 1] === '.bin') {
      const project = parts.slice(0, i).join(path.sep);
      if (existsSyncSafe(project)) return project;
    }
  }
  return existsSyncSafe(home) ? home : '';
}

const DEFAULT_DSH_BIN = detectDshBin();
const DEFAULT_DSH_CWD = dshCwdFor(DEFAULT_DSH_BIN);

/** Candidate env files, highest priority first. */
function candidateEnvFiles() {
  const home = os.homedir();
  const appData = process.env.APPDATA || path.join(home, 'AppData/Roaming');
  const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData/Local');
  const list = [];
  if (process.env.DSH_ENV_FILE) list.push(process.env.DSH_ENV_FILE);
  // our own config dir, next to dsh-client-settings.json
  list.push(path.join(appData, 'dsh-client', '.env'));
  // legacy location, kept as a read-only fallback so existing setups keep working
  list.push(path.join(localAppData, 'hermes', '.env'));
  return list;
}

/** Preferred env file location (what "set your key here" messages point at). */
function defaultEnvFile() {
  return candidateEnvFiles()[0];
}

/** First candidate that exists on disk, else the preferred one. */
function resolveEnvFile() {
  const candidates = candidateEnvFiles();
  const found = candidates.find((f) => {
    try {
      return fs.existsSync(f);
    } catch (_err) {
      return false;
    }
  });
  return found || candidates[0];
}

/**
 * Resolve the dsh executable path. Resolution order:
 *   1. settings.dshBin
 *   2. process.env.DSH_BIN
 *   3. DEFAULT_DSH_BIN
 */
function resolveDshBin(settings = {}) {
  return settings.dshBin || process.env.DSH_BIN || DEFAULT_DSH_BIN;
}

/** Same order, but for cwd. */
function resolveDshCwd(settings = {}) {
  return settings.dshCwd || process.env.DSH_CWD || DEFAULT_DSH_CWD;
}

function resolveDshPaths(settings) {
  return { bin: resolveDshBin(settings), cwd: resolveDshCwd(settings) };
}

/** Read DEEPSEEK_API_KEY from the env file. Returns '' if missing or malformed. */
function readApiKey(envFile) {
  const file = envFile || resolveEnvFile();
  try {
    const text = fs.readFileSync(file, 'utf8');
    const m = text.match(/^DEEPSEEK_API_KEY\s*=\s*(.+)$/m);
    return m ? m[1].trim() : '';
  } catch (_err) {
    return '';
  }
}

/** Returns true if both the dsh bin and cwd exist on disk. */
function pathsLookValid({ bin, cwd }) {
  if (!bin || !cwd) return false;
  let binOk, cwdOk;
  try { binOk = fs.existsSync(bin); } catch (_err) { binOk = false; }
  try { cwdOk = fs.existsSync(cwd); } catch (_err) { cwdOk = false; }
  return binOk && cwdOk;
}

/** Mask an API key for display: first 7 + "…" + last 4. */
function maskApiKey(key) {
  if (!key) return '';
  if (key.length <= 12) return '••••';
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}

module.exports = {
  DEFAULT_DSH_BIN,
  DEFAULT_DSH_CWD,
  resolveDshBin,
  resolveDshCwd,
  resolveDshPaths,
  readApiKey,
  pathsLookValid,
  maskApiKey,
  defaultEnvFile,
  candidateEnvFiles,
  dshBinCandidates,
  detectDshBin,
  dshCwdFor,
  resolveEnvFile,
};
