---
name: wonder-rules
description: Manage WonderSolutions project rules in Codex. Use for wsf-rules amend, wsf-rules audit, rule amendment, ADR alignment checks, or stale project-rule audits without changing Claude rule files.
---

# Wonder Rules

Manage Codex-side project rules under `.codex/wonder/`.

## Modes

Use `amend [layer]` to update a rule. Use `audit` to check all rules. If mode is unclear, show the two modes and ask which one to run.

## Amend Mode

1. Confirm the target layer.
2. Read `.codex/wonder/rules/{layer}.md`.
3. Read `.codex/wonder/adr/{layer}.md` if present.
4. Ask what should change and why, unless the user already supplied it.
5. Draft the change and show the before/after summary.
6. On approval, update the Codex rule and append an amendment entry to the Codex ADR.

Do not edit `.claude/rules/` or `.claude/adr/`. If only Claude rules exist, offer to create a Codex copy first.

## Audit Mode

Read all `.codex/wonder/rules/*.md` and `.codex/wonder/adr/*.md`. Use `.claude/` files only as read-only legacy context.

Check for:

- Internal contradictions
- ADR conflicts
- Stale references to files or patterns no longer present
- Missing security or structural sections

Write `.codex/wonder/reports/wonder-rules-audit-{YYYYMMDD-HHMMSS}.md` and summarize `HEALTHY`, `CONFLICT`, `STALE`, and `MISSING` counts.
