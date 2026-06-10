const test = require('node:test');
const assert = require('node:assert');
const { parseYAML, mapTools, getDisplayName, resolveStatePaths, WS_STATE_ROOTS } = require('../scripts/sync-agents.js');

test('getDisplayName maps names correctly', () => {
  assert.strictEqual(getDisplayName('orchestrator'), 'Orchestrator Agent');
  assert.strictEqual(getDisplayName('analyzer'), 'Analyzer Agent');
  assert.strictEqual(getDisplayName('custom'), 'Custom Agent');
});

test('mapTools maps Claude tools to Antigravity tools', () => {
  const claudeTools = 'Read, Grep, Glob, Write, Edit, Bash, Agent, WebSearch, WebFetch';
  const mapped = mapTools(claudeTools);
  
  const expected = [
    'view_file',
    'grep_search',
    'list_dir',
    'write_to_file',
    'replace_file_content',
    'multi_replace_file_content',
    'run_command',
    'invoke_subagent',
    'define_subagent',
    'search_web',
    'read_url_content'
  ];
  
  for (const exp of expected) {
    assert.ok(mapped.includes(exp), `Expected mapped tools to contain ${exp}`);
  }
});

test('mapTools fails fast on a tool outside the abstract set', () => {
  assert.throws(
    () => mapTools('Read, unrecognized-tool', 'plugins/wonder-workflows/agents/orchestrator.md'),
    /Unknown abstract tool "unrecognized-tool" in plugins\/wonder-workflows\/agents\/orchestrator\.md\. Declare it in the abstract tool set or remove it\./
  );
});

test('resolveStatePaths rewrites the Claude state root to the platform state root', () => {
  const body = 'Write to `.claude/runs/{run-id}/work-doc.md` and `.claude/rules/{layer}.md`.';
  assert.strictEqual(
    resolveStatePaths(body, 'antigravity'),
    'Write to `.antigravity/runs/{run-id}/work-doc.md` and `.antigravity/rules/{layer}.md`.'
  );
});

test('resolveStatePaths rewrites the platform registry filename and label', () => {
  const body = 'Read `ws-state.claude.json` (backup: `ws-state.claude.json.bak`) — "{project} (Claude)"';
  assert.strictEqual(
    resolveStatePaths(body, 'antigravity'),
    'Read `ws-state.antigravity.json` (backup: `ws-state.antigravity.json.bak`) — "{project} (Antigravity)"'
  );
});

test('resolveStatePaths leaves plugin-internal paths and placeholders untouched', () => {
  const body =
    'Read `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`; never touch another `ws-state.<platform>.json`.';
  assert.strictEqual(resolveStatePaths(body, 'antigravity'), body);
});

test('resolveStatePaths rejects a platform without a state-root mapping', () => {
  assert.throws(() => resolveStatePaths('x', 'unknown-host'), /no WS_STATE_ROOT mapping/);
});

test('WS_STATE_ROOTS declares the Antigravity default', () => {
  assert.strictEqual(WS_STATE_ROOTS.antigravity, '.antigravity');
});

test('parseYAML parses simple and block scalar yaml', () => {
  const yaml = `
name: test-agent
description: >
  This is a description
  spanning multiple lines
  very nicely.
tools: Read, Grep
  `;
  
  const parsed = parseYAML(yaml);
  
  assert.strictEqual(parsed.name, 'test-agent');
  assert.strictEqual(
    parsed.description,
    'This is a description spanning multiple lines very nicely.'
  );
  assert.strictEqual(parsed.tools, 'Read, Grep');
});
