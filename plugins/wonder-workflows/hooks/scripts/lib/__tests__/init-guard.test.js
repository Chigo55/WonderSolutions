// plugins/wonder-workflows/hooks/scripts/lib/__tests__/init-guard.test.js
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  checkCrossCommandGate,
  checkStepOrdering,
  isClaudeInternal,
  extractRulesLayer,
  extractReportLayer
} = require('../init-guard.js');

const partialState = {
  version: 1, requests_copied: true,
  adr:     { backend: '2026-06-05T10:00:00Z', frontend: null, security: null },
  rules:   { backend: '2026-06-05T10:05:00Z', frontend: null, security: null },
  reports: { backend: null, frontend: null, security: null }
};

describe('isClaudeInternal', () => {
  it('returns true for .claude/ paths', () => {
    assert.equal(isClaudeInternal('/project/.claude/rules/backend.md'), true);
  });
  it('returns true for Windows backslash .claude paths', () => {
    assert.equal(isClaudeInternal('D:\\project\\.claude\\rules\\backend.md'), true);
  });
  it('returns false for project source files', () => {
    assert.equal(isClaudeInternal('/project/src/main/java/Example.java'), false);
  });
});

describe('extractRulesLayer', () => {
  it('extracts backend from rules path', () => {
    assert.equal(extractRulesLayer('/project/.claude/rules/backend.md'), 'backend');
  });
  it('extracts frontend from rules path', () => {
    assert.equal(extractRulesLayer('/project/.claude/rules/frontend.md'), 'frontend');
  });
  it('returns null for non-rules .claude paths', () => {
    assert.equal(extractRulesLayer('/project/.claude/adr/backend.md'), null);
  });
  it('returns null for source files', () => {
    assert.equal(extractRulesLayer('/project/src/Backend.java'), null);
  });
});

describe('extractReportLayer', () => {
  it('extracts backend from report path', () => {
    const p = '/project/.claude/reports/wsf-init-backend-20260605-100500.html';
    assert.equal(extractReportLayer(p), 'backend');
  });
  it('extracts security from report path', () => {
    const p = '/project/.claude/reports/wsf-init-security-20260605-123456.html';
    assert.equal(extractReportLayer(p), 'security');
  });
  it('returns null for non-report html files', () => {
    assert.equal(extractReportLayer('/project/.claude/reports/other.html'), null);
  });
});

describe('checkCrossCommandGate', () => {
  it('allows .claude/ internal files even when state is null', () => {
    assert.equal(checkCrossCommandGate('/project/.claude/rules/backend.md', null), null);
  });
  it('denies external files when state is null', () => {
    const result = checkCrossCommandGate('/project/src/Main.java', null);
    assert.ok(result && result.deny);
    assert.ok(result.reason.includes('/wsf-init'));
  });
  it('denies when no layer has rules set', () => {
    const emptyRules = { rules: { backend: null, frontend: null, security: null } };
    const result = checkCrossCommandGate('/project/src/Main.java', emptyRules);
    assert.ok(result && result.deny);
  });
  it('allows when at least one layer has rules', () => {
    assert.equal(checkCrossCommandGate('/project/src/Main.java', partialState), null);
  });
});

describe('checkStepOrdering', () => {
  it('blocks writing rules when ADR not set for that layer', () => {
    const result = checkStepOrdering('/project/.claude/rules/frontend.md', partialState);
    assert.ok(result && result.deny);
    assert.ok(result.reason.includes('adr-extract'));
  });
  it('allows writing rules when ADR is set for that layer', () => {
    const result = checkStepOrdering('/project/.claude/rules/backend.md', partialState);
    assert.equal(result, null);
  });
  it('blocks writing report when rules not set for that layer', () => {
    const p = '/project/.claude/reports/wsf-init-frontend-20260605-100500.html';
    const result = checkStepOrdering(p, partialState);
    assert.ok(result && result.deny);
    assert.ok(result.reason.includes('generate'));
  });
  it('allows writing report when rules are set for that layer', () => {
    const p = '/project/.claude/reports/wsf-init-backend-20260605-100500.html';
    const result = checkStepOrdering(p, partialState);
    assert.equal(result, null);
  });
  it('returns null for unrelated source file paths', () => {
    assert.equal(checkStepOrdering('/project/src/Main.java', partialState), null);
  });
  it('returns null when state is null for unrelated paths', () => {
    assert.equal(checkStepOrdering('/project/src/Main.java', null), null);
  });
  it('blocks writing rules when state is null', () => {
    const result = checkStepOrdering('/project/.claude/rules/backend.md', null);
    assert.ok(result && result.deny);
  });
});
