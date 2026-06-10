# Repository Guidelines

## Project Structure & Module Organization

WonderSolutions is a three-plugin Claude Code marketplace with additive Codex and Antigravity support.

- `.claude-plugin/marketplace.json` lists the marketplace plugins and versions.
- `.agents/plugins/marketplace.json` lists the repo-local Codex marketplace entries.
- `codex/plugins/` contains Codex-only plugin manifests and skills.
- `plugins/wonder-workflows/` contains Claude commands, agents, and rules.
- `plugins/wonder-utilities/` contains Claude utilities, skills, request seeds, and templates.
- `plugins/wonder-plugins/` is the optional companion dependency aggregator.
- `.agents/` contains generated Antigravity configuration.
- `docs/` stores design notes and implementation plans.

Keep Claude manifests at `plugins/<name>/.claude-plugin/plugin.json` and Codex manifests at `codex/plugins/<name>/.codex-plugin/plugin.json`; do not place operational files inside either manifest directory.

## Build, Test, and Development Commands

- `npm run validate` validates the Claude plugins with `claude plugin validate`.
- `npm run sync:antigravity` parses the Claude plugins and automatically builds/syncs the Antigravity configuration files inside the `.agents/` directory.
- `npm test` runs the Node.js test runner (`node --test`).
- `claude --plugin-dir ./plugins/wonder-workflows` loads a Claude plugin locally.
- `codex plugin marketplace add .` registers the repo-local Codex marketplace.
- `codex plugin add wonder-workflows@wonder-solutions` installs a Codex plugin from that marketplace.

Use Node.js `>=18.0.0`.

## Coding Style & Naming Conventions

This repository is mostly Markdown and JSON. Use concise headings, fenced command blocks, and two-space JSON indentation. Keep paths relative and start plugin-local references with `./`.

Use kebab-case for plugin, command, and skill directories, for example `wonder-workflows`, `wsf-run.md`, and `write-a-skill/SKILL.md`. Agent files use lowercase descriptive names such as `developer.md`.

## Testing Guidelines

Run `npm run validate` before submitting Claude plugin changes. Run Codex manifest and skill validation when changing `codex/plugins/`. Run `npm test` when adding JavaScript tests or changing testable behavior. There are no custom coverage thresholds.

## Commit & Pull Request Guidelines

Git history follows conventional-style prefixes such as `docs:`, `refactor:`, and `chore:`. Use short imperative subjects, for example `docs: update workflow command guide`.

For pull requests, include a summary, affected plugin(s), and validation results. When bumping a Claude plugin version, update both `plugins/<plugin>/.claude-plugin/plugin.json` and the matching entry in `.claude-plugin/marketplace.json`; keep version bumps in a separate `chore:` commit when possible.

## Security & Configuration Tips

Do not add hard dependencies from `wonder-workflows` or `wonder-utilities` to optional companion plugins. Keep external companion dependencies isolated in `wonder-plugins`. Codex runtime artifacts should default to `.codex/wonder/`; Claude runtime artifacts stay under `.claude/`. If hooks are introduced later, keep them lightweight and limited to Node.js built-ins.
