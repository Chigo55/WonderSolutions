'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { checkStagePermission } = require('../stage-guard.js');

function state(stage, command = 'wsf-run') {
  return { current: { command, stage, 'run-id': '20260606-test' } };
}

describe('checkStagePermission — no enforcement outside wsf-run', () => {
  it('allows when command is null', () => {
    assert.equal(checkStagePermission('/proj/src/Foo.java', state('developer', null)), null);
  });
  it('allows when command is wsf-init', () => {
    assert.equal(checkStagePermission('/proj/src/Foo.java', state('developer', 'wsf-init')), null);
  });
  it('allows when state is null', () => {
    assert.equal(checkStagePermission('/proj/src/Foo.java', null), null);
  });
  it('allows when state.current is missing (malformed state)', () => {
    assert.equal(checkStagePermission('/proj/src/Foo.java', {}), null);
  });
});

describe('checkStagePermission — work-doc.md', () => {
  const doc = '/proj/.claude/runs/20260606-test/work-doc.md';
  it('allows analyzer to write work-doc.md', () => assert.equal(checkStagePermission(doc, state('analyzer')), null));
  it('allows researcher to write work-doc.md', () => assert.equal(checkStagePermission(doc, state('researcher')), null));
  it('allows planner to write work-doc.md', () => assert.equal(checkStagePermission(doc, state('planner')), null));
  it('denies developer writing work-doc.md', () => assert.ok(checkStagePermission(doc, state('developer'))?.deny));
  it('denies inspector writing work-doc.md', () => assert.ok(checkStagePermission(doc, state('inspector'))?.deny));
  it('denies modifier writing work-doc.md', () => assert.ok(checkStagePermission(doc, state('modifier'))?.deny));
});

describe('checkStagePermission — inspection-report.md', () => {
  const rpt = '/proj/.claude/runs/20260606-test/inspection-report.md';
  it('allows inspector to write inspection-report.md', () => assert.equal(checkStagePermission(rpt, state('inspector')), null));
  it('denies analyzer writing inspection-report.md', () => assert.ok(checkStagePermission(rpt, state('analyzer'))?.deny));
  it('denies developer writing inspection-report.md', () => assert.ok(checkStagePermission(rpt, state('developer'))?.deny));
});

describe('checkStagePermission — modification-report.md', () => {
  const rpt = '/proj/.claude/runs/20260606-test/modification-report.md';
  it('allows modifier to write modification-report.md', () => assert.equal(checkStagePermission(rpt, state('modifier')), null));
  it('denies inspector writing modification-report.md', () => assert.ok(checkStagePermission(rpt, state('inspector'))?.deny));
  it('denies analyzer writing modification-report.md', () => assert.ok(checkStagePermission(rpt, state('analyzer'))?.deny));
  it('denies developer writing modification-report.md', () => assert.ok(checkStagePermission(rpt, state('developer'))?.deny));
});

describe('checkStagePermission — code files', () => {
  const code = '/proj/src/main/java/com/example/FooController.java';
  it('allows developer to write code files', () => assert.equal(checkStagePermission(code, state('developer')), null));
  it('allows modifier to write code files (delegated fix)', () => assert.equal(checkStagePermission(code, state('modifier')), null));
  it('denies analyzer writing code files', () => assert.ok(checkStagePermission(code, state('analyzer'))?.deny));
  it('denies planner writing code files', () => assert.ok(checkStagePermission(code, state('planner'))?.deny));
  it('denies inspector writing code files', () => assert.ok(checkStagePermission(code, state('inspector'))?.deny));
});

describe('checkStagePermission — .claude internal files (always allowed)', () => {
  it('allows writing .claude/rules/backend.md at any stage', () => {
    assert.equal(checkStagePermission('/proj/.claude/rules/backend.md', state('analyzer')), null);
  });
  it('allows writing .claude/.ws-state.json at any stage', () => {
    assert.equal(checkStagePermission('/proj/.claude/.ws-state.json', state('planner')), null);
  });
  it('allows writing runs/*/state.json (non-report run artifact)', () => {
    assert.equal(checkStagePermission('/proj/.claude/runs/20260606-test/state.json', state('analyzer')), null);
  });
});

describe('checkStagePermission — Windows paths', () => {
  it('handles backslash paths for work-doc', () => {
    const winPath = 'D:\\proj\\.claude\\runs\\20260606-test\\work-doc.md';
    assert.equal(checkStagePermission(winPath, state('analyzer')), null);
    assert.ok(checkStagePermission(winPath, state('developer'))?.deny);
  });
});
