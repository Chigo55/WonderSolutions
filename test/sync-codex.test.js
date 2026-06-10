const test = require('node:test');
const assert = require('node:assert');
const {
  CODEX_SKILL_NAMES,
  resolveCodexBody,
  buildAgentToml
} = require('../scripts/sync-codex.js');

test('CODEX_SKILL_NAMES maps every canonical command to a wonder-* skill name', () => {
  assert.strictEqual(CODEX_SKILL_NAMES['wsf-run'], 'wonder-pipeline');
  assert.strictEqual(CODEX_SKILL_NAMES['wsf-init'], 'wonder-init');
  assert.strictEqual(CODEX_SKILL_NAMES['wsf-review'], 'wonder-review');
  assert.strictEqual(CODEX_SKILL_NAMES['wsf-rules'], 'wonder-rules');
  assert.strictEqual(CODEX_SKILL_NAMES['wsu-template'], 'wonder-template');
});

test('resolveCodexBody rewrites the Claude state root to .codex/wonder', () => {
  const body = 'Write to `.claude/runs/{run-id}/work-doc.md`; rules live in `.claude/rules/`.';
  assert.strictEqual(
    resolveCodexBody(body),
    'Write to `.codex/wonder/runs/{run-id}/work-doc.md`; rules live in `.codex/wonder/rules/`.'
  );
});

test('resolveCodexBody rewrites the registry filename and platform label', () => {
  const body = 'Read `ws-state.claude.json` — "{project} (Claude)"';
  assert.strictEqual(
    resolveCodexBody(body),
    'Read `ws-state.codex.json` — "{project} (Codex)"'
  );
});

test('resolveCodexBody rewrites slash-command references to Codex skill invocations', () => {
  const body = 'Run /wsf-run after /wsf-init; promote via `/wsu-template promote`.';
  assert.strictEqual(
    resolveCodexBody(body),
    'Run $wonder-pipeline after $wonder-init; promote via `$wonder-template promote`.'
  );
});

test('resolveCodexBody redirects plugin-shipped rules and templates to provisioned state', () => {
  const body =
    'Load `${CLAUDE_PLUGIN_ROOT}/rules/structure.md`; catalog at `${CLAUDE_PLUGIN_ROOT}/templates/index.json`.';
  assert.strictEqual(
    resolveCodexBody(body),
    'Load `.codex/wonder/meta-rules/structure.md`; catalog at `.codex/wonder/templates/index.json`.'
  );
});

test('resolveCodexBody leaves plugin-internal markers untouched', () => {
  const body = '`${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json` and `ws-state.<platform>.json`.';
  assert.strictEqual(resolveCodexBody(body), body);
});

test('buildAgentToml emits the verified Codex role schema', () => {
  const toml = buildAgentToml({
    name: 'analyzer',
    description: 'Stage 1 analyzer.',
    tools: 'Read, Grep, Glob, Write',
    body: '# analyzer\n\nWrite §Analysis to `.claude/runs/{run-id}/work-doc.md`.',
    source: 'plugins/wonder-workflows/agents/analyzer.md'
  });
  assert.match(toml, /^# Generated from plugins\/wonder-workflows\/agents\/analyzer\.md — do not edit by hand/m);
  assert.match(toml, /^name = "analyzer"$/m);
  assert.match(toml, /^description = "Stage 1 analyzer\."$/m);
  assert.match(toml, /^developer_instructions = """$/m);
  assert.match(toml, /\.codex\/wonder\/runs\/\{run-id\}\/work-doc\.md/);
  assert.doesNotMatch(toml, /\.claude\//);
});

test('buildAgentToml maps declared abstract tools to Codex-native guidance', () => {
  const toml = buildAgentToml({
    name: 'developer',
    description: 'Stage 4 developer.',
    tools: 'Read, Write, Edit, Bash, Agent',
    body: 'Implement the plan.',
    source: 'plugins/wonder-workflows/agents/developer.md'
  });
  assert.match(toml, /apply_patch/);
  assert.match(toml, /shell_command/);
  assert.match(toml, /spawn_agent/);
});

test('buildAgentToml fails fast on a tool outside the abstract set', () => {
  assert.throws(
    () =>
      buildAgentToml({
        name: 'x',
        description: 'd',
        tools: 'Read, FooTool',
        body: 'b',
        source: 'plugins/p/agents/x.md'
      }),
    /Unknown abstract tool "FooTool" in plugins\/p\/agents\/x\.md\. Declare it in the abstract tool set or remove it\./
  );
});

test('buildAgentToml escapes backslashes so TOML round-trips the body', () => {
  const toml = buildAgentToml({
    name: 'x',
    description: 'd',
    tools: 'Read',
    body: 'Match `\\d+` literally.',
    source: 'plugins/p/agents/x.md'
  });
  assert.match(toml, /Match `\\\\d\+` literally\./);
});
