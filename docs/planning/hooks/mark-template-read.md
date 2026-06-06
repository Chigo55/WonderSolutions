# mark-template-read hook — Planning Document

## Overview

PostToolUse (Read) hook that tracks when a template file has been read in the current session.
Feeds the `enforce-template` hook's allow/deny decision.

## Current Behavior

- Triggered after every `Read` tool call.
- Checks if the read file path matches any `pathPatterns` entry in `.claude/templates/index.json` (via `index-match.js`).
- If a match is found, writes a marker to `.claude/.state/state.json` via `marker.js`.
- Non-blocking; never denies or modifies the tool call.
- Timeout: 5 seconds.

## Inputs / Outputs

| | Detail |
|-|--------|
| **Input** | PostToolUse event with file path parameter |
| **Output** | Session marker entry in `.claude/.state/state.json` |

## Dependencies

- `.claude/templates/index.json` must be readable for pattern matching.
- `lib/index-match.js` — glob pattern matching logic.
- `lib/marker.js` — writes/reads marker entries.
- `lib/state.js` — persistent state file management.

## Improvement Direction

- Require minimum read depth (e.g., file must be read beyond line 10) before marking as explored.
- Track which specific template IDs have been read, not just that "some template" was read.
- Expose a `/wh-status` command output that lists explored vs. unexplored templates for the current session.
