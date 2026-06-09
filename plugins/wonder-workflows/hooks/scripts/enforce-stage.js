// plugins/wonder-workflows/hooks/scripts/enforce-stage.js
'use strict';
const { readState } = require('./lib/state.js');
const { checkStagePermission } = require('./lib/stage-guard.js');

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw || '{}');
    const filePath = input.tool_input && input.tool_input.file_path;
    if (!filePath) { process.exit(0); return; }

    const cwd = input.cwd || process.cwd();
    const state = readState(cwd);

    const violation = checkStagePermission(filePath, state);
    if (violation) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: violation.reason
        }
      }));
    }
  } catch (_) { /* silently allow on any error */ }
  process.exit(0);
});
