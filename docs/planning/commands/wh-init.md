# /wh-init — Planning Document

## Overview

One-time project initialization command that reverse-engineers architectural decisions from the existing codebase and generates project-specific rules and HTML reports per layer.
Must be run before `/wh-create` or `/wh-modify` for best results.

## Current Behavior

1. User specifies one or more layers: `--backend`, `--frontend`, `--security`, `--templates`.
2. For each layer (processed sequentially):
   - **Step 1 (adr-extract):** Ruler reads existing codebase and produces `.claude/adr/{layer}.md`.
   - **Step 2 (generate):** Ruler reads ADR + meta-rule and produces `.claude/rules/{layer}.md`.
   - **Step 3 (report):** HTML report generated at `.claude/reports/wh-init-{layer}-YYYYMMDD-HHMMSS.html`.
3. Step ordering is enforced by `enforce-init.js` hook (ADR must exist before rules; rules must exist before report).
4. Completion summary lists all produced artifacts.

## Inputs / Outputs

| | Detail |
|-|--------|
| **Input** | Layer flag(s) + existing codebase |
| **Output** | `.claude/adr/{layer}.md`, `.claude/rules/{layer}.md`, `.claude/reports/wh-init-{layer}-*.html` |

## Dependencies

- Existing codebase (Java/JS/HTML files) must be readable for ADR extraction.
- Meta-rule files (`plugins/wonder-harness/rules/{layer}.md`) must exist.
- `enforce-init.js` hook enforces step ordering; step state in `.claude/.state/state.json`.

## Improvement Direction

- `--all` flag to initialize all layers in one invocation.
- Detect when rules are stale (codebase changed significantly) and prompt re-init.
- Incremental mode: update only the ADR/rules sections that have changed since last init.
- HTML report could include a side-by-side diff of meta-rule vs. project-specific rule.
- Support `--reset` to clear state and re-run from step 1.
