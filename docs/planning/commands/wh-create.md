# /wh-create — Planning Document

## Overview

Entry command for creating a new domain feature from scratch.
Validates the `create_request.md` and runs the full `planner → templater → developer → ruler` pipeline in `create` mode.

## Current Behavior

1. Reads `.claude/requests/create_request.md`.
2. Validates presence of `## Goal`, `## Scope`, `## Constraints`, `## Acceptance Criteria` — fails fast if any missing.
3. Dispatches planner with `mode=create`.
4. Planner output feeds templater, then developer, then ruler.
5. Ruler produces the final validation report; user sees per-stage summaries.

## Inputs / Outputs

| | Detail |
|-|--------|
| **Input** | `.claude/requests/create_request.md` with all four required sections |
| **Output** | 7-file domain module (5 Java + 2 frontend) + ruler validation report |

**Required request sections:**
- `## Goal` — what the feature does
- `## Scope` — which files/layers are in scope
- `## Constraints` — non-negotiable architectural constraints
- `## Acceptance Criteria` — verifiable done conditions

## Dependencies

- `init-requests.js` hook must have copied the seed file to `.claude/requests/`.
- All four agents (planner, templater, developer, ruler) must be available.
- `enforce-create.js` hook enforces stage ordering (planner→templater→developer→ruler) and template exploration.
- `enforce-init.js` hook blocks all code writes until at least one layer has been initialized by wh-init.

## Improvement Direction

- `--dry-run` flag: run planner only, print the module plan without generating code.
- `--layer` flag: scope to backend-only or frontend-only when full-stack is not needed.
- Post-completion summary should include file paths and line counts of all generated files.
- Validate `## Acceptance Criteria` items as machine-checkable assertions (e.g., endpoint exists, grid renders).
