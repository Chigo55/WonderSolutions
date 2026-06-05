---
description: Validates modify_request.md and runs the planner→templater→developer→ruler pipeline in modify mode.
argument-hint: "(optional) Path to the request document. Default: .claude/requests/modify_request.md"
---

# /wh-modify

## 1. Acquire input
- If an argument is provided, use that path; otherwise use `.claude/requests/modify_request.md`.
- If the file does not exist, copy the plugin seed `${CLAUDE_PLUGIN_ROOT}/requests/modify_request.md`, instruct the user, then **stop**.

## 2. Validation gate (fail-fast)
Required sections: `## Target`, `## Changes`, `## Impact`, `## Acceptance Criteria`.
- If any section is missing or blank, report the missing items and **stop**.

## 3. Pipeline dispatch (sequential, modify mode)
1. **planner** (modify) — explore existing structure → step-by-step modification plan
2. **templater** (modify) — update affected templates/patterns
3. **developer** (modify) — modify code following existing patterns
4. **ruler** (review) — validation report cross-checked against rules

## 4. Result
- Present a per-step summary and the validation report to the user.
