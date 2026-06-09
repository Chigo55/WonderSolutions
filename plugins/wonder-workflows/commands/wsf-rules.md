---
description: On-demand rule management. Use 'amend' to update a project rule, 'audit' to health-check all rules.
argument-hint: "amend [<layer>] | audit"
---

# /wsf-rules

## Parse mode

Read the argument:
- `amend [<layer>]`: rule amendment mode (e.g. amend security, or a custom active layer). If no layer argument is provided, ask the user which active layer to amend.
- `audit`: rule audit mode.
- No argument or unrecognized: display usage and stop.

## Amend mode

1. Confirm the target layer.
2. Ask the user: "What would you like to change in the `{layer}` rule, and why?"
3. Invoke **ruler** in **amend mode** with the layer and the user's change description.
4. Ruler presents the proposed change for user confirmation.
5. On approval, ruler writes the updated `.claude/rules/{layer}.md` and appends amendment log to `.claude/adr/{layer}.md`.
6. Record state:

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/write-state.js" "<cwd>" "rules.{layer}" "<ISO-timestamp>"
```

## Audit mode

1. Invoke **ruler** in **audit mode**.
2. Ruler reads all `.claude/rules/*.md` and `.claude/adr/*.md`.
3. Ruler writes `.claude/reports/wsf-rules-audit-{YYYYMMDD-HHMMSS}.md`.
4. Present summary to user.
