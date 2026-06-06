# /wh-modify — Planning Document

## Overview

Entry command for modifying an existing domain feature.
Validates `modify_request.md` and runs the full pipeline in `modify` mode, which scopes all agents to the stated change target.

## Current Behavior

1. Reads `.claude/requests/modify_request.md`.
2. Validates presence of `## Target`, `## Changes`, `## Impact`, `## Acceptance Criteria` — fails fast if any missing.
3. Dispatches planner with `mode=modify`.
4. Planner identifies which of the 7 files need to change.
5. Templater checks if existing templates cover the change; creates new ones if not.
6. Developer applies changes to the targeted files only.
7. Ruler validates the modified files against the full checklist.

## Inputs / Outputs

| | Detail |
|-|--------|
| **Input** | `.claude/requests/modify_request.md` with all four required sections |
| **Output** | Modified files + ruler validation report for changed scope |

**Required request sections:**
- `## Target` — which domain/files are being changed
- `## Changes` — what specifically changes
- `## Impact` — what other components might be affected
- `## Acceptance Criteria` — done conditions for the change

## Dependencies

- Target domain must already exist (files readable by planner).
- `enforce-modify.js` hook enforces stage ordering (planner→templater→developer→ruler) and template exploration.
- `enforce-init.js` hook blocks all code writes until at least one layer has been initialized by wh-init.
- Existing `.claude/rules/{layer}.md` constrains what the developer may change.

## Improvement Direction

- Show a diff preview of planned changes before the developer writes anything.
- `## Impact` section could be auto-populated by a grep scan of callers.
- Support multi-domain changes in a single `modify_request.md` (currently single-domain assumed).
- After ruler validation, automatically open modified files in editor.
