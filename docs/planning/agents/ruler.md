# ruler — Planning Document

## Overview

Stage 4 of the pipeline (and also the agent for `/wh-init` initialization).
Cross-checks all deliverables against rule checklists, generates project-specific rules from ADRs, and produces HTML reports.

## Current Behavior

**Pipeline terminus (review mode):**
- Reads all 7 implemented files.
- Checks each file against the relevant layer checklist (backend/frontend/security).
- Reports violations; blocks completion on CRITICAL items.

**Initialization modes:**
- `adr-extract`: Scans existing codebase, produces `.claude/adr/{layer}.md` (Context/Decision/Rationale/Consequences per decision).
- `generate`: Reads ADR + meta-rule, produces `.claude/rules/{layer}.md` tailored to the project.
- `create`: Authors a new meta-rule document from scratch.
- `modify`: Updates an existing rule or ADR.

**Rule priority:**
- `.claude/rules/{layer}.md` (project-specific) overrides `plugins/wonder-harness/rules/{layer}.md` (meta-rule).

## Inputs / Outputs

| Mode | Input | Output |
|------|-------|--------|
| review | All pipeline deliverables | Validation report (pass/fail per checklist item) |
| adr-extract | Existing codebase | `.claude/adr/{layer}.md` |
| generate | ADR + meta-rule | `.claude/rules/{layer}.md` |
| create | User description | New meta-rule `.md` file |
| modify | Existing rule/ADR | Updated rule/ADR |

## Dependencies

- `enforce-init.js` hook enforces step ordering (`adr-extract → generate → report`).
- ADR must exist before `generate` mode can run.
- Meta-rules must exist for `generate` mode; no fallback if missing.

## Improvement Direction

- Severity-ranked findings: CRITICAL / HIGH / MEDIUM / LOW with auto-fix for LOW.
- `--strict` flag to treat MEDIUM items as blocking.
- Incremental rule update: detect which ADR sections changed and regenerate only affected rule sections.
- HTML report could include a rule-to-code traceability matrix (which rule covers which file).
- Support exporting validation report as JSON for CI pipeline integration.
