// src/window-state.js
// Save / restore window bounds with multi-display sanity check.

'use strict';

/**
 * Check whether `bounds` intersect any currently connected display.
 * bounds: { x, y, width, height }
 * displays: array of { bounds: { x, y, width, height } }
 */
function boundsFitAnyDisplay(bounds, displays) {
  if (!bounds || typeof bounds !== 'object') return false;
  const { x, y, width, height } = bounds;
  if ([x, y, width, height].some((v) => typeof v !== 'number' || Number.isNaN(v))) return false;
  if (width <= 0 || height <= 0) return false;
  return (displays || []).some((d) => {
    const b = d.bounds;
    return (
      x + width  > b.x &&
      y + height > b.y &&
      x < b.x + b.width &&
      y < b.y + b.height
    );
  });
}

/**
 * Compute the bounds to use when creating a window.
 * Returns `saved` if it fits on a current display, else `null` (caller
 * should fall back to its own default size).
 */
function pickInitialBounds(saved, displays, fallback) {
  if (saved == null) return fallback || null;
  if (boundsFitAnyDisplay(saved, displays)) return saved;
  return fallback || null;
}

/** Build a saveBounds() closure bound to a `writeSettings` function. */
function makeSaver(writeSettings) {
  return function saveBounds(win) {
    if (!win) return;
    if (typeof win.isDestroyed === 'function' && win.isDestroyed()) return;
    const isMax = typeof win.isMaximized === 'function' && win.isMaximized();
    const bounds = isMax && typeof win.getNormalBounds === 'function' ? win.getNormalBounds() : win.getBounds();
    writeSettings({ windowBounds: bounds, windowMaximized: isMax });
  };
}

module.exports = { boundsFitAnyDisplay, pickInitialBounds, makeSaver };
