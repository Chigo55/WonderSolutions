'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { readState, writeState, emptyState, LAYERS, PIPELINE_STAGES } = require('../state.js');

describe('state.js v2', () => {
  let tmpDir;
  before(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wh-state-test-')); });
  after(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('emptyState has version 2', () => {
    assert.equal(emptyState().version, 2);
  });

  it('emptyState has current with command, run-id, stage all null', () => {
    const s = emptyState();
    assert.equal(s.current.command, null);
    assert.equal(s.current['run-id'], null);
    assert.equal(s.current.stage, null);
  });

  it('emptyState has no wh-create or wh-modify keys', () => {
    const s = emptyState();
    assert.ok(!('wh-create' in s));
    assert.ok(!('wh-modify' in s));
  });

  it('LAYERS does not include templates', () => {
    assert.ok(!LAYERS.includes('templates'));
    assert.deepEqual(LAYERS, ['backend', 'frontend', 'security']);
  });

  it('PIPELINE_STAGES matches 6-stage workflow in order', () => {
    assert.deepEqual(PIPELINE_STAGES, ['analyzer', 'researcher', 'planner', 'developer', 'inspector', 'modifier']);
  });

  it('readState returns null when file does not exist', () => {
    assert.equal(readState(path.join(tmpDir, 'nonexistent')), null);
  });

  it('readState returns null for v1 state (version mismatch)', () => {
    const dir = fs.mkdtempSync(path.join(tmpDir, 'v1-'));
    fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.claude', '.wh-state.json'),
      JSON.stringify({ version: 1, requests_copied: false }), 'utf8');
    assert.equal(readState(dir), null);
  });

  it('writeState round-trips v2 state', () => {
    const dir = fs.mkdtempSync(path.join(tmpDir, 'sub-'));
    writeState(dir, s => ({ ...s, requests_copied: true }));
    const result = readState(dir);
    assert.equal(result.requests_copied, true);
    assert.equal(result.version, 2);
  });

  it('writeState can update current.stage via nested spread', () => {
    const dir = fs.mkdtempSync(path.join(tmpDir, 'sub-'));
    writeState(dir, s => ({ ...s, current: { ...s.current, stage: 'developer' } }));
    const result = readState(dir);
    assert.equal(result.current.stage, 'developer');
    assert.equal(result.current.command, null);
  });

  it('readState throws on corrupt JSON', () => {
    const dir = fs.mkdtempSync(path.join(tmpDir, 'corrupt-'));
    fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.claude', '.wh-state.json'), '{broken', 'utf8');
    assert.throws(() => readState(dir));
  });
});
