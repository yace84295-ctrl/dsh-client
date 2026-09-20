// src/splash.js
// Small lifecycle wrapper around the splash BrowserWindow. Keeps the actual
// window-creation logic in main.js (because it needs BrowserWindow), but
// the message protocol is testable.

'use strict';

/**
 * Compute the next payload for the splash UI based on attempt count
 * and elapsed seconds. Pure function, easy to snapshot-test.
 */
function buildSplashPayload({ phase, message, attempt, seconds, timeoutMs }) {
  const payload = { phase, message };
  if (typeof attempt === 'number') payload.attempt = attempt;
  if (typeof seconds === 'number') payload.seconds = seconds;
  if (phase === 'waiting' && timeoutMs) {
    payload.progress = Math.min(0.95, seconds / (timeoutMs / 1000));
  }
  if (phase === 'ready') payload.progress = 1;
  return payload;
}

const PHASES = {
  INIT:        'init',
  STARTING:    'starting',
  WAITING:     'waiting',
  READY:       'ready',
  ERROR:       'error',
  PATH_MISSING:'path-missing',
  PATH_SET:    'path-set',
};

module.exports = { buildSplashPayload, PHASES };
