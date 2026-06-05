---
title: Development Workflow Rules
owner: ruler
applies-to: developer
stack: Spring Boot + MyBatis(SP) + Thymeleaf + Kendo
---

# Development Workflow Rules

> Related rules: `${CLAUDE_PLUGIN_ROOT}/rules/backend.md` · `${CLAUDE_PLUGIN_ROOT}/rules/frontend.md` · `${CLAUDE_PLUGIN_ROOT}/rules/security.md` · `${CLAUDE_PLUGIN_ROOT}/rules/templates.md`

When developing a new domain/screen, follow this order: finalize domain naming → check rule availability → explore templates → implement.

## Rule Application Priority

Before starting implementation, check which project-specific rules are available:

1. **`.claude/rules/{layer}.md` exists** → follow that rule for the layer (backend / frontend / security / templates).
2. **`.claude/rules/{layer}.md` absent** → before template exploration, templater explores the project's existing code to extract layer-specific conventions and passes them to developer as an inline context block (per-session fallback, does not persist). Run `/wh-init --{layer}` at any time to generate a persistent project rule.

The plugin's `${CLAUDE_PLUGIN_ROOT}/rules/{layer}.md` files are meta-rules (ruler-authored rule structure guides), not project conventions — do not use them as coding rules for the developer.

## Domain Naming (consistent across all files and URLs)

Before developing a new domain, finalize its name first, then apply it consistently across all files, classes, and URLs.

| Item | Rule | Example |
|------|------|---------|
| Module code | 2-character lowercase domain abbreviation | `wo` |
| Domain name | Module code + feature name (camelCase) | `woWorkShift` |
| Class name | Domain name in PascalCase | `WoWorkShift` |

- Java file and variable details: `${CLAUDE_PLUGIN_ROOT}/rules/backend.md`
- JS/HTML file and variable details: `${CLAUDE_PLUGIN_ROOT}/rules/frontend.md`

## Template Exploration Before Implementation (required)

After finalizing the domain name, you must explore the project template catalog (`.claude/templates/index.json`) before writing any code. This is the normative basis for the enforce-template hook — `Write`/`Edit` operations without prior exploration are blocked.

- Use the template most similar to the screen type as a starting point; replace domain fields only and preserve the structure.
- Token conventions and substitution rules: `${CLAUDE_PLUGIN_ROOT}/rules/templates.md`
- Layer-specific exploration details: `${CLAUDE_PLUGIN_ROOT}/rules/backend.md` (Java), `${CLAUDE_PLUGIN_ROOT}/rules/frontend.md` (HTML/JS)

## DB Label Registration (user scope)

Labels used in Thymeleaf as `${@messageUtils.getMessage('key')}` are **stored in the DB** (not in properties files). Register the required field-name and button-name keys in the DB before use. DB data registration is out of scope for the AI and is performed by the user.

Common keys (already registered, examples): `button.add_row`, `button.delete_row`, `button.search`, `button.select`.

## Review Checklist (review mode)

- [ ] Domain name applied consistently across all files, classes, and URLs
- [ ] Template exploration (`.claude/templates/index.json`) performed before implementation
- [ ] Confirm whether DB label keys required by the screen have been registered (user scope)
