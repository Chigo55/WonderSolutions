// plugins/wonder-workflows/hooks/scripts/lib/state.js
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const PIPELINE_STAGES = ['analyzer', 'researcher', 'planner', 'developer', 'inspector', 'modifier'];

function statePath(cwd) {
  return path.join(cwd, '.claude', '.ws-state.json');
}

function emptyState(layers = ['security']) {
  return {
    version: 2,
    requests_copied: false,
    current: { command: null, 'run-id': null, stage: null },
    adr:     Object.fromEntries(layers.map(l => [l, null])),
    rules:   Object.fromEntries(layers.map(l => [l, null])),
    reports: Object.fromEntries(layers.map(l => [l, null]))
  };
}

function readState(cwd) {
  try {
    const raw = JSON.parse(fs.readFileSync(statePath(cwd), 'utf8'));
    if (raw.version !== 2) return null;
    return raw;
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

function writeState(cwd, updater, defaultLayers = ['security']) {
  const p = statePath(cwd);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const next = updater(readState(cwd) || emptyState(defaultLayers));
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8');
  fs.renameSync(tmp, p);
  return next;
}

module.exports = { readState, writeState, statePath, emptyState, PIPELINE_STAGES };

