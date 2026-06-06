# templater — Planning Document

## Overview

Stage 2 of the pipeline. Manages the template catalog (`index.json`) and ensures the developer has explored appropriate templates before writing code.

## Current Behavior

- Loads `.claude/templates/index.json` (JSON Schema draft-07 validated).
- For each file in the module plan, searches the catalog for a matching template by `pathPatterns`.
- If a match exists: instructs the developer to read it (satisfying the enforce-template hook).
- If no match: extracts the relevant pattern from the existing codebase and registers a new template entry.
- Enforces token convention from `templates.md` meta-rule (`{module}`, `Xxx`, `xxx`, `{gridId}`, etc.).
- Validates all templates are syntax-error-free before substitution instructions are handed to the developer.
- In `modify` mode, only checks templates relevant to the changed files.
- In `review` mode, audits the catalog for missing entries or stale patterns.

## Inputs / Outputs

| | Detail |
|-|--------|
| **Input** | Module plan from planner + `.claude/templates/index.json` |
| **Output** | Updated `index.json` with new/existing entries; template read instructions for developer |

## Dependencies

- `.claude/templates/index.json` must exist (seeded by `init-requests.js`).
- `mark-template-read.js` hook tracks which templates have been read in the session.
- `enforce-template.js` hook gates developer writes on this stage completing.
- `templates.md` meta-rule is the authoritative token convention reference.

## Improvement Direction

- Auto-detect template candidates from the existing codebase without manual extraction.
- Template diff view: show how an existing template differs from the current implementation before deciding to update.
- Support template versioning in `index.json` so old templates can be retained alongside new ones.
- Validate token substitution completeness (no unresolved `{token}` placeholders) before handing to developer.
