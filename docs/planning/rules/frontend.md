# frontend rule — Planning Document

## Overview

Meta-rule document defining conventions for the Thymeleaf / Kendo UI / ES6 frontend layer.
Used by the ruler agent to generate project-specific `.claude/rules/frontend.md`.

## Current Behavior

**Sections covered:**
- Stack: Thymeleaf templates, Kendo web components, Bootstrap 5, ES6 modules — no JSP, no jQuery
- File Structure: `{domainName}.html` + `{domainName}.js` per domain
- Naming Conventions: camelCase JS variables, kebab-case HTML IDs, `{gridId}` token for grid elements
- Required Form Fields: hidden inputs for CSRF, user context fields per domain type
- Permission Guards: `sec:authorize` on Thymeleaf sections, JS-side guard before data mutation
- Data Mutation Conventions: save via API call, not form submit; confirm dialogs before delete
- Save/Submit Flow: validate → confirm → POST → toast notification → grid refresh
- Template Exploration: templater stage must complete before developer writes HTML/JS
- Review Checklist: per-file verification items

## Inputs / Outputs

| | Detail |
|-|--------|
| **Input** | Existing codebase ADR (`.claude/adr/frontend.md`) + this meta-rule |
| **Output** | `.claude/rules/frontend.md` (project-specific rule) |

## Dependencies

- Ruler agent in `generate` mode.
- `.claude/adr/frontend.md` must exist first.
- Project-specific rule overrides this meta-rule when both exist.

## Improvement Direction

- Add Kendo widget-specific initialization patterns (e.g., Grid, DropDownList, DatePicker lifecycle).
- Add widget destroy pattern for SPA-style navigation (avoid memory leaks).
- Document the standard Thymeleaf fragment inclusion pattern for reusable components.
- Add responsive layout conventions (Bootstrap breakpoints used, grid column count).
- Add i18n/l10n conventions for date formats, number formats.
