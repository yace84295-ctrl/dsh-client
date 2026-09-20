// tests/unit/logger.test.mjs
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createLogger, DEFAULT_SIZE } from '../../src/logger.js';

function fakeConsole() {
  return {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  };
}

describe('logger.append / snapshot', () => {
  let log;
  beforeEach(() => {
    log = createLogger({ size: 5, sink: fakeConsole() });
  });

  it('appends a timestamped line', () => {
    log.append('info', 'hello world');
    const snap = log.snapshot();
    expect(snap.total).toBe(1);
    expect(snap.buffer[0]).toMatch(/\[info\] hello world/);
  });

  it('strips trailing newlines', () => {
    log.append('info', 'line with newline\n');
    expect(log.snapshot().buffer[0]).not.toMatch(/\n$/);
  });

  it('respects the configured buffer size', () => {
    for (let i = 0; i < 12; i++) log.append('info', `line ${i}`);
    const snap = log.snapshot();
    expect(snap.size).toBe(5);
    expect(snap.total).toBe(5);
    expect(snap.buffer[0]).toMatch(/line 7/);
  });

  it('clear() empties the buffer', () => {
    log.append('info', 'a');
    log.clear();
    expect(log.snapshot().total).toBe(0);
  });

  it('default size is 1000', () => {
    expect(DEFAULT_SIZE).toBe(1000);
  });
});

describe('logger.patchConsole', () => {
  let sink;
  let log;
  beforeEach(() => {
    sink = fakeConsole();
    log = createLogger({ size: 100, sink });
  });
  afterEach(() => {
    log.unpatchConsole();
  });

  it('patches console.log/error/warn', () => {
    log.patchConsole();
    sink.log('hello');
    sink.error('boom');
    sink.warn('careful');
    expect(log.snapshot().total).toBe(3);
    expect(log.snapshot().buffer.some((l) => l.includes('[info]') && l.includes('hello'))).toBe(true);
    expect(log.snapshot().buffer.some((l) => l.includes('[error]') && l.includes('boom'))).toBe(true);
    expect(log.snapshot().buffer.some((l) => l.includes('[warn]') && l.includes('careful'))).toBe(true);
  });

  it('still calls the underlying sink after patching', () => {
    // Track calls on the original (pre-patch) sink
    const origLog = sink.log;
    log.patchConsole();
    sink.log('still here');
    expect(origLog).toHaveBeenCalledWith('still here');
  });

  it('unpatchConsole restores originals', () => {
    log.patchConsole();
    log.unpatchConsole();
    sink.log('after');
    expect(log.snapshot().total).toBe(0);
  });

  it('patching twice is idempotent', () => {
    log.patchConsole();
    const before = sink.log;
    log.patchConsole();
    expect(sink.log).toBe(before);
  });
});
