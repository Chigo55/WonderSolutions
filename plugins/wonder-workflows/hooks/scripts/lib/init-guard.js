// plugins/wonder-workflows/hooks/scripts/lib/init-guard.js
'use strict';

function normalize(p) {
  return String(p || '').replace(/\\/g, '/');
}

function isClaudeInternal(filePath) {
  return normalize(filePath).includes('/.claude/');
}

function extractRulesLayer(filePath) {
  const m = normalize(filePath).match(/\/\.claude\/rules\/([a-zA-Z0-9_-]+)\.md$/);
  return m ? m[1] : null;
}

function extractReportLayer(filePath) {
  const m = normalize(filePath).match(
    /\/\.claude\/reports\/wsf-init-([a-zA-Z0-9_-]+)-\d{8}-\d{6}\.html$/
  );
  return m ? m[1] : null;
}

// Returns null (allow) or { deny: true, reason: string }
function checkCrossCommandGate(filePath, state) {
  if (isClaudeInternal(filePath)) return null;
  if (!state) {
    return { deny: true, reason: 'wonder-workflows has not been initialized. Run /wsf-init first.' };
  }
  const hasAnyRules = state.rules && Object.keys(state.rules).some(l => state.rules[l] !== null);
  if (!hasAnyRules) {
    return { deny: true, reason: 'No layer has been fully initialized. Run /wsf-init [--layer] first.' };
  }
  return null;
}

function checkStepOrdering(filePath, state) {
  const rulesLayer = extractRulesLayer(filePath);
  if (rulesLayer) {
    if (!state || !state.adr || state.adr[rulesLayer] === null) {
      return {
        deny: true,
        reason: `ADR for ${rulesLayer} must be completed before generating rules. Complete Step 1 (adr-extract) first.`
      };
    }
    return null;
  }

  const reportLayer = extractReportLayer(filePath);
  if (reportLayer) {
    if (!state || !state.rules || state.rules[reportLayer] === null) {
      return {
        deny: true,
        reason: `Rules for ${reportLayer} must be generated before producing the report. Complete Step 2 (generate) first.`
      };
    }
    return null;
  }

  return null;
}

module.exports = {
  checkCrossCommandGate,
  checkStepOrdering,
  isClaudeInternal,
  extractRulesLayer,
  extractReportLayer
};

