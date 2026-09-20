// tests/unit/window-state.test.mjs
import { describe, it, expect, vi } from 'vitest';
import { boundsFitAnyDisplay, pickInitialBounds, makeSaver } from '../../src/window-state.js';

const ONE_DISPLAY = [{ bounds: { x: 0, y: 0, width: 1920, height: 1080 } }];

describe('boundsFitAnyDisplay', () => {
  it('returns false for missing bounds', () => {
    expect(boundsFitAnyDisplay(null, ONE_DISPLAY)).toBe(false);
    expect(boundsFitAnyDisplay(undefined, ONE_DISPLAY)).toBe(false);
  });

  it('returns true when the window sits inside the only display', () => {
    expect(boundsFitAnyDisplay({ x: 100, y: 100, width: 800, height: 600 }, ONE_DISPLAY)).toBe(true);
  });

  it('returns false when the window is entirely off-screen', () => {
    expect(boundsFitAnyDisplay({ x: 5000, y: 5000, width: 200, height: 200 }, ONE_DISPLAY)).toBe(false);
  });

  it('returns true when only a corner pokes into a display', () => {
    expect(boundsFitAnyDisplay({ x: 1900, y: 1000, width: 100, height: 100 }, ONE_DISPLAY)).toBe(true);
  });

  it('returns false for non-numeric values', () => {
    expect(boundsFitAnyDisplay({ x: 'foo', y: 0, width: 100, height: 100 }, ONE_DISPLAY)).toBe(false);
    expect(boundsFitAnyDisplay({ x: 0, y: 0, width: 0, height: 0 }, ONE_DISPLAY)).toBe(false);
  });

  it('handles an empty display list', () => {
    expect(boundsFitAnyDisplay({ x: 0, y: 0, width: 100, height: 100 }, [])).toBe(false);
  });

  it('matches against any of multiple displays', () => {
    const displays = [
      { bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
      { bounds: { x: 1920, y: 0, width: 1920, height: 1080 } },
    ];
    expect(boundsFitAnyDisplay({ x: 2000, y: 100, width: 800, height: 600 }, displays)).toBe(true);
  });
});

describe('pickInitialBounds', () => {
  it('returns saved bounds when they fit', () => {
    const saved = { x: 100, y: 100, width: 800, height: 600 };
    expect(pickInitialBounds(saved, ONE_DISPLAY)).toEqual(saved);
  });

  it('returns fallback when saved bounds do not fit', () => {
    const saved = { x: 5000, y: 5000, width: 800, height: 600 };
    const fallback = { x: 0, y: 0, width: 1400, height: 900 };
    expect(pickInitialBounds(saved, ONE_DISPLAY, fallback)).toEqual(fallback);
  });

  it('returns null when neither fits nor fallback given', () => {
    const saved = { x: 5000, y: 5000, width: 800, height: 600 };
    expect(pickInitialBounds(saved, ONE_DISPLAY)).toBeNull();
  });

  it('returns fallback when saved bounds are missing', () => {
    expect(pickInitialBounds(null, ONE_DISPLAY, { x: 0, y: 0, width: 1, height: 1 })).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  });

  it('returns null when saved bounds are missing AND no fallback given', () => {
    expect(pickInitialBounds(null, ONE_DISPLAY)).toBeNull();
  });
});

describe('makeSaver', () => {
  it('writes windowBounds + windowMaximized to settings', () => {
    const writeSettings = vi.fn();
    const save = makeSaver(writeSettings);
    const win = {
      isMaximized: () => false,
      getBounds: () => ({ x: 200, y: 150, width: 1400, height: 900 }),
      isDestroyed: () => false,
    };
    save(win);
    expect(writeSettings).toHaveBeenCalledWith({
      windowBounds: { x: 200, y: 150, width: 1400, height: 900 },
      windowMaximized: false,
    });
  });

  it('uses getNormalBounds when maximized', () => {
    const writeSettings = vi.fn();
    const save = makeSaver(writeSettings);
    const win = {
      isMaximized: () => true,
      getNormalBounds: () => ({ x: 50, y: 50, width: 1280, height: 800 }),
      isDestroyed: () => false,
    };
    save(win);
    expect(writeSettings).toHaveBeenCalledWith(expect.objectContaining({
      windowBounds: { x: 50, y: 50, width: 1280, height: 800 },
      windowMaximized: true,
    }));
  });

  it('does nothing when the window is destroyed', () => {
    const writeSettings = vi.fn();
    const save = makeSaver(writeSettings);
    save({ isDestroyed: () => true });
    expect(writeSettings).not.toHaveBeenCalled();
  });
});
