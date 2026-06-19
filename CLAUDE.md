# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A **multi-marketplace plugin generator**. A single platform-neutral source (`packages/` + `adapters/`) is compiled by a deterministic generator into native plugin packages for **three AI coding platforms simultaneously**: Claude Code, Codex, and Antigravity. Humans edit only the source; the native outputs are committed but machine-owned. A `pre-commit` gate blocks stale outputs.

Requires Node.js ≥ 20. ESM-only (`"type": "module"`), run via `tsx` (no build step).

## Commands

```bash
npm run generate     # packages/ + adapters/ -> native outputs for all 3 platforms
npm run validate     # validate source schemas + generated outputs + runtime state
npm run drift        # check generated outputs match source (no uncommitted drift)
npm run check        # generate && validate && drift  (run this before committing)
npm run typecheck    # tsc --noEmit (strict mode)
npm test             # node:test via tsx over tests/**/*.test.ts

# Run a single test file / single test case
npx tsx --test tests/generate.test.ts
npx tsx --test --test-name-pattern="drift" tests/validate.test.ts

# Partial generate / validate (default platform = all)
npx tsx tools/generate/cli.ts --platform claude   # claude | codex | antigravity | all
npx tsx tools/generate/cli.ts --dry-run
npx tsx tools/validate/cli.ts --source            # source | generated | runtime
npx tsx tools/validate/cli.ts --generated --drift
```

Install the commit gate once: `git config core.hooksPath .githooks`. The hook runs `generate → validate → drift` and **fails the commit** if generated outputs changed — it does NOT `git add` for you, so you must regenerate, review, and stage the outputs yourself.

## The three-layer model (read these together)

```
packages/   (canonical source, human-edited)
adapters/   (per-platform projection rules, human-edited)
     │  tools/generate:  loadSource → computeOutputs → writeOutputs
     ▼
.claude-plugin/ , plugins/claude/ , plugins/codex/ , .agents/   (generated — DO NOT hand-edit)
```

- **`packages/<pkg>/`** — `manifest.json` (package meta), `capabilities/<cap>/{capability.json, instruction.md, design.md}`, `specs/` (human design docs, not generator input). `instruction.md` is the capability body, written **once**, platform-neutral.
- **`adapters/<platform>/`** — `adapter.json` declares which outputs to emit (kind, scope, path template, hbs template, header); `templates/*.hbs` are Handlebars templates that wrap the neutral body with platform-specific invocation/tool guidance.
- **`tools/`** — `generate/` (pipeline), `validate/` (4 validators), `shared/` (Zod schemas, platform name/path maps, hashing, runtime helpers).

### Generation pipeline (`tools/generate/`)
`load-source.ts` reads + Zod-validates source into a `SourceGraph`. `compute-output.ts` renders each `(platform × adapter output × scope)` into a `ComputedGeneratedFile` (content + sourceHash). `write-output.ts` writes only changed files. `cli.ts` wires them.

### Validation & drift (`tools/validate/`)
`validate-source` re-runs `loadSource`. `validate-generated`/`drift` re-render outputs **in memory** and byte-compare against on-disk files — any difference is `generated-drift`. `validate-runtime` checks `.wonder/` state files against schemas (only if present).

## Invariants you must preserve

These are enforced in code — violating them throws or fails validation, not silently degrades:

1. **Never hand-edit generated files** (`.claude-plugin/`, `plugins/`, `.agents/`). They are overwritten by `generate` and blocked by the drift gate. Change the source, then regenerate.
2. **Determinism**: same input → byte-identical output. No timestamps or nondeterministic data in outputs (`generatedAt` is intentionally `null`). Drift detection depends on this.
3. **Platform-neutral instructions**: `instruction.md` must not contain platform-specific terms. `FORBIDDEN_INSTRUCTION_TERMS` (`tools/shared/schema/capability.ts`) bans `Claude`, `Codex`, `Antigravity`, `shell_command`, `.claude/`, `.codex/`, `.agents/`. Put platform specifics in adapter templates instead.
4. **The package/capability set is a code constant**, not filesystem discovery. `REQUIRED_PACKAGES` in `tools/shared/schema/package.ts` is the source of truth — `loadSource` iterates it. Adding/removing a capability means editing this constant *and* the package's `manifest.json` `capabilityOrder` (they must match) *and* creating the capability directory.
5. **Output paths have one definition**: `outputPathFor()` in `tools/shared/platform/paths.ts`. The `path` template in `adapter.json` must render to exactly this — `compute-output.ts` throws on mismatch. Surface names (`/pkg:cap`, `$pkg-cap`, `pkg.cap`) come from `surfaceName()` in `tools/shared/platform/names.ts`.
6. **Zod schemas in `tools/shared/schema/` are canonical** and `.strict()` — unknown keys fail. Add a field to the schema before adding it to source JSON.
7. **Adding a new abstract action** (the `requires[]` vocabulary, `ABSTRACT_ACTIONS`) is only allowed once the common schema **and all three** adapters define it.

## Platform asymmetries (in `paths.ts` / `compute-output.ts`)

- **Antigravity** emits no repository `marketplace` output and no `repo-skill`; it writes plugins/skills under `.agents/`.
- **Codex** additionally emits repo-local `.agents/skills/` and adds YAML frontmatter to skill markdown; Claude does not.
- Marketplace and plugin-manifest JSON shapes differ per platform (see `marketplaceJson`/`pluginManifestJson` in `compute-output.ts`) — Claude requires top-level `name`+`owner` and relative-path `source`.

## Runtime layer (`.wonder/`) — separate concern

`tools/shared/runtime/*` and the `.wonder/` schemas describe **project-local state created when the generated plugins actually run in a target project** (not in this repo). `state.json` is a machine-managed capability registry; invalid runtime state is reported with path + reason + repair hint and never auto-repaired. Don't confuse this with the build-time source/generated layers above.

## Workflow for any source change

1. Edit only files under `packages/` or `adapters/` (and `tools/` for generator logic).
2. `npm run generate` to refresh all outputs.
3. `npm run check` (or at least `validate && drift`) and `npm run typecheck`.
4. Stage source **and** regenerated outputs together; commit (conventional-commit format: `feat:`, `fix:`, `docs:`, …).

## Reference docs

- `README.md` — full overview (bilingual; the authoritative product description).
- `docs/system-design.md` — target architecture (the baseline spec).
- `docs/implementation-design.md` — Node/TS implementation contract.
- `okf-spec.md` — Open Knowledge Format for runtime knowledge artifacts.
