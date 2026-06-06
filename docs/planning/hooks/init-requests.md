# init-requests hook — Planning Document

## Overview

SessionStart hook that auto-copies request seed files to `.claude/requests/` so the user has a ready-to-fill template at the start of every session.

## Current Behavior

- Triggered on `SessionStart` event.
- Checks if `.claude/requests/create_request.md` and `.claude/requests/modify_request.md` exist.
- If missing, copies the seed files from `plugins/wonder-harness/requests/` to `.claude/requests/`.
- Non-blocking (suggestions only); does not interfere with session startup.
- Timeout: 5 seconds.

## Inputs / Outputs

| | Detail |
|-|--------|
| **Input** | SessionStart event |
| **Output** | `.claude/requests/create_request.md` and `.claude/requests/modify_request.md` (if not present) |

## Dependencies

- Seed files must exist at `plugins/wonder-harness/requests/`.
- `.claude/requests/` directory must be writable.
- `state.js` lib for session state access (if needed for idempotency check).

## Improvement Direction

- Check if existing request files are stale (last modified > 30 days) and offer to refresh from seed.
- Log which files were copied vs. already present for transparency.
- Support custom request templates per project (override seed with project-local version).
