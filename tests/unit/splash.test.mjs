// tests/unit/splash.test.mjs
import { describe, it, expect } from 'vitest';
import { buildSplashPayload, PHASES } from '../../src/splash.js';

describe('buildSplashPayload', () => {
  it('always includes phase and message', () => {
    const p = buildSplashPayload({ phase: 'init', message: 'hello' });
    expect(p.phase).toBe('init');
    expect(p.message).toBe('hello');
  });

  it('passes attempt + seconds through when given', () => {
    const p = buildSplashPayload({ phase: 'waiting', message: 'tick', attempt: 7, seconds: 3 });
    expect(p.attempt).toBe(7);
    expect(p.seconds).toBe(3);
  });

  it('computes progress in [0, 0.95] for the waiting phase', () => {
    const p = buildSplashPayload({ phase: 'waiting', message: 'tick', seconds: 30, timeoutMs: 60000 });
    expect(p.progress).toBeCloseTo(0.5, 5);
  });

  it('clamps waiting progress at 0.95 even when seconds > timeoutMs/1000', () => {
    const p = buildSplashPayload({ phase: 'waiting', message: 'tick', seconds: 999, timeoutMs: 60000 });
    expect(p.progress).toBe(0.95);
  });

  it('reports progress=1 for the ready phase', () => {
    const p = buildSplashPayload({ phase: 'ready', message: 'go' });
    expect(p.progress).toBe(1);
  });

  it('does NOT set progress for the error phase', () => {
    const p = buildSplashPayload({ phase: 'error', message: 'boom', seconds: 10, timeoutMs: 1000 });
    expect(p.progress).toBeUndefined();
  });
});

describe('PHASES', () => {
  it('exposes the expected phase constants', () => {
    expect(PHASES.INIT).toBe('init');
    expect(PHASES.STARTING).toBe('starting');
    expect(PHASES.WAITING).toBe('waiting');
    expect(PHASES.READY).toBe('ready');
    expect(PHASES.ERROR).toBe('error');
    expect(PHASES.PATH_MISSING).toBe('path-missing');
    expect(PHASES.PATH_SET).toBe('path-set');
  });
});
