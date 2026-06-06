# Hooks — Group Planning Document

## Overview

Four event-driven hooks that enforce workflow discipline without requiring user action.
Hooks are lightweight Node.js scripts using built-ins only (no external dependencies).

| Hook | Event | Script | Blocking |
|------|-------|--------|----------|
| init-requests | SessionStart | `init-requests.js` | No |
| mark-template-read | PostToolUse (Read) | `mark-template-read.js` | No |
| enforce-template | PreToolUse (Write\|Edit) | `enforce-template.js` | **Yes** |
| enforce-init | PreToolUse (Write\|Edit) | `enforce-init.js` | **Yes** |

## Current Behavior

- `init-requests` runs once at session start to seed request forms.
- `mark-template-read` passively tracks which template files have been read in the session.
- `enforce-template` denies Write/Edit calls if no template has been read yet.
- `enforce-init` enforces `ADR → rules → report` ordering during `/wh-init`.
- Shared library in `hooks/scripts/lib/` handles state, markers, and decision logic.
- State is persisted to `.claude/.state/state.json` across hook invocations within a session.

## Inputs / Outputs

| Hook | Input | Output / Effect |
|------|-------|-----------------|
| init-requests | Session start event | Copies seed files to `.claude/requests/` |
| mark-template-read | Tool call params (file path) | Updates session marker in `.claude/.state/` |
| enforce-template | Tool call params (target path) | `allow` or `deny` permission decision |
| enforce-init | Tool call params (target path) | `allow` or `deny` permission decision |

## Dependencies

- `hooks/scripts/lib/state.js` — all hooks use shared state
- `hooks/scripts/lib/marker.js` — template read tracking
- `hooks/scripts/lib/decide.js` — template enforcement decision
- `hooks/scripts/lib/init-guard.js` — step ordering logic
- `.claude/templates/index.json` — template pattern matching

## Improvement Direction

- `enforce-template` error message should suggest which templates to read instead of just denying.
- `mark-template-read` could require a minimum read depth (not just file open) before marking as explored.
- Add a hook to run lint/format after developer writes code (PostToolUse Write).
- `init-requests` could check if existing request files are stale (older than N days) and offer refresh.
- Support hook `--reset` flag to clear `.claude/.state/state.json` without restarting the session.
