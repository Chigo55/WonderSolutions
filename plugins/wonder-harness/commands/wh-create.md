---
description: Validates create_request.md and runs the planner→templater→developer→ruler pipeline.
argument-hint: "(optional) Path to the request document. Default: .claude/requests/create_request.md"
---

# /wh-create

## 1. Acquire input
- If an argument is provided, use that path; otherwise use `.claude/requests/create_request.md`.
- If the file does not exist, copy the plugin seed `${CLAUDE_PLUGIN_ROOT}/requests/create_request.md` to that location,
  instruct the user to fill in the form and re-run, then **stop**.

## 2. Validation gate (fail-fast)
Confirm that all required sections exist and contain non-empty content (excluding comments/placeholders):
`## Goal`, `## Scope`, `## Constraints`, `## Acceptance Criteria`.
- If any section is missing or blank, **do not start the pipeline** — report the list of missing items and stop.

## 3. Pipeline dispatch (sequential)
On successful validation, invoke the agents in the following order. Pass each step's deliverable as input to the next.
1. **planner** (create) — request → module plan
2. **templater** (create) — plan → template explore/create, update index.json
3. **developer** (create) — code implementation based on templates
4. **ruler** (review) — validation report cross-checked against all 4 rules

## 4. Result
- Present each step's summary and the ruler validation report to the user.
