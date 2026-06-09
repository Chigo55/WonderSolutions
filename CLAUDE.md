# WonderSolutions Marketplace

A 3-plugin marketplace providing a stack-agnostic 6-stage development pipeline, utilities, and an optional companion toolset for Claude Code.

> Plugins: **wonder-workflows** (6-stage pipeline) · **wonder-utilities** (skills & templates) · **wonder-plugins** (optional companion aggregator).
> Pipeline stages: analysis · research · planning · implementation · inspection · modification.

## Development Commands

```bash
# Validate a plugin structure
npm run validate

# Load individual plugins locally (development · testing)
claude --plugin-dir ./plugins/wonder-workflows
claude --plugin-dir ./plugins/wonder-utilities
claude --plugin-dir ./plugins/wonder-plugins
```

## Environment Requirements

- Node.js >= 18.0.0

## Repository Structure (3-plugin marketplace)

```
root/                                ← WonderSolutions marketplace repository
  ├── .claude-plugin/
  │     marketplace.json             ← marketplace catalog (WonderSolutions — 3 plugin listing)
  │
  ├── plugins/
  │     ├── wonder-workflows/        ← 6-stage pipeline plugin
  │     │     ├── .claude-plugin/plugin.json   ← plugin manifest
  │     │     ├── commands/          ← slash commands (wsf-init · wsf-review · wsf-rules · wsf-run)
  │     │     ├── agents/            ← pipeline agents (analyzer · developer · inspector · modifier · orchestrator · planner · researcher · ruler[rule modes only])
  │     │     ├── hooks/             ← event hooks (hooks.json + scripts/ — init & pipeline-stage enforcement)
  │     │     ├── rules/             ← pipeline meta-rules (structure · security · workflow)
  │     │     └── requests/          ← request form seeds (create_request · modify_request)
  │     │
  │     ├── wonder-utilities/        ← skills & template catalog plugin
  │     │     ├── .claude-plugin/plugin.json   ← plugin manifest
  │     │     ├── commands/          ← slash commands (wsu-template)
  │     │     ├── agents/            ← templater agent (template modes: promote · add · edit · delete)
  │     │     ├── rules/             ← templates meta-rule (templates.md)
  │     │     ├── templates/         ← template catalog (index.json + index.schema.json + scaffolds/)
  │     │     └── skills/            ← SKILL.md skills (cave-man · grill-me · hand-off · write-a-skill)
  │     │
  │     └── wonder-plugins/          ← optional companion aggregator (dependency plugin only)
  │           └── .claude-plugin/plugin.json   ← manifest declaring superpowers · context7 · claude-md-management · code-simplifier as deps; no commands/agents/hooks/skills
  │
  ├── CLAUDE.md                      ← this file
  └── package.json                   ← monorepo root
```

## Plugin Structure Rules

| Location | Contents |
|------|------|
| `.claude-plugin/plugin.json` | Manifest only (do not place other files here) |
| `skills/` | `<name>/SKILL.md` format (wonder-utilities only) |
| `agents/` | `<name>.md` markdown agent |
| `commands/` | `<name>.md` slash command |
| `hooks/hooks.json` | Authoritative hook declaration (scripts go in `hooks/scripts/`) — wonder-workflows only |
| `rules/` | `<name>.md` meta-rule (structure · security · workflow owned by ruler in wonder-workflows; templates.md owned by templater in wonder-utilities) |
| `templates/` | `scaffolds/` + `index.json` (catalog seed) · `index.schema.json` — wonder-utilities only |
| `requests/` | Request form seeds (copied to `.claude/requests/`) — wonder-workflows only |

## Version Update Rules

Each plugin is independently versioned. When changing a plugin's version, edit both files simultaneously:
- `plugins/<plugin-name>/.claude-plugin/plugin.json` — `"version": "x.x.x"`
- `.claude-plugin/marketplace.json` — the corresponding plugin entry `"version": "x.x.x"`

(Repeat for each plugin being bumped. All three plugins start at `0.1.0`.)

Commit order: `fix/feat:` commit → separate `chore: bump version to x.x.x` commit

## Development Rules

- All plugin paths must be relative paths starting with `./`
- No references to files outside the plugin (cache-copy approach)
- Hooks must be lightweight JS (Node.js built-ins only — no external dependencies)
- Hooks are non-blocking by default (suggestions, not blocks). **Exception**: the two PreToolUse enforcement hooks (`hooks/scripts/enforce-init.js`, `hooks/scripts/enforce-stage.js`) in wonder-workflows block `Write|Edit` calls via `permissionDecision: "deny"` — `enforce-init.js` when `/wsf-init` has not yet completed, and `enforce-stage.js` when the active pipeline stage forbids writing the target file. (The `SessionStart` hook `init-requests.js` is non-blocking — it only copies request seeds.)
- External plugins (superpowers · context7 · claude-md-management · code-simplifier) are **not** hard dependencies of wonder-workflows or wonder-utilities. They are aggregated by the optional `wonder-plugins` plugin. Install wonder-plugins to transitively pull the full companion toolset.
