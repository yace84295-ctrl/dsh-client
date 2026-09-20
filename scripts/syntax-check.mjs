// scripts/syntax-check.mjs
// Cross-platform `node --check` sweep over the app's own sources.
//
// Why this file exists: the previous npm script inlined a POSIX `for f in src/*.js; do`
// loop, which cmd.exe (npm's default script-shell on Windows) cannot parse — so
// `npm run syntax-check` failed on Windows with "此时不应有 f" before checking anything.
// Enumerating from Node keeps the script shell-agnostic and picks up new src/*.js files
// automatically.

import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const files = [
  'main.js',
  'preload.js',
  ...readdirSync(path.join(root, 'src'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => `src/${f}`),
];

let failed = 0;
for (const f of files) {
  try {
    execFileSync(process.execPath, ['--check', path.join(root, f)], { stdio: 'pipe' });
    console.log(`OK   ${f}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL ${f}`);
    console.error((err.stderr || err.stdout || Buffer.from('')).toString().trim());
  }
}

if (failed > 0) {
  console.error(`syntax-check: ${failed} of ${files.length} file(s) failed`);
  process.exit(1);
}

console.log(`syntax-check: ${files.length} files OK`);
