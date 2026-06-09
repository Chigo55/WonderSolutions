// plugins/wonder-workflows/hooks/scripts/write-state.js
// Called from wsf-init.md steps via Bash tool after each ruler step completes.
// Usage: node write-state.js <cwd> <dotted.field> <value>
// Examples:
//   node write-state.js /project requests_copied true
//   node write-state.js /project adr.backend 2026-06-05T10:00:00Z
//   node write-state.js /project reports.backend wsf-init-backend-20260605-100500.html
'use strict';
const { writeState } = require('./lib/state.js');

const [,, cwd, field, value] = process.argv;
if (!cwd || !field) {
  process.stderr.write('Usage: node write-state.js <cwd> <field> <value>\n');
  process.exit(1);
}

function parseValue(v) {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null') return null;
  return v;
}

try {
  const parts = field.split('.');
  writeState(cwd, (state) => {
    if (parts.length === 1) {
      return { ...state, [parts[0]]: parseValue(value) };
    }
    return {
      ...state,
      [parts[0]]: { ...state[parts[0]], [parts[1]]: parseValue(value) }
    };
  });
  process.exit(0);
} catch (err) {
  process.stderr.write(err.message + '\n');
  process.exit(1);
}
