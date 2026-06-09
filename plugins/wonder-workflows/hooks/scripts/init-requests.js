// plugins/wonder-workflows/hooks/scripts/init-requests.js
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { writeState } = require('./lib/state.js');

const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..', '..');
const SEEDS = ['create_request.md', 'modify_request.md'];

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw || '{}');
    const cwd = input.cwd || process.cwd();
    const destDir = path.join(cwd, '.claude', 'requests');

    fs.mkdirSync(destDir, { recursive: true });

    for (const seed of SEEDS) {
      const dest = path.join(destDir, seed);
      if (!fs.existsSync(dest)) {
        const src = path.join(PLUGIN_ROOT, 'requests', seed);
        fs.copyFileSync(src, dest);
      }
    }

    writeState(cwd, (s) => ({ ...s, requests_copied: true }));
  } catch (_) { /* silently ignore */ }
  process.exit(0);
});
