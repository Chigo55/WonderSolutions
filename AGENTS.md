# Repository Guidelines

## Project Structure & Module Organization

WonderSolutions is a TypeScript/Node ESM repository that generates marketplace-specific agent/plugin outputs from canonical source. Edit canonical package source under `packages/<package>/`, especially `manifest.json`, `specs/`, and `capabilities/<capability>/`. Adapter rules and Handlebars templates live in `adapters/<platform>/`. Generator, validator, schemas, hashing, and runtime helpers live in `tools/`. Tests are in `tests/**/*.test.ts`. Generated outputs such as `plugins/`, `.agents/`, and `.claude-plugin/` are committed artifacts; regenerate them instead of hand-editing when changing source behavior.

## Build, Test, and Development Commands

Use `npm.cmd` in PowerShell if script execution policy blocks `npm`.

- `npm install`: install dependencies from `package-lock.json`.
- `npm run generate`: regenerate platform outputs from `packages/` and `adapters/`.
- `npm run validate`: validate source, generated files, and runtime schemas.
- `npm run drift`: fail if generated outputs differ from canonical source.
- `npm run check`: run `generate`, `validate`, and `drift` in sequence.
- `npm test`: run `tsx --test tests/**/*.test.ts`.
- `npm run typecheck`: run `tsc --noEmit`.

Install the pre-commit hook with `git config core.hooksPath .githooks`; it runs generate, validate, and drift.

## Coding Style & Naming Conventions

Use TypeScript ESM with strict compiler settings from `tsconfig.json`. Keep imports explicit, preserve `.ts` extensions where the repo already uses them, and prefer Zod schemas in `tools/shared/schema/` for structured validation. Use two-space indentation in JSON, TypeScript, and Markdown examples. Name tests after the behavior or capability, for example `wonder-build-create.test.ts`.

## Testing Guidelines

Add focused `node:test` coverage for generator, validator, schema, runtime, and capability behavior. Keep tests deterministic: avoid timestamps, network calls, and environment-specific paths unless normalized. For capability changes, run `npm test`, `npm run typecheck`, and `npm run check` before committing.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit prefixes such as `feat:`, `fix:`, `docs:`, and `chore:`. Keep commits scoped to one logical change and include regenerated artifacts when source changes affect outputs. Pull requests should describe the source change, list validation commands run, note generated output changes, and link any relevant design doc or issue.

## Agent-Specific Instructions

Treat `docs/system-design.md` as the architectural baseline. For contributor or agent guidance, keep instructions concrete and file-backed, and avoid replacing parallel platform surfaces with a single-platform shortcut.
