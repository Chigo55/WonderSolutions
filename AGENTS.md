# Repository Guidelines

## Project Structure & Module Organization

WonderSolutions is a three-plugin Claude Code marketplace. The root contains marketplace metadata and shared documentation; plugin source lives under `plugins/`.

- `.claude-plugin/marketplace.json` lists the marketplace plugins and versions.
- `plugins/wonder-workflows/` contains the pipeline plugin: `commands/`, `agents/`, and `rules/`.
- `plugins/wonder-utilities/` contains utility commands, the `templater` agent, skills, request seeds, and `templates/`.
- `plugins/wonder-plugins/` is the optional companion dependency aggregator and should only need its manifest.
- `.agents/` contains synchronized configurations for Google Antigravity, automatically generated from the Claude Code plugins.
- `docs/` stores design notes and implementation plans.

Keep plugin manifests at `plugins/<name>/.claude-plugin/plugin.json`; do not place operational files inside `.claude-plugin/`.

## Build, Test, and Development Commands

- `npm run validate` validates all plugin structures with `claude plugin validate`.
- `npm run sync:antigravity` parses the Claude plugins and automatically builds/syncs the Antigravity configuration files inside the `.agents/` directory.
- `npm test` runs the Node.js test runner (`node --test`).
- `claude --plugin-dir ./plugins/wonder-workflows` loads the workflow plugin locally.
- `claude --plugin-dir ./plugins/wonder-utilities` loads the utilities plugin locally.
- `claude --plugin-dir ./plugins/wonder-plugins` loads the optional aggregator locally.

Use Node.js `>=18.0.0`, as declared in `package.json`.

## Coding Style & Naming Conventions

This repository is mostly Markdown and JSON. Use concise Markdown headings, fenced code blocks for commands, and two-space indentation in JSON. Keep paths relative and start plugin-local references with `./`.

Use kebab-case for plugin directories, command files, and skill directories, for example `wonder-workflows`, `wsf-run.md`, and `write-a-skill/SKILL.md`. Agent files use lowercase descriptive names such as `developer.md` or `orchestrator.md`.

## Testing Guidelines

Run `npm run validate` before submitting any plugin, manifest, command, agent, rule, skill, or template change. Run `npm test` when adding JavaScript tests or changing testable behavior. There are no custom coverage thresholds documented; add focused `node:test` coverage when behavior moves beyond static Markdown or JSON validation.

## Commit & Pull Request Guidelines

Git history follows conventional-style prefixes such as `docs:`, `refactor:`, and `chore:`. Use short imperative subjects, for example `docs: update workflow command guide`.

For pull requests, include a concise summary, affected plugin(s), validation results, and screenshots only for generated HTML or visual documentation changes. When bumping a plugin version, update both `plugins/<plugin>/.claude-plugin/plugin.json` and the matching entry in `.claude-plugin/marketplace.json`; keep version bumps in a separate `chore:` commit when possible.

## Security & Configuration Tips

Do not add hard dependencies from `wonder-workflows` or `wonder-utilities` to optional companion plugins. Keep external companion dependencies isolated in `wonder-plugins`. If hooks are introduced later, keep them lightweight and limited to Node.js built-ins.
