// docs/screenshot-script.js
// Spawn one Electron process per screenshot so each capture starts clean.
// Usage: node docs/screenshot-script.js [light|dark|palette|about]

'use strict';

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const THIS_DIR = __dirname;
const SHOT = process.argv[2] || 'all';

const VARIANTS = [
  { name: 'screenshot-light', theme: 'light',   openPalette: false, openAbout: false },
  { name: 'screenshot-dark',  theme: 'dark',    openPalette: false, openAbout: false },
  // Use light theme for the command palette screenshot so the white modal panel
  // is visually distinct from the page background.
  { name: 'command-palette',  theme: 'light',   openPalette: true,  openAbout: false },
  // Use light theme for the about dialog for the same reason.
  { name: 'about',            theme: 'light',   openPalette: false, openAbout: true  },
];

function runOne(variant) {
  return new Promise((resolve, reject) => {
    const args = [
      path.join(THIS_DIR, '_capture-one.js'),
      JSON.stringify(variant),
    ];
    const proc = spawn(process.execPath, [path.join(THIS_DIR, '..', 'node_modules', 'electron', 'cli.js'), ...args], {
      stdio: 'inherit',
      cwd: THIS_DIR,
    });
    proc.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`exit ${code}`)));
  });
}

(async () => {
  fs.mkdirSync(path.join(THIS_DIR, 'screenshots'), { recursive: true });
  const targets = SHOT === 'all' ? VARIANTS : VARIANTS.filter((v) => v.name === SHOT || v.name.includes(SHOT));
  for (const v of targets) {
    console.log(`\n=== Capturing ${v.name} ===`);
    await runOne(v);
  }
  console.log('\nAll done.');
})();