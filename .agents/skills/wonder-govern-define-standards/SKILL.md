---
name: wonder-govern-define-standards
description: Create and maintain project-specific standards.
---

# Define Standards

Create and maintain project-specific standards in `.wonder/standards/`.

## Procedure

scope

- Determine which standards domains are in scope.
- Read existing `.wonder/standards/` files when present.
- Read `.wonder/config/govern.json` when present.
- Identify any requested deletion and confirm it is explicit.

observe

- Inspect project files and documents relevant to the requested domains.
- Record observed conventions separately in `.wonder/runs/<run-id>/observed-conventions.md`.
- Do not treat observed conventions as adopted standards unless accepted.

propose

- Propose candidate rules in `.wonder/runs/<run-id>/proposed-standards.md`.
- Use rule ids in the format `GOV-<DOMAIN>-<NUMBER>`.
- Use severity values in this order: critical, high, medium, low, info.
- Include rationale for every proposed rule.
- Detect conflicts with existing rules, including same id with different instruction, contradictory same-domain rules, enforcement-affecting severity changes, and deletion or replacement without explicit user request.
- Ask for confirmation before applying conflicting changes.

apply

- Write accepted non-conflicting standards to `.wonder/standards/`.
- Use kebab-case Markdown file names for standards files.
- Delete standards only when explicitly requested by the user.
- Preserve unrelated standards content.
- Record standards files changed, rules added, rules updated, and conflicts in `.wonder/runs/<run-id>/changes.md` and `.wonder/runs/<run-id>/artifacts.json`.

report

- Write `.wonder/runs/<run-id>/report.md`.
- Summarize created or modified standards files.
- Summarize observed conventions used as evidence.
- Summarize accepted proposed standards.
- List conflicts that need a user decision.
- Recommend running `wonder-govern.check-policy` after standards changes.

Do not write `.wonder/reports/govern-latest.json`.
Do not automatically run check-policy by default.
Do not modify other plugin config files.
Do not delete standards without explicit user request.
