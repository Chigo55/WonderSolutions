# enforce-template hook — Planning Document

## Overview

PreToolUse (Write|Edit) hook that blocks code generation if no template has been read in the current session.
The primary enforcement mechanism ensuring the templater stage runs before the developer stage.

## Current Behavior

- Triggered before every `Write` or `Edit` tool call.
- Reads the session marker from `.claude/.state/state.json` via `decide.js`.
- If no template has been marked as read: returns `permissionDecision: "deny"` with a message.
- If at least one template has been marked: returns `permissionDecision: "allow"`.
- Blocking; denied writes are not executed.
- Timeout: 10 seconds.

## Inputs / Outputs

| | Detail |
|-|--------|
| **Input** | PreToolUse event with target file path |
| **Output** | `{ permissionDecision: "allow" | "deny", denyMessage?: string }` |

## Dependencies

- `mark-template-read.js` hook must run in the same session to populate markers.
- `lib/decide.js` — decision logic.
- `lib/state.js` — state file access.
- `.claude/templates/index.json` — catalog reference for targeted suggestions.

## Improvement Direction

- Deny message should name specific templates the user should read (e.g., "Read the `eq-controller` template first").
- Distinguish between "no template read at all" vs. "wrong template for this file type" for more precise guidance.
- Allow-list certain file paths (e.g., config files, `.gitkeep`) that legitimately do not need a template.
- Add a `--force` escape hatch for cases where no template exists and one must be bootstrapped.
