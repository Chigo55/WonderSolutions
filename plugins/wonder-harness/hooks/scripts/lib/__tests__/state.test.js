'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// Loaded after file exists in Step 3
let readState, writeState, emptyState;

describe('state.js', () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wh-state-test-'));
    ({ readState, writeState, emptyState } = require('../state.js'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('readState returns null when file does not exist', () => {
    assert.equal(readState(path.join(tmpDir, 'nonexistent')), null);
  });

  it('emptyState has version 1 and all layers null', () => {
    const s = emptyState();
    assert.equal(s.version, 1);
    assert.equal(s.requests_copied, false);
    assert.equal(s.adr.backend, null);
    assert.equal(s.rules.templates, null);
  });

  it('writeState creates file with updater applied to empty state', () => {
    const dir = fs.mkdtempSync(path.join(tmpDir, 'sub-'));
    writeState(dir, s => ({ ...s, requests_copied: true }));
    const result = readState(dir);
    assert.equal(result.requests_copied, true);
    assert.equal(result.adr.backend, null);
  });

  it('writeState merges correctly with existing state', () => {
    const dir = fs.mkdtempSync(path.join(tmpDir, 'sub-'));
    writeState(dir, s => ({ ...s, requests_copied: true }));
    writeState(dir, s => ({ ...s, adr: { ...s.adr, backend: '2026-06-05T10:00:00Z' } }));
    const result = readState(dir);
    assert.equal(result.requests_copied, true);
    assert.equal(result.adr.backend, '2026-06-05T10:00:00Z');
    assert.equal(result.adr.frontend, null);
  });

  it('writeState creates .claude directory if it does not exist', () => {
    const dir = fs.mkdtempSync(path.join(tmpDir, 'sub-'));
    writeState(dir, s => s);
    assert.ok(fs.existsSync(path.join(dir, '.claude', '.wh-state.json')));
  });
});
