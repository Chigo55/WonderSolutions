---
name: wonder-build-review
description: Review existing work and report findings without modifying project files.
---

# Review Work

Review existing work and report findings without modifying project files.

## Procedure

scope

- Determine the reviewed target or scope.
- Determine review criteria.
- Read optional standards only as review criteria.
- Identify read-only validation commands.

inspect

- Read target files, diffs, logs, existing validation output, and relevant context.
- Run read-only validation only.
- Record evidence and skipped checks in `.wonder/runs/<run-id>/inspect.md`.
- Do not run commands whose purpose is to modify files.

judge

- Identify bugs, regressions, security risks, data risks, missing tests, design weaknesses, and policy-related concerns.
- Record findings in `.wonder/runs/<run-id>/findings.json`.
- Sort findings by severity: critical, high, medium, low, info.
- Record policy rule ids when explicit policy criteria apply.

report

- Write `.wonder/runs/<run-id>/report.md`.
- Update `.wonder/reports/build-latest.json`.
- Lead the user-facing report with findings ordered by severity.
- If no issues are found, state that clearly and include remaining validation gaps or residual risks.

Use read-only validation for tests, lint checks, type checks, build checks, diff inspection, status inspection, and static analysis when those commands do not write changes.
Do not run write-mode formatters, auto-fix commands, code generation writes, or dependency installation without explicit consent.
You must not modify reviewed project files.
Do not write `.wonder/reports/govern-latest.json`.
Do not automatically install or invoke companion tools without consent.
