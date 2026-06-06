# wonder-harness Marketplace

A single-plugin marketplace for the Claude Code development harness (stack-agnostic 6-stage framework).

> Stages: analysis · research · planning · implementation · inspection · modification.
> Includes agents (analyzer·developer·inspector·modifier·orchestrator·planner·researcher·ruler), commands (wh-init·wh-review·wh-rules·wh-run), rules (backend·frontend·security·workflow), and skills (caveman·grill-me·handoff·write-a-skill).

## Development Commands

```bash
# Validate plugin structure
npm run validate

# Load locally (development·testing)
claude --plugin-dir ./plugins/wonder-harness
```

## Environment Requirements

- Node.js >= 18.0.0

## Repository Structure (single-plugin marketplace)

```
root/                           ← marketplace repository
  ├── .claude-plugin/
  │     marketplace.json        ← marketplace catalog (wonder-harness standalone listing)
  │
  ├── plugins/
  │     └── wonder-harness/     ← wonder-harness plugin
  │           ├── .claude-plugin/plugin.json   ← plugin manifest
  │           ├── commands/     ← slash commands (wh-init·wh-review·wh-rules·wh-run)
  │           ├── agents/       ← isolated sub-agents (analyzer·developer·inspector·modifier·orchestrator·planner·researcher·ruler)
  │           ├── hooks/        ← event hooks (hooks.json + scripts/ — template explore enforcement)
  │           ├── rules/        ← harness rules (backend·frontend·security·workflow·templates)
  │           ├── templates/    ← template scaffold + index schema·seed
  │           ├── requests/     ← request form seeds (create_request·modify_request)
  │           └── skills/       ← SKILL.md skills (caveman·grill-me·handoff·write-a-skill)
  │
  ├── CLAUDE.md                 ← this file
  └── package.json              ← monorepo root
```

## Plugin Structure Rules

| Location | Contents |
|------|------|
| `.claude-plugin/plugin.json` | Manifest only (do not place other files here) |
| `skills/` | `<name>/SKILL.md` format |
| `agents/` | `<name>.md` markdown agent |
| `commands/` | `<name>.md` slash command |
| `hooks/hooks.json` | Authoritative hook declaration (scripts go in `hooks/scripts/`) |
| `rules/` | `<name>.md` harness rule (owned by ruler) |
| `templates/` | Scaffold + `index.schema.json`·`index.seed.json` |
| `requests/` | Request form seeds (copied to `.claude/requests/`) |

## Version Update Rules

When changing the version, edit both files simultaneously:
- `plugins/wonder-harness/.claude-plugin/plugin.json` — `"version": "x.x.x"`
- `.claude-plugin/marketplace.json` — the corresponding plugin entry `"version": "x.x.x"`

Commit order: `fix/feat:` commit → separate `chore: bump version to x.x.x` commit

## Development Rules

- All plugin paths must be relative paths starting with `./`
- No references to files outside the plugin (cache-copy approach)
- Hooks must be lightweight JS (Node.js built-ins only — no external dependencies)
- Hooks are non-blocking by default (suggestions, not blocks). **Exception**: the template-explore enforcement hook (`hooks/scripts/enforce-template.js`) blocks `Write|Edit` calls when the template has not yet been explored, via `permissionDecision: "deny"`.
