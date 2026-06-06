# security rule — Planning Document

## Overview

Meta-rule document covering cross-cutting security constraints that apply to all layers.
Used by the ruler agent to generate project-specific `.claude/rules/security.md`.

## Current Behavior

**Sections covered:**
- Data Access Integrity: SP-only writes; no raw SQL construction
- Permission Validation: `@PreAuthorize` on all controller methods; `sec:authorize` on view sections
- User Context Handling: user info from `SecurityContextHolder`; never from request parameters
- Common Security Utilities: shared utility classes for auth checks, session validation
- Input Validation: `@Valid` on `@RequestBody`/`@ModelAttribute`; constraint annotations on Form fields
- File Upload Security: MIME type validation, size limits, filename sanitization, storage path restrictions
- Sensitive Data Handling: no PII in logs, no plaintext passwords, masked output for sensitive fields
- Error Response Policy: generic error messages to client; full detail in server logs only
- Code Security Checklist: per-concern verification items

## Inputs / Outputs

| | Detail |
|-|--------|
| **Input** | Existing codebase ADR (`.claude/adr/security.md`) + this meta-rule |
| **Output** | `.claude/rules/security.md` (project-specific rule) |

## Dependencies

- Ruler agent in `generate` mode.
- `.claude/adr/security.md` must exist first.
- Project-specific rule overrides this meta-rule when both exist.

## Improvement Direction

- Add OWASP Top 10 mapping: which checklist item covers which OWASP category.
- Add CSRF token handling pattern for AJAX requests (Kendo datasource configuration).
- Add SQL injection prevention specifics for MyBatis SP parameter binding.
- Add session fixation and session timeout configuration conventions.
- Add audit logging conventions (who did what, when, from where).
