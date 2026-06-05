// plugins/wonder-harness/hooks/scripts/lib/decide.js
'use strict';
const { matchesTemplate } = require('./index-match.js');

// Returns: null (allow) | { hookSpecificOutput: {...} } (deny/block)
function decide(input, index, markerPresent) {
  const filePath = input && input.tool_input && input.tool_input.file_path;
  if (!filePath) return null;
  if (!matchesTemplate(filePath, index)) return null;
  if (markerPresent) return null;
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        'A template matching this path exists in the catalog. Please read .claude/templates/index.json first to explore existing templates before creating the file.'
    }
  };
}

module.exports = { decide };
