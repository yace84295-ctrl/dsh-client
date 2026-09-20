// tests/unit/dsh-manager.test.mjs
import { describe, it, expect } from 'vitest';
import { looksReady, DSH_URL, DSH_PORT, READY_TIMEOUT_MS } from '../../src/dsh-manager.js';

describe('looksReady', () => {
  it('matches "listening" lines', () => {
    expect(looksReady('Server listening on 3080')).toBe(true);
  });

  it('matches "ready" lines', () => {
    expect(looksReady('Server is ready to accept connections')).toBe(true);
  });

  it('matches "started" lines', () => {
    expect(looksReady('dsh started in 1.2s')).toBe(true);
  });

  it('matches when 3080 appears anywhere in the line', () => {
    expect(looksReady('Listening on http://127.0.0.1:3080')).toBe(true);
  });

  it('does not match unrelated lines', () => {
    expect(looksReady('Compiling TypeScript...')).toBe(false);
    expect(looksReady('loading module xyz')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(looksReady('READY')).toBe(true);
    expect(looksReady('LISTENING')).toBe(true);
  });
});

describe('module exports', () => {
  it('exports the dsh URL, port, and timeout', () => {
    expect(DSH_URL).toBe('http://127.0.0.1:3080');
    expect(DSH_PORT).toBe(3080);
    expect(READY_TIMEOUT_MS).toBe(60000);
  });
});
