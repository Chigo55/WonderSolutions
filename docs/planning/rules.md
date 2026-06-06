# Rules — Group Planning Document

## Overview

Five meta-rule documents that define architectural constraints and conventions for the target stack.
Meta-rules are templates; the ruler agent generates project-specific rules from them during `/wh-init`.

| Rule | Layer | Generated Output |
|------|-------|-----------------|
| backend.md | Java / Spring Boot / MyBatis | `.claude/rules/backend.md` |
| frontend.md | Thymeleaf / Kendo / ES6 | `.claude/rules/frontend.md` |
| security.md | Cross-cutting | `.claude/rules/security.md` |
| workflow.md | Process / naming | (reference only, not generated) |
| templates.md | Token convention / catalog | (reference only, not generated) |

## Current Behavior

- Meta-rules define the authoritative checklist each agent validates against.
- Project-specific rules (`.claude/rules/`) override meta-rules when both exist.
- `workflow.md` is referenced directly by the developer agent for naming and process rules.
- `templates.md` is the authoritative source for token convention (`{module}`, `Xxx`, `xxx`, etc.).
- `backend.md` enforces SP-only data access (no @Insert/@Update/@Delete annotations).
- `frontend.md` enforces Kendo web components and ES6 modules (no JSP/jQuery).
- `security.md` covers input validation, permission guards, user context handling, and file upload rules.

## Inputs / Outputs

| Rule | Used By | Output |
|------|---------|--------|
| backend.md | ruler (generate), developer (review) | `.claude/rules/backend.md` |
| frontend.md | ruler (generate), developer (review) | `.claude/rules/frontend.md` |
| security.md | ruler (generate), developer (review) | `.claude/rules/security.md` |
| workflow.md | developer (reference) | — |
| templates.md | templater, developer (reference) | — |

## Dependencies

- ADR documents (`.claude/adr/`) must exist before rules are generated.
- Ruler agent manages rule generation lifecycle.
- Developer and ruler agents both read generated rules during pipeline execution.

## Improvement Direction

- `security.md` could include OWASP Top 10 mapping for each rule item.
- `backend.md` could add more SP calling patterns and transaction scope examples.
- `frontend.md` could add Kendo widget-specific initialization and destroy patterns.
- `workflow.md` could include a troubleshooting section for common naming mistakes.
- Add a `testing.md` meta-rule covering unit test / integration test conventions for the stack.
- Support rule versioning so projects can pin to a specific meta-rule version.
