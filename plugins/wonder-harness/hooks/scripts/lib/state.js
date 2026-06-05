'use strict';
const fs = require('node:fs');
const path = require('node:path');

const LAYERS = ['backend', 'frontend', 'security', 'templates'];

function statePath(cwd) {
  return path.join(cwd, '.claude', '.wh-state.json');
}

function emptyState() {
  return {
    version: 1,
    requests_copied: false,
    adr:     Object.fromEntries(LAYERS.map(l => [l, null])),
    rules:   Object.fromEntries(LAYERS.map(l => [l, null])),
    reports: Object.fromEntries(LAYERS.map(l => [l, null]))
  };
}

function readState(cwd) {
  try {
    return JSON.parse(fs.readFileSync(statePath(cwd), 'utf8'));
  } catch (_) {
    return null;
  }
}

function writeState(cwd, updater) {
  const p = statePath(cwd);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const next = updater(readState(cwd) || emptyState());
  fs.writeFileSync(p, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

module.exports = { readState, writeState, statePath, emptyState, LAYERS };
