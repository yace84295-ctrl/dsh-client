// src/logger.js
// Tiny ring-buffer log store with stdout mirroring. 1000 lines by default.
// console.log/error/warn are patched once at import time to feed the buffer.

'use strict';

const DEFAULT_SIZE = 1000;

function formatStamp() {
  return new Date().toISOString().replace('T', ' ').replace('Z', '');
}

function createLogger({ size = DEFAULT_SIZE, sink = console } = {}) {
  const buffer = [];
  const patchTarget = sink || console;

  function append(level, line) {
    const entry = `[${formatStamp()}] [${level}] ${String(line).replace(/\r?\n$/, '')}`;
    buffer.push(entry);
    if (buffer.length > size) buffer.splice(0, buffer.length - size);
    return entry;
  }

  function snapshot() {
    return {
      buffer: buffer.slice(),
      size,
      total: buffer.length,
    };
  }

  function clear() {
    buffer.length = 0;
  }

  // Monkey-patch the console so every log/error/warn from anywhere in the app
  // also lands in the ring buffer. Returns a teardown function.
  let patched = false;
  let originals = null;
  function patchConsole() {
    if (patched) return;
    originals = {
      log:   patchTarget.log.bind(patchTarget),
      error: patchTarget.error.bind(patchTarget),
      warn:  patchTarget.warn.bind(patchTarget),
      info:  patchTarget.info ? patchTarget.info.bind(patchTarget) : patchTarget.log.bind(patchTarget),
    };
    patchTarget.log   = (...a) => { originals.log(...a);   append('info',  a.map(String).join(' ')); };
    patchTarget.error = (...a) => { originals.error(...a); append('error', a.map(String).join(' ')); };
    patchTarget.warn  = (...a) => { originals.warn(...a);  append('warn',  a.map(String).join(' ')); };
    if (patchTarget.info && patchTarget.info !== patchTarget.log) {
      patchTarget.info  = (...a) => { originals.info(...a);  append('info',  a.map(String).join(' ')); };
    }
    patched = true;
  }

  function unpatchConsole() {
    if (!patched || !originals) return;
    patchTarget.log = originals.log;
    patchTarget.error = originals.error;
    patchTarget.warn = originals.warn;
    if (patchTarget.info) patchTarget.info = originals.info;
    patched = false;
    originals = null;
  }

  return {
    append,
    snapshot,
    clear,
    patchConsole,
    unpatchConsole,
    _buffer: buffer, // exposed for tests
  };
}

module.exports = { createLogger, DEFAULT_SIZE };
