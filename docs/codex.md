# Codex Usage

WonderSolutions includes a Codex compatibility layer alongside the existing Claude Code marketplace. The Codex layer is additive: it does not rename, move, or modify Claude manifests, commands, agents, rules, or skills.

> **Generated layer — do not edit by hand.** Everything under `codex/plugins/` is transpiled from the canonical `plugins/` source by `npm run sync:codex` (`scripts/sync-codex.js`). Change the canonical source, then re-run the sync.

## What Codex Uses

- `.agents/plugins/marketplace.json` is the repo-local Codex marketplace.
- `codex/plugins/*/.codex-plugin/plugin.json` are Codex plugin manifests (generated).
- `codex/plugins/*/skills/` contains Codex skills (generated). Workflow skills bundle subagent role definitions under `agents/*.toml` plus `references/`/`assets/` seeds.
- `.codex/agents/*.toml` are the project-scoped subagent roles. Provision them once per project by copying a skill's bundled `agents/*.toml` (the skills' "Codex Execution Notes" walk through this); stages are then delegated via `spawn_agent`/`wait_agent`/`close_agent`.
- `.codex/wonder/` is the default runtime state location for Codex-generated runs, rules, meta-rules, ADRs, templates, reports, and handoffs.
- `ws-state.codex.json` (project root) is the Codex feature registry — provisioned by `$wonder-init`, read-only binding for `$wonder-pipeline` (isolated from `ws-state.claude.json`).

Claude continues to use `plugins/*/.claude-plugin/`, `plugins/*/commands/`, `plugins/*/agents/`, `plugins/*/rules/`, `plugins/*/skills/`, and `.claude/` paths.

## Install Locally In Codex

From the repository root:

```powershell
codex plugin marketplace add .
codex plugin add wonder-workflows@wonder-solutions
codex plugin add wonder-utilities@wonder-solutions
codex plugin add wonder-plugins@wonder-solutions
```

Start a new Codex thread after installing so skills are discovered.

## Optional Codex Companion Plugins

`wonder-plugins` does not install Claude dependencies in Codex. For companion capabilities, use installable plugins from the Codex `openai-curated` marketplace when they fit the workspace:

| Codex plugin | Use for |
|--------------|---------|
| `superpowers@openai-curated` | brainstorming, planning, TDD, debugging, and code-review workflows |
| `codex-security@openai-curated` | security scans, threat modeling, and finding validation |
| `coderabbit@openai-curated` | AI review of current diffs and follow-up fix cycles |
| `github@openai-curated` | PRs, issues, CI debugging, and publishing flows |

```powershell
codex plugin add superpowers@openai-curated
codex plugin add codex-security@openai-curated
codex plugin add coderabbit@openai-curated
codex plugin add github@openai-curated
```

There is no direct curated Codex selection for `context7`, `claude-md-management`, or `code-simplifier`. Use official docs, configured MCP servers, direct repository document review, Codex refactoring, and project tests for those roles.

## Main Codex Skills

- `$wonder-pipeline`: run the 6-stage development workflow.
- `$wonder-init`: generate Codex-side ADRs and project rules.
- `$wonder-review`: inspect selected files.
- `$wonder-rules`: amend or audit Codex-side rules.
- `$wonder-template`: manage reusable templates.
- `$wonder-hand-off`, `$wonder-grill-me`, `$wonder-cave-man`, `$wonder-write-a-skill`: utility workflows.

## Claude Safety

Codex skills default to read-only access for `.claude/` and write only under `.codex/wonder/`. Only opt into writing Claude paths when intentionally updating the Claude plugin behavior.
