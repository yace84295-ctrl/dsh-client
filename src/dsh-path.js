// src/dsh-path.js
// dsh binary detection + .env API key loader.
// Pure functions of "settings + ENV_FILE + fs" — easy to test.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_DSH_BIN = 'C:/Users/111/dsh-scratch/node_modules/.bin/dsh.cmd';
const DEFAULT_DSH_CWD = 'C:/Users/111/dsh-scratch';

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
  resolveEnvFile,
};
