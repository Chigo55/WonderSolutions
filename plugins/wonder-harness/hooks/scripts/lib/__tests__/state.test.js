'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { readState, writeState, emptyState } = require('../state.js');

describe('state.js', () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wh-state-test-'));
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

  it('readState throws on corrupt JSON', () => {
    const dir = fs.mkdtempSync(path.join(tmpDir, 'corrupt-'));
    fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.claude', '.wh-state.json'), '{broken', 'utf8');
    assert.throws(() => readState(dir));
  });

  it('emptyState keys align with LAYERS', () => {
    const { LAYERS } = require('../state.js');
    const s = emptyState();
    for (const l of LAYERS) {
      assert.ok(l in s.adr, `adr missing layer ${l}`);
      assert.ok(l in s.rules, `rules missing layer ${l}`);
      assert.ok(l in s.reports, `reports missing layer ${l}`);
    }
  });
});
