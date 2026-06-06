# enforce-init hook — Planning Document

## Overview

PreToolUse (Write|Edit) hook that enforces step ordering during `/wh-init`.
Prevents the ruler from writing rules before ADRs are produced, and from writing reports before rules are generated.

## Current Behavior

- Triggered before every `Write` or `Edit` tool call during a `/wh-init` session.
- Reads current init progress from `.claude/.state/state.json` via `init-guard.js`.
- Enforces the sequence: `adr-extract (step 1) → generate (step 2) → report (step 3)`.
- If a write targets `.claude/rules/` before `.claude/adr/` exists: denies.
- If a write targets `.claude/reports/` before `.claude/rules/` exists: denies.
- If the sequence is satisfied: allows.
- Blocking; denied writes abort the out-of-order step.
- Timeout: 10 seconds.

## Inputs / Outputs

| | Detail |
|-|--------|
| **Input** | PreToolUse event with target file path + current state |
| **Output** | `{ permissionDecision: "allow" | "deny", denyMessage?: string }` |

## Dependencies

- `lib/init-guard.js` — step ordering validation logic.
- `lib/state.js` — reads init progress state.
- State set by ruler agent after each step completes.

## Improvement Direction

- `--reset` flag to clear init state so `/wh-init` can be re-run cleanly.
- Support partial re-runs: allow re-generating only the report (step 3) if ADR and rules already exist.
- Log which step was attempted vs. which was expected in the deny message for easier debugging.
- Unit test coverage for all edge cases (out-of-order, missing files, partial state).
