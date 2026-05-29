// plugins/wonder-harness/hooks/scripts/mark-template-read.js
'use strict';
const { setMarker } = require('./lib/marker.js');

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw || '{}');
    const fp = String((input.tool_input && input.tool_input.file_path) || '').replace(/\\/g, '/');
    if (fp.endsWith('.claude/templates/index.json')) {
      setMarker(input.session_id);
    }
  } catch (_) { /* 조용히 무시 */ }
  process.exit(0);
});
