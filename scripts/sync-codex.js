const fs = require('fs');
const path = require('path');
const { parseFile } = require('./sync-agents.js');

// Canonical slash command -> Codex skill name.
const CODEX_SKILL_NAMES = {
  'wsf-run': 'wonder-pipeline',
  'wsf-init': 'wonder-init',
  'wsf-review': 'wonder-review',
  'wsf-rules': 'wonder-rules',
  'wsu-template': 'wonder-template'
};

// Abstract tool -> Codex-native usage guidance (verified against developers.openai.com/codex
// and openai/codex source, 2026-06: no per-role tool allowlist exists in the agent TOML
// schema, so the mapping is expressed as instructions).
const CODEX_TOOL_GUIDANCE = {
  Read: 'read files via shell (`cat`, `sed -n "START,ENDp"`) — Codex has no dedicated file-read tool',
  Grep: 'search file contents via shell `rg`',
  Glob: 'list files and structure via shell (`rg --files`, `ls`)',
  Write: 'create files with the `apply_patch` tool',
  Edit: 'modify files with the `apply_patch` tool',
  Bash: 'run commands with the `shell_command` tool',
  Agent: 'delegate to a role defined in `.codex/agents/` via `spawn_agent`; collect with `wait_agent`, then `close_agent`',
  WebSearch: 'use the hosted `web_search` tool (requires `web_search = "live"` or `"cached"` in config)',
  WebFetch: 'fetch URL content via cached `web_search` or shell `curl`'
};

// Codex-specific manifest metadata (adapter data — everything else comes from the
// canonical plugin.json).
const PLUGIN_META = {
  'wonder-workflows': {
    description: 'Codex-native WonderSolutions 6-stage development workflow: analysis, research, planning, implementation, inspection, and modification.',
    keywords: ['codex', 'workflow', 'pipeline', 'planning', 'review', 'wonder-solutions'],
    interface: {
      displayName: 'Wonder Workflows',
      shortDescription: 'Run a structured 6-stage Codex development workflow.',
      longDescription: 'Wonder Workflows brings the WonderSolutions analysis, research, planning, implementation, inspection, and modification process to Codex while keeping Claude plugin files and runtime state untouched by default.',
      capabilities: ['Planning', 'Write', 'Review'],
      defaultPrompt: [
        'Use $wonder-pipeline to implement this task.',
        'Use $wonder-review to inspect these files.',
        'Use $wonder-init to initialize project rules.'
      ]
    }
  },
  'wonder-utilities': {
    description: 'Codex-native WonderSolutions utility skills for templates, handoffs, concise responses, plan interrogation, and skill authoring.',
    keywords: ['codex', 'utilities', 'skills', 'templates', 'handoff', 'wonder-solutions'],
    interface: {
      displayName: 'Wonder Utilities',
      shortDescription: 'Template and workflow helper skills for Codex.',
      longDescription: 'Wonder Utilities exposes Codex-safe versions of the WonderSolutions utility skills. Runtime artifacts default to .codex/wonder so Claude template and request state is not changed unless explicitly requested.',
      capabilities: ['Write', 'Planning'],
      defaultPrompt: [
        'Use $wonder-template to add a reusable template.',
        'Use $wonder-hand-off to summarize this session.',
        'Use $wonder-grill-me to stress-test this plan.'
      ]
    }
  },
  'wonder-plugins': {
    description: 'Codex companion selection notes for the optional WonderSolutions plugin bundle.',
    keywords: ['codex', 'companion', 'dependencies', 'superpowers', 'coderabbit', 'codex-security', 'github', 'wonder-solutions'],
    interface: {
      displayName: 'Wonder Companions',
      shortDescription: 'Recommended Codex companion plugins and fallbacks.',
      longDescription: 'Wonder Companions maps the Claude-only dependency aggregator to Codex. It selects installable Codex companion plugins from the curated marketplace when available and documents fallbacks where no direct Codex plugin exists.',
      capabilities: ['Planning'],
      defaultPrompt: ['Use $wonder-companions to choose Codex companion plugins.']
    }
  }
};

