---
name: wonder-rules
description: On-demand rule management. Use 'amend' to update a project rule, 'audit' to health-check all rules. Codex projection of /wsf-rules; use when the user asks for wsf-rules or $wonder-rules.
---

> Generated from `plugins/wonder-workflows/commands/wsf-rules.md` by `npm run sync:codex` — do not edit by hand.

## Codex Execution Notes

- Runtime state root is `.codex/wonder/`. Treat `.claude/` as a read-only fallback; never write it unless the user explicitly asks.
- **Role provisioning (once per project):** copy this skill's bundled `agents/*.toml` into the project's `.codex/agents/` (keep existing files); copy bundled `references/meta-rules/*.md` into `.codex/wonder/meta-rules/`.
- Delegate stages with `spawn_agent` using those roles; collect results with `wait_agent`, then `close_agent`. `[agents] max_depth` defaults to 1, so perform any nested delegation (e.g. modifier → developer) from this thread.
- Where `${CLAUDE_PLUGIN_ROOT}` appears, it means this plugin's install root.

# $wonder-rules

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
5. On approval, ruler writes the updated `.codex/wonder/rules/{layer}.md` and appends amendment log to `.codex/wonder/adr/{layer}.md`.

## Audit mode

1. Invoke **ruler** in **audit mode**.
2. Ruler reads all `.codex/wonder/rules/*.md` and `.codex/wonder/adr/*.md`.
3. Ruler writes `.codex/wonder/reports$wonder-rules-audit-{YYYYMMDD-HHMMSS}.md`.
4. Present summary to user.
