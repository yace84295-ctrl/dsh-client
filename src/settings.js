// src/settings.js
// Lightweight JSON-backed settings store. Replaces electron-store with zero deps.
// Usage:
//   const s = new Settings('dsh-client');
//   s.set('theme', 'dark');
//   s.get('theme'); // 'dark'
//
// The settings file lives at <userData>/<productName>-settings.json on disk.
// For tests, you can pass a custom file path to `new Settings(productName, filePath)`.

'use strict';

const fs = require('fs');
const path = require('path');

class Settings {
  /**
   * @param {string} productName - Used as the default file basename
   * @param {string} [filePath] - Override for tests
   */
  constructor(productName, filePath) {
    if (filePath) {
      this.filePath = filePath;
    } else {
      // Lazy require electron so tests can run in plain Node without mocking.
      let userData;
      try {
        const { app } = require('electron');
        userData = app.getPath('userData');
      } catch (_err) {
        // Fallback for tests: use a per-product folder under process.cwd().
        userData = path.join(process.cwd(), '.userdata', productName);
      }
      this.filePath = path.join(userData, `${productName}-settings.json`);
    }
    this._cache = null;
  }

  _load() {
    if (this._cache) return this._cache;
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      this._cache = parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_err) {
      this._cache = {};
    }
    return this._cache;
  }

  /** Read a key; returns `defaultValue` if missing. */
  get(key, defaultValue) {
    const data = this._load();
    return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : defaultValue;
  }

  /** Set one or more keys. Returns the merged object. */
  set(patch) {
    const data = this._load();
    const next = { ...data, ...(patch || {}) };
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(next, null, 2));
    } catch (e) {
      // Don't throw — caller can still read in-memory state.
      console.error('[settings] write failed:', e.message);
    }
    this._cache = next;
    return next;
  }

  /** Wipe everything (used by the "reset settings" command). */
  clear() {
    this._cache = {};
    try {
      if (fs.existsSync(this.filePath)) fs.unlinkSync(this.filePath);
    } catch (_err) {
      /* ignore */
    }
  }

  /** Force re-read from disk (used after external edits). */
  reload() {
    this._cache = null;
    return this._load();
  }

  /** All keys, including defaults that haven't been written. */
  all() {
    return { ...this._load() };
  }
}

module.exports = { Settings };
