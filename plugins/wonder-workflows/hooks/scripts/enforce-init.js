// plugins/wonder-workflows/hooks/scripts/enforce-init.js
'use strict';
const { readState } = require('./lib/state.js');
const { checkCrossCommandGate, checkStepOrdering } = require('./lib/init-guard.js');

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw || '{}');
    const filePath = input.tool_input && input.tool_input.file_path;
    if (!filePath) { process.exit(0); return; }

    const cwd = input.cwd || process.cwd();
    const state = readState(cwd);

    const stepViolation = checkStepOrdering(filePath, state);
    if (stepViolation) {
      process.stdout.write(JSON.stringify(deny(stepViolation.reason)));
      process.exit(0);
      return;
    }

    const gateViolation = checkCrossCommandGate(filePath, state);
    if (gateViolation) {
      process.stdout.write(JSON.stringify(deny(gateViolation.reason)));
    }
  } catch (_) { /* silently allow on any error */ }
  process.exit(0);
});

function deny(reason) {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason
    }
  };
}