// Bundled resources per generated workflow skill: which canonical agents ship as
// role TOMLs, and which seed directories ship as references/assets.
const SKILL_BUNDLES = {
  'wonder-pipeline': {
    agents: ['orchestrator', 'analyzer', 'researcher', 'planner', 'developer', 'inspector', 'modifier'],
    inlineOrchestrator: true
  },
  'wonder-init': { agents: ['ruler'], metaRules: 'wonder-workflows' },
  'wonder-review': { agents: ['inspector'] },
  'wonder-rules': { agents: ['ruler'], metaRules: 'wonder-workflows' },
  'wonder-template': {
    agents: ['templater'],
    metaRules: 'wonder-utilities',
    assets: { 'templates': 'assets/templates' },
    references: { 'requests': 'references/requests' }
  }
};

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function clearDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
  ensureDir(dirPath);
}

function copyRecursive(src, dest) {
  if (fs.statSync(src).isDirectory()) {
    ensureDir(dest);
    fs.readdirSync(src).forEach(child => copyRecursive(path.join(src, child), path.join(dest, child)));
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Re-resolve canonical (Claude-native) bodies for the Codex host:
// state root, registry filename, platform label, plugin-shipped seeds, and
// slash-command references. `.claude-plugin/` and `ws-state.<platform>.json`
// placeholders are preserved.
function resolveCodexBody(body) {
  return body
    .replace(/\$\{CLAUDE_PLUGIN_ROOT\}\/rules\//g, '.codex/wonder/meta-rules/')
    .replace(/\$\{CLAUDE_PLUGIN_ROOT\}\/templates\//g, '.codex/wonder/templates/')
    .replace(/ws-state\.claude\.json/g, 'ws-state.codex.json')
    .replace(/\.claude\//g, '.codex/wonder/')
    .replace(/\(Claude\)/g, '(Codex)')
    .replace(/\/(wsf-run|wsf-init|wsf-review|wsf-rules|wsu-template)\b/g, (m, cmd) => `$${CODEX_SKILL_NAMES[cmd]}`);
}

function codexToolGuidance(toolsString, sourceLabel) {
  if (!toolsString) return [];
  const tools = toolsString.split(',').map(t => t.trim());
  return tools.map(tool => {
    const guidance = CODEX_TOOL_GUIDANCE[tool];
    if (!guidance) {
      throw new Error(`Unknown abstract tool "${tool}" in ${sourceLabel}. Declare it in the abstract tool set or remove it.`);
    }
    return `- **${tool}** → ${guidance}.`;
  });
}

function escapeTomlBasicString(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function escapeTomlMultiline(value) {
  return value.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"');
}

// Verified Codex role schema (developers.openai.com/codex/subagents):
// required keys are name, description, developer_instructions.
function buildAgentToml(agent) {
  const sourceLabel = agent.source || `agent "${agent.name}"`;
  const guidance = codexToolGuidance(agent.tools, sourceLabel);
  const instructions = [
    '## Tool usage on Codex',
    '',
    ...guidance,
    '',
    resolveCodexBody(agent.body).trim()
  ].join('\n');

  return [
    `# Generated from ${sourceLabel} — do not edit by hand (npm run sync:codex).`,
    `name = "${escapeTomlBasicString(agent.name)}"`,
    `description = "${escapeTomlBasicString(resolveCodexBody(agent.description))}"`,
    'developer_instructions = """',
    escapeTomlMultiline(instructions),
    '"""',
    ''
  ].join('\n');
}

function buildExecutionNotes(skillName, bundle, sourcePath) {
  const provisioning = [
    'copy this skill\'s bundled `agents/*.toml` into the project\'s `.codex/agents/` (keep existing files)'
  ];
  if (bundle.metaRules) {
    provisioning.push('copy bundled `references/meta-rules/*.md` into `.codex/wonder/meta-rules/`');
  }
  if (bundle.assets) {
    provisioning.push('seed `.codex/wonder/templates/` from bundled `assets/templates/` when absent');
  }

  const lines = [
    `> Generated from \`${sourcePath}\` by \`npm run sync:codex\` — do not edit by hand.`,
    '',
    '## Codex Execution Notes',
    '',
    '- Runtime state root is `.codex/wonder/`. Treat `.claude/` as a read-only fallback; never write it unless the user explicitly asks.',
    `- **Role provisioning (once per project):** ${provisioning.join('; ')}.`,
    '- Delegate stages with `spawn_agent` using those roles; collect results with `wait_agent`, then `close_agent`. `[agents] max_depth` defaults to 1, so perform any nested delegation (e.g. modifier → developer) from this thread.'
  ];
  if (bundle.inlineOrchestrator) {
    lines.push('- Where the instructions below say to invoke the **orchestrator** agent, assume that role yourself in this conversation (role reference: `agents/orchestrator.toml`) and spawn the other stage roles from here.');
  }
  lines.push('- Where `${CLAUDE_PLUGIN_ROOT}` appears, it means this plugin\'s install root.');
  return lines.join('\n');
}

function buildSkillMd(skillName, command, bundle, sourcePath) {
  const description = `${resolveCodexBody(command.description).trim()} Codex projection of /${command.name}; use when the user asks for ${command.name} or $${skillName}.`;
  return [
    '---',
    `name: ${skillName}`,
    `description: ${description}`,
    '---',
    '',
    buildExecutionNotes(skillName, bundle, sourcePath),
    '',
    resolveCodexBody(command.body).trim(),
    ''
  ].join('\n');
}

function buildUtilitySkillMd(skillName, frontmatter, body, sourcePath) {
  return [
    '---',
    `name: ${skillName}`,
    `description: ${resolveCodexBody(frontmatter.description || '').trim()}`,
    '---',
    '',
    `> Generated from \`${sourcePath}\` by \`npm run sync:codex\` — do not edit by hand.`,
    '',
    resolveCodexBody(body).trim(),
    ''
  ].join('\n');
}

function buildManifest(pluginName, canonicalManifest) {
  const meta = PLUGIN_META[pluginName];
  return {
    name: pluginName,
    version: canonicalManifest.version,
    description: meta.description,
    author: {
      name: canonicalManifest.author.name,
      email: canonicalManifest.author.email,
      url: 'https://github.com/Chigo55'
    },
    homepage: canonicalManifest.homepage,
    repository: canonicalManifest.homepage,
    license: canonicalManifest.license,
    keywords: meta.keywords,
    skills: './skills/',
    interface: {
      displayName: meta.interface.displayName,
      shortDescription: meta.interface.shortDescription,
      longDescription: meta.interface.longDescription,
      developerName: canonicalManifest.author.name,
      category: 'Productivity',
      capabilities: meta.interface.capabilities,
      websiteURL: canonicalManifest.homepage,
      defaultPrompt: meta.interface.defaultPrompt
    }
  };
}

const WONDER_COMPANIONS_SKILL = `---
name: wonder-companions
description: Explain how the Claude-only WonderSolutions companion bundle maps to Codex. Use when the user asks about wonder-plugins, companion plugins, optional dependencies, or Codex equivalents for superpowers, context7, claude-md-management, or code-simplifier.
---

> Generated by \`npm run sync:codex\` (static adapter data — the canonical wonder-plugins ships no skills) — do not edit by hand.

# Wonder Companions

\`wonder-plugins\` is a Claude dependency aggregator. In Codex, do not try to install Claude companion plugins as Codex plugin dependencies.

## Selected Codex Plugins

Use these optional Codex plugins from the \`openai-curated\` marketplace when the user wants companion capabilities:

| Codex plugin | Use for | Claude companion coverage |
| --- | --- | --- |
| \`superpowers@openai-curated\` | brainstorming, planning, TDD, debugging, code-review workflows | Direct Codex selection for \`superpowers\`. |
| \`codex-security@openai-curated\` | repository security scans, threat modeling, finding validation | Security-focused review coverage for risk-sensitive cleanup. |
| \`coderabbit@openai-curated\` | AI review of current diffs and follow-up fix cycles | Review support around simplification and cleanup. |
| \`github@openai-curated\` | PRs, issues, CI debugging, and publishing flows | Delivery integration around review and workflow handoff. |

Install only the plugins needed for the current workspace:

\`\`\`powershell
codex plugin add superpowers@openai-curated
codex plugin add codex-security@openai-curated
codex plugin add coderabbit@openai-curated
codex plugin add github@openai-curated
\`\`\`

## No Direct Codex Selection

- \`context7\`: no direct curated Codex plugin selection. Use official docs, web research, configured MCP servers, or a domain-specific Codex plugin such as \`vercel\`, \`cloudflare\`, \`supabase\`, or \`expo\` when the project matches.
- \`claude-md-management\`: Claude-specific. In Codex, inspect \`AGENTS.md\`, \`CLAUDE.md\`, and repository docs directly while preserving Claude behavior.
- \`code-simplifier\`: no exact curated Codex plugin selection. Use Codex refactoring with project tests, then use \`superpowers\` or \`coderabbit\` when an additional review workflow is useful.

## Local Wonder Mapping

- For structured workflows, use \`wonder-workflows\` skills.
- For reusable templates and handoffs, use \`wonder-utilities\` skills.
- For current library documentation, prefer official docs or configured MCP servers available in the Codex environment.
- For simplification or cleanup, use normal Codex refactoring with project tests.

## Safety Rule

Never add hard dependencies from \`wonder-workflows\` or \`wonder-utilities\` to companion tools. Keep optional integrations optional so Claude and Codex can use the repository independently.
`;

function loadAgents(pluginDir, pluginName, projectRoot) {
  const agentsDir = path.join(pluginDir, 'agents');
  if (!fs.existsSync(agentsDir)) return {};
  const agents = {};
  fs.readdirSync(agentsDir)
    .filter(file => file.endsWith('.md'))
    .forEach(file => {
      const filePath = path.join(agentsDir, file);
      const { frontmatter, body } = parseFile(filePath);
      const name = frontmatter.name || path.basename(file, '.md');
      agents[name] = {
        name,
        description: frontmatter.description || '',
        tools: frontmatter.tools || '',
        body,
        source: path.relative(projectRoot, filePath).replace(/\\/g, '/')
      };
    });
  return agents;
}

function writeSkillBundle(skillDir, bundle, agents, pluginsDir) {
  if (bundle.agents) {
    const agentsDestDir = path.join(skillDir, 'agents');
    ensureDir(agentsDestDir);
    for (const agentName of bundle.agents) {
      const agent = agents[agentName];
      if (!agent) {
        throw new Error(`Skill bundle references unknown agent "${agentName}". Check SKILL_BUNDLES.`);
      }
      fs.writeFileSync(path.join(agentsDestDir, `${agentName}.toml`), buildAgentToml(agent), 'utf-8');
    }
  }
  if (bundle.metaRules) {
    const rulesSrcDir = path.join(pluginsDir, bundle.metaRules, 'rules');
    const rulesDestDir = path.join(skillDir, 'references', 'meta-rules');
    ensureDir(rulesDestDir);
    fs.readdirSync(rulesSrcDir)
      .filter(file => file.endsWith('.md'))
      .forEach(file => {
        const content = fs.readFileSync(path.join(rulesSrcDir, file), 'utf-8');
        fs.writeFileSync(path.join(rulesDestDir, file), resolveCodexBody(content), 'utf-8');
      });
  }
}

function writeSeedDirs(skillDir, bundle, canonicalPluginDir) {
  const seedMaps = { ...(bundle.assets || {}), ...(bundle.references || {}) };
  for (const [srcRel, destRel] of Object.entries(seedMaps)) {
    const srcDir = path.join(canonicalPluginDir, srcRel);
    if (fs.existsSync(srcDir)) {
      copyRecursive(srcDir, path.join(skillDir, destRel));
    }
  }
}

function runSync() {
  const projectRoot = path.resolve(__dirname, '..');
  const pluginsDir = path.join(projectRoot, 'plugins');
  const codexPluginsDir = path.join(projectRoot, 'codex', 'plugins');

  console.log('Starting sync to Codex plugin layer...');

  const allAgents = {};
  for (const pluginName of Object.keys(PLUGIN_META)) {
    Object.assign(allAgents, loadAgents(path.join(pluginsDir, pluginName), pluginName, projectRoot));
  }

  for (const pluginName of Object.keys(PLUGIN_META)) {
    const canonicalPluginDir = path.join(pluginsDir, pluginName);
    const canonicalManifest = JSON.parse(
      fs.readFileSync(path.join(canonicalPluginDir, '.claude-plugin', 'plugin.json'), 'utf-8')
    );
    const codexPluginDir = path.join(codexPluginsDir, pluginName);
    clearDir(codexPluginDir);

    // 1. Manifest
    const manifestDir = path.join(codexPluginDir, '.codex-plugin');
    ensureDir(manifestDir);
    fs.writeFileSync(
      path.join(manifestDir, 'plugin.json'),
      JSON.stringify(buildManifest(pluginName, canonicalManifest), null, 2) + '\n',
      'utf-8'
    );
    console.log(`✓ Manifest: ${pluginName} v${canonicalManifest.version}`);

    // 2. Skills generated from canonical commands
    const commandsDir = path.join(canonicalPluginDir, 'commands');
    if (fs.existsSync(commandsDir)) {
      for (const file of fs.readdirSync(commandsDir).filter(f => f.endsWith('.md'))) {
        const commandName = path.basename(file, '.md');
        const skillName = CODEX_SKILL_NAMES[commandName];
        if (!skillName) {
          throw new Error(`No Codex skill name mapped for command "${commandName}". Add it to CODEX_SKILL_NAMES.`);
        }
        const sourcePath = `plugins/${pluginName}/commands/${file}`;
        const { frontmatter, body } = parseFile(path.join(commandsDir, file));
        const bundle = SKILL_BUNDLES[skillName] || {};
        const skillDir = path.join(codexPluginDir, 'skills', skillName);
        ensureDir(skillDir);
        fs.writeFileSync(
          path.join(skillDir, 'SKILL.md'),
          buildSkillMd(skillName, { name: commandName, description: frontmatter.description || '', body }, bundle, sourcePath),
          'utf-8'
        );
        writeSkillBundle(skillDir, bundle, allAgents, pluginsDir);
        writeSeedDirs(skillDir, bundle, canonicalPluginDir);
        console.log(`✓ Skill: ${skillName} (from /${commandName})`);
      }
    }

    // 3. Skills generated from canonical standalone skills
    const skillsDir = path.join(canonicalPluginDir, 'skills');
    if (fs.existsSync(skillsDir)) {
      for (const dirName of fs.readdirSync(skillsDir)) {
        const srcSkillMd = path.join(skillsDir, dirName, 'SKILL.md');
        if (!fs.existsSync(srcSkillMd)) continue;
        const skillName = `wonder-${dirName}`;
        const sourcePath = `plugins/${pluginName}/skills/${dirName}/SKILL.md`;
        const { frontmatter, body } = parseFile(srcSkillMd);
        const skillDir = path.join(codexPluginDir, 'skills', skillName);
        ensureDir(skillDir);
        fs.writeFileSync(
          path.join(skillDir, 'SKILL.md'),
          buildUtilitySkillMd(skillName, frontmatter, body, sourcePath),
          'utf-8'
        );
        console.log(`✓ Skill: ${skillName} (from skills/${dirName})`);
      }
    }

    // 4. Static adapter skill for the aggregator plugin
    if (pluginName === 'wonder-plugins') {
      const skillDir = path.join(codexPluginDir, 'skills', 'wonder-companions');
      ensureDir(skillDir);
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), WONDER_COMPANIONS_SKILL, 'utf-8');
      console.log('✓ Skill: wonder-companions (static adapter data)');
    }
  }

  console.log('Codex synchronization complete.');
}

if (require.main === module) {
  runSync();
} else {
  module.exports = {
    CODEX_SKILL_NAMES,
    CODEX_TOOL_GUIDANCE,
    resolveCodexBody,
    codexToolGuidance,
    buildAgentToml,
    buildSkillMd,
    buildManifest
  };
}
