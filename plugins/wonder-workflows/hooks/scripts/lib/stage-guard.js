// plugins/wonder-workflows/hooks/scripts/lib/stage-guard.js
'use strict';

function normalize(p) {
  return String(p || '').replace(/\\/g, '/');
}

// Returns null (allow) or { deny: true, reason: string }
function checkStagePermission(filePath, state) {
  if (!state) return null;
  if (!state?.current) return null;
  if (state.current.command !== 'wsf-run') return null;

  const stage = state.current.stage;
  if (!stage) return null;

  const norm = normalize(filePath);

  if (norm.includes('/.claude/runs/')) {
    if (norm.endsWith('/work-doc.md')) {
      if (!['analyzer', 'researcher', 'planner'].includes(stage)) {
        return { deny: true, reason: `work-doc.md can only be written during stages: analyzer, researcher, planner. Current stage: ${stage}.` };
      }
      return null;
    }
    if (norm.endsWith('/inspection-report.md')) {
      if (stage !== 'inspector') {
        return { deny: true, reason: `inspection-report.md can only be written during stage: inspector. Current stage: ${stage}.` };
      }
      return null;
    }
    if (norm.endsWith('/modification-report.md')) {
      if (stage !== 'modifier') {
        return { deny: true, reason: `modification-report.md can only be written during stage: modifier. Current stage: ${stage}.` };
      }
      return null;
    }
    return null;
  }

  if (norm.includes('/.claude/')) return null;

  if (!['developer', 'modifier'].includes(stage)) {
    return { deny: true, reason: `Code files can only be written during stages: developer, modifier. Current stage: ${stage}.` };
  }
  return null;
}

module.exports = { checkStagePermission };
