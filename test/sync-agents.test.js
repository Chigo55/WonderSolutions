const test = require('node:test');
const assert = require('node:assert');
const { parseYAML, mapTools, getDisplayName } = require('../scripts/sync-agents.js');

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

test('mapTools handles MCP tools', () => {
  const claudeTools = 'Read, mcp__plugin_context7_context7__query-docs';
  const mapped = mapTools(claudeTools);
  
  assert.ok(mapped.includes('view_file'));
  assert.ok(mapped.includes('context7/query-docs'));
  assert.ok(mapped.includes('mcp__plugin_context7_context7__query-docs'));
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
