// plugins/wonder-harness/hooks/scripts/enforce-template.js
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { decide } = require('./lib/decide.js');
const { hasMarker } = require('./lib/marker.js');

function loadIndex(cwd) {
  try {
    const p = path.join(cwd || process.cwd(), '.claude', 'templates', 'index.json');
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) {
    return { version: 1, templates: [] }; // 인덱스 없으면 매칭 0 → 항상 허용
  }
}

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw || '{}');
    const index = loadIndex(input.cwd);
    const out = decide(input, index, hasMarker(input.session_id));
    if (out) {
      process.stdout.write(JSON.stringify(out));
    }
  } catch (_) { /* 조용히 허용 */ }
  process.exit(0);
});
