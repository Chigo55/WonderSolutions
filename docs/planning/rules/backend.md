# backend rule — Planning Document

## Overview

Meta-rule document defining architectural constraints for the Java / Spring Boot / MyBatis layer.
Used by the ruler agent to generate project-specific `.claude/rules/backend.md`.

## Current Behavior

**Sections covered:**
- Layer Structure: `Controller → Service → Mapper` one-way dependency
- Naming: PascalCase classes, camelCase methods, 2-char module prefix convention
- Data Access: SP-only (`@Select` with `CALL sp_*`), no `@Insert/@Update/@Delete`
- DTO/Form: Separate input (Form) and output (DTO) objects; no entity exposure
- Service (Query): `@Transactional(readOnly=true)` on read methods
- Service (CUD): `@Transactional` on create/update/delete methods
- Controller: `@RestController` for API, `@Controller` for views; `@PreAuthorize` on all endpoints
- Template Exploration: must be done before implementation
- Review Checklist: per-layer verification items

## Inputs / Outputs

| | Detail |
|-|--------|
| **Input** | Existing codebase ADR (`.claude/adr/backend.md`) + this meta-rule |
| **Output** | `.claude/rules/backend.md` (project-specific rule) |

## Dependencies

- Ruler agent in `generate` mode.
- `.claude/adr/backend.md` must exist first.
- Project-specific rule overrides this meta-rule when both exist.

## Improvement Direction

- Add stored procedure calling patterns with parameter binding examples.
- Add error handling patterns: global `@ControllerAdvice` vs. method-level `try/catch`.
- Add pagination convention (page/size parameters, `PageRequest` usage).
- Document the standard response envelope format for API endpoints.
- Add test conventions: which layer needs what type of test (unit vs. integration).
