# /wh-review — Planning Document

## Overview

Standalone review command that inspects existing code, templates, or rules without running the full create/modify pipeline.
Selects the appropriate agent based on what is being reviewed.

## Current Behavior

1. User invokes `/wh-review` with a target (file path, domain name, or layer).
2. Command determines review type and dispatches the matching agent:
   - Code → developer agent in `review` mode
   - Templates → templater agent in `review` mode
   - Rules → ruler agent in `review` mode
3. Agent reads the target, applies the relevant checklist, and returns findings.
4. No files are written unless the user explicitly requests fixes.

## Inputs / Outputs

| | Detail |
|-|--------|
| **Input** | Target specifier (file path, domain, or layer flag) |
| **Output** | Review findings report (issues, severity, recommendations) |

## Dependencies

- Target files must be readable.
- Relevant rule file (`.claude/rules/{layer}.md`) loaded for context.
- No request file required.

## Improvement Direction

- Run developer + ruler + security agents in parallel for a multi-perspective review.
- Produce a structured report (CRITICAL / HIGH / MEDIUM / LOW) with file:line references.
- `--fix` flag: auto-apply LOW/MEDIUM findings after user confirmation.
- Support reviewing a full domain (all 7 files) rather than one file at a time.
- Integrate with git diff to review only changed files since last commit.
