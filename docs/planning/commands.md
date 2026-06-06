# Commands — Group Planning Document

## Overview

Four slash commands exposed to the user as entry points into the wonder-harness pipeline.
Each command is a markdown-based instruction document that validates its request file and delegates work to the agent pipeline.

| Command | Mode | Entry |
|---------|------|-------|
| `/wh-create` | create | New domain feature |
| `/wh-modify` | modify | Change existing feature |
| `/wh-review` | review | Standalone review |
| `/wh-init` | init | One-time project setup |

## Current Behavior

- All commands perform fail-fast section validation before dispatching agents.
- `/wh-create` and `/wh-modify` run the full `planner → templater → developer → ruler` pipeline.
- `/wh-review` selects the appropriate agent based on what is being reviewed.
- `/wh-init` runs the ruler in `adr-extract → generate → report` sequence, one layer at a time.

## Inputs / Outputs

| Command | Input | Output |
|---------|-------|--------|
| `/wh-create` | `.claude/requests/create_request.md` | Implemented code (7-file set) + ruler validation report |
| `/wh-modify` | `.claude/requests/modify_request.md` | Modified code + ruler validation report |
| `/wh-review` | Target file(s) or code | Review findings report |
| `/wh-init` | Layer flag (`--backend`, `--frontend`, `--security`, `--templates`) | ADR + rules + HTML report per layer |

## Dependencies

- Request seed files auto-copied by `init-requests.js` hook on SessionStart.
- All four agents must be available in the plugin.
- `/wh-init` depends on existing codebase for ADR extraction (ruler adr-extract mode).

## Improvement Direction

- Add `--dry-run` flag to `/wh-create` and `/wh-modify` to preview the plan without executing.
- `/wh-review` currently selects one agent; consider a multi-agent parallel review (developer + ruler + security).
- `/wh-init` could detect stale rules and prompt re-initialization when the codebase has diverged.
- Progress indicators between pipeline stages (e.g., "Stage 2/4: templater running...").
