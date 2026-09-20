// src/dsh-manager.js
// Spawn / kill the dsh child process and poll for readiness.
// Pure orchestrator: doesn't import electron, just child_process + http.

'use strict';

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const DSH_URL = 'http://127.0.0.1:3080';
const DSH_PORT = 3080;
const READY_TIMEOUT_MS = 60000;

/**
 * Spawn the dsh child process. Returns the ChildProcess handle.
 * `onStderr` / `onStdout` callbacks receive string chunks (already decoded).
 */
function spawnDsh({ bin, cwd, env = {} }) {
  if (!fs.existsSync(bin)) {
    throw new Error(`dsh 二进制不存在: ${bin}`);
  }
  if (!fs.existsSync(cwd)) {
    throw new Error(`dsh 工作目录不存在: ${cwd}`);
  }

  // `--no-open`: dsh otherwise launches the system default browser as well,
  // which duplicates the UI that this app already renders itself.
  const child = spawn('cmd.exe', ['/c', bin, 'web', '--no-open'], {
    cwd,
    env: { ...process.env, ...env, NODE_ENV: env.NODE_ENV || process.env.NODE_ENV || 'production' },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return child;
}

/** Best-effort terminate the whole process tree (Windows uses taskkill). */
function killProcessTree(child, platform = process.platform) {
  if (!child || child.killed) return;
  try {
    if (platform === 'win32' && child.pid) {
      spawn('taskkill', ['/pid', String(child.pid), '/f', '/t'], { windowsHide: true });
    } else {
      child.kill();
    }
  } catch (_err) {
    /* swallow */
  }
}

/** Heuristic: did this log line signal "listening on 3080 / ready"? */
function looksReady(line) {
  return /listening|ready|started|3080/i.test(line);
}

/**
 * Poll http://127.0.0.1:3080/ until it responds or `timeoutMs` elapses.
 * Returns a Promise that resolves with the number of attempts on success,
 * or rejects with an Error on timeout.
 *
 * `onTick(attempts, secondsElapsed)` runs once per attempt — used for
 * splash progress feedback.
 */
function waitForDshReady({
  port = DSH_PORT,
  host = '127.0.0.1',
  timeoutMs = READY_TIMEOUT_MS,
  intervalMs = 500,
  requestTimeoutMs = 1500,
  onTick,
} = {}) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    let attempts = 0;

    const attempt = () => {
      attempts++;
      if (onTick) onTick(attempts, Math.round((Date.now() - start) / 1000));
      const req = http.get({ host, port, path: '/', timeout: requestTimeoutMs }, (res) => {
        res.resume();
        resolve(attempts);
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`dsh 启动超时 (${Math.round(timeoutMs / 1000)}s),端口 ${port} 未响应`));
        } else {
          setTimeout(attempt, intervalMs);
        }
      });
      req.on('timeout', () => req.destroy(new Error('timeout')));
    };

    attempt();
  });
}

module.exports = {
  spawnDsh,
  killProcessTree,
  waitForDshReady,
  looksReady,
  DSH_URL,
  DSH_PORT,
  READY_TIMEOUT_MS,
};
