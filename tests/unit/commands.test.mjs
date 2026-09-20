// tests/unit/commands.test.mjs
// Command palette registry + fuzzy matcher.

import { describe, it, expect } from 'vitest';
import { commands, fuzzySearch, fuzzyScore } from '../../src/commands.js';

describe('commands registry', () => {
  it('contains more than 10 commands', () => {
    expect(commands.length).toBeGreaterThan(10);
  });

  it('every command has id, label, action', () => {
    for (const cmd of commands) {
      expect(typeof cmd.id).toBe('string');
      expect(typeof cmd.label).toBe('string');
      expect(cmd.id.length).toBeGreaterThan(0);
      expect(cmd.label.length).toBeGreaterThan(0);
      expect(typeof cmd.action).toBe('string');
    }
  });

  it('every command id is unique', () => {
    const ids = commands.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every action is unique (no two commands fire the same IPC channel)', () => {
    const actions = commands.map((c) => c.action);
    expect(new Set(actions).size).toBe(actions.length);
  });

  it('contains the expected core commands', () => {
    const ids = commands.map((c) => c.id);
    for (const expected of [
      'app.quit',
      'window.toggle',
      'theme.toggle',
      'screenshot.take',
      'dsh.reload',
      'app.openInBrowser',
    ]) {
      expect(ids).toContain(expected);
    }
  });
});

describe('fuzzySearch', () => {
  it('returns every command when query is empty', () => {
    expect(fuzzySearch('').length).toBe(commands.length);
  });

  it('finds theme.toggle when querying "theme"', () => {
    const result = fuzzySearch('theme');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].id).toBe('theme.toggle');
  });

  it('finds screenshot.take when querying "screen"', () => {
    const result = fuzzySearch('screen');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].id).toBe('screenshot.take');
  });

  it('finds commands by Chinese keywords', () => {
    const result = fuzzySearch('主题');
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((c) => c.id === 'theme.toggle')).toBe(true);
  });

  it('returns an empty array for queries with no match', () => {
    expect(fuzzySearch('zzzzzzzzz_nope')).toEqual([]);
  });

  it('prefers consecutive matches over scattered ones (higher score)', () => {
    const matches = fuzzySearch('dsh');
    expect(matches[0].id).toBe('dsh.reload');
  });
});

describe('fuzzyScore', () => {
  it('returns 0 when query chars cannot be matched in order', () => {
    expect(fuzzyScore('xyz', 'abc')).toBe(0);
  });

  it('returns a positive score when query matches', () => {
    expect(fuzzyScore('foo', 'foobar')).toBeGreaterThan(0);
  });

  it('scores consecutive matches higher than scattered ones', () => {
    // 'abcabc' has the substring "abc" consecutively at index 0, 3 — but for
    // a SINGLE match, consec vs scattered only differs in the run-length
    // bonus. Use inputs where consecutive characters in the haystack are
    // hit by consecutive characters in the query.
    const consec = fuzzyScore('ab', 'xxabxx', 'xyz');       // 'ab' matched as run
    const scattered = fuzzyScore('ab', 'xaxbxx', 'xyz');    // 'a','b' separated by 'x'
    expect(consec).toBeGreaterThan(scattered);
  });

  it('gives a bonus when the query matches inside the id', () => {
    const withId = fuzzyScore('foo', 'something foo bar', 'foo');
    const withoutId = fuzzyScore('foo', 'something foo bar', '');
    expect(withId).toBeGreaterThan(withoutId);
  });

  it('is case-insensitive', () => {
    expect(fuzzyScore('FOO', 'foobar')).toBe(fuzzyScore('foo', 'foobar'));
  });
});
