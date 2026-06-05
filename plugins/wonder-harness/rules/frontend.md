---
title: Frontend Authoring Meta-Rules
owner: ruler
applies-to: ruler
stack: stack-agnostic
---

# Frontend Authoring Meta-Rules

> Related meta-rules: `${CLAUDE_PLUGIN_ROOT}/rules/backend.md` · `${CLAUDE_PLUGIN_ROOT}/rules/security.md` · `${CLAUDE_PLUGIN_ROOT}/rules/templates.md`
> Generated output location: `.claude/rules/frontend.md`

This document is the **meta-rules for rule authors (ruler)**. It defines what a complete project-specific frontend rule must contain, how to discover each section from the project's existing code, and how to validate completeness.

## Core Principle

**A generated frontend rule must make naming, structure, and data-flow decisions unambiguous: a developer must be able to produce any new screen without guessing at conventions.**

- Capture widget-version-specific gotchas in template inline comments, not in rules — rules govern structure, contracts, and naming only.
- Discovery over assumption: extract conventions from the project's actual HTML/JS files.
- Confirm extracted conventions with the user before finalizing.

---

## Required Sections

A complete `.claude/rules/frontend.md` must contain all of the following sections:

| Section | Content |
|---------|---------|
| Stack | View technology, grid/widget library, script module system |
| File Structure | JS and HTML path conventions, 1:1 correspondence rule |
| Naming Conventions | Grid/widget ID rules, function naming, URL path pattern |
| Required Form Fields | Hidden fields every screen must include (auth, locale, etc.) |
| Permission Guards | How to conditionally render action buttons |
| Data Mutation Conventions | changesData / row-tracking pattern before server transmission |
| Save/Submit Flow | Required steps (cell-close → dirty-check → validate → fetch) |
| Template Exploration | Reference to template catalog before implementation |
| Review Checklist | Actionable binary checklist for rule compliance |

---

## Exploration Guide

For each required section, use the following approach to discover the project's conventions from existing code:

### Stack
- Glob `**/*.html` → identify view technology (Thymeleaf / JSP / Freemarker / React / etc.)
- Glob `**/*.js` → identify module system (ES6 modules / CommonJS / UMD / bundler)
- Inspect `<script>` tags or `import` statements → identify grid/widget library (Kendo / AG Grid / DataTables / etc.)

### File Structure
- Sample 3–5 JS and HTML file paths → extract the path template
- Verify whether JS and HTML share the same camelCase name
- Check `<script src>` or `th:src` patterns for the canonical load path

### Naming Conventions
- Open 2–3 HTML files → extract grid element IDs → infer ID naming formula
- Open corresponding JS files → extract function names → infer verb+target pattern
- Check URL construction in `fetch` calls → extract path pattern (`CONTEXT_PATH + '/{module}/{domain}'`)
- Check popup variable declarations → identify `var` vs `const`/`let` for cross-window exposure

### Required Form Fields
- Open 2–3 `<form id="searchForm">` blocks → list all `<input type="hidden">` fields
- Note field names, `th:value` sources, and order

### Permission Guards
- Search for `hasMenuRoleType` or equivalent permission check in HTML/JS
- Identify which button types require guards and what permission type they map to

### Data Mutation Conventions
- Search for `changesData` or equivalent row-change tracking variable
- Identify how updated/deleted rows are collected and deduplicated before submission

### Save/Submit Flow
- Open 2–3 save button handlers → document the step sequence
- Identify response-handling pattern (`res.ok` check / status code / JSON error field)

---

## Reference Example — Thymeleaf + Kendo UI + ES6

The following is a complete reference implementation of `.claude/rules/frontend.md` for a Thymeleaf + Kendo web components + ES6 project. Use as a quality benchmark when authoring a new rule.

### Stack
- View: Thymeleaf server-side rendering.
- Grid/widgets: Kendo UI web components (`is="kendo-grid"` custom built-in element).
- Scripts: ES6 modules. Legacy JSP and jQuery stack are forbidden.

### File Structure
- JS: `static/assets/js/front/wsmErp/{module}/{domainName}.js`
- HTML: `templates/pages/wsmErp/{module}/{domainName}.html`
- JS and HTML have a 1:1 camelCase same-name correspondence (`woWorkShift.js` ↔ `woWorkShift.html`).
- Load JS via `th:src="@{/js/front/wsmErp/{module}/{file}.js}"` — do not use `/assets/js/` paths.

### Naming Conventions

| Type | Rule | Example |
|------|------|---------|
| WMS/ERP single grid | `wsmErp{Module}{Domain}{Role}Grid` | `wsmErpWoWorkShiftGrid` |
| APS module grid | `aps{Domain}{Role}Grid` | `apsCmCountryCodeGrid` |
| Master / Detail / Attach | Role suffix `Master` · `Detail` (multiple: `Detail1`, `Detail2`) · `Attach` + `Grid` | `wsmErpWoWorkShiftMasterGrid` |

- Grid ID must exactly match the `@GridSetup(gridName)` value in the DTO.
- Function names in camelCase verb+target (`searchList`, `saveGrid`, `addRow`).
- URL path: `CONTEXT_PATH + '/{module}/{domainName}'`.
- Popup shared variables must be declared with `var` (`const`/`let` are not exposed as window properties).

### Required Hidden Fields in searchForm
Every screen's searchForm must include exactly 4 hidden fields: `corporationId`, `userSeq`, `isGridEditUse`, `locale`. The authoritative definition follows the project-accumulated templates.

### Permission Guards
- Common buttons (`#searchBtn` `#saveBtn` `#exportBtn` `#printBtn` `#uploadBtn` `#closeBtn`) are provided by the common layout — do not add them again in page HTML.
- Row add/delete buttons require a `th:if="${@securityUtils.hasMenuRoleType(...)}"` permission guard — authoritative permission types are in `.claude/rules/security.md`.

### Data Mutation Conventions
- Convert each Map in `changesData` to an array before sending.
- UIDs from `deletedRows` must be filtered out of `updatedRows` — if not applied, deleted rows are duplicated in `updatedRows` causing a double-processing bug.

### Save/Submit Flow
1. `closeCell()` — close the currently edited cell
2. `isModified()` — abort if no changes
3. Validation (`gridSaveValidation(grid, grid.grid)`)
4. `fetch` send — safely parse the response after checking `res.ok`

- Do not redeclare global variables (`CONTEXT_PATH`, `COMMON_MESSAGES.*`) already declared by the common layout.
- Widget-version-specific gotchas (datepicker init, popup-to-cell propagation, CSS quirks) are not codified in rules — capture them as inline comments in project-accumulated templates.

### Template Exploration Before Implementation
Before writing HTML or JS, explore the project template catalog (`.claude/templates/index.json`) and reference the template most similar to the screen type.

### Review Checklist
- [ ] No legacy view technology or script library (Thymeleaf + Kendo + ES6 only)
- [ ] JS/HTML 1:1 camelCase, path convention followed
- [ ] Grid ID naming rule + `@GridSetup` match verified
- [ ] searchForm required hidden fields all present
- [ ] changesData converted to array + `deletedRows.uid` filtered from `updatedRows`
- [ ] Save order: closeCell → isModified → validation → fetch(res.ok)
- [ ] Widget gotchas not hardcoded in rules (delegated to template inline comments)

---

## Validation Checklist

After completing a generated `.claude/rules/frontend.md`, verify:

- [ ] All 9 required sections are present and non-empty
- [ ] Conventions were extracted from the project's actual HTML/JS files (not assumed)
- [ ] User confirmed extracted conventions before finalization
- [ ] Grid ID naming formula is unambiguous (formula + example)
- [ ] Required hidden fields are listed explicitly (not just "follow templates")
- [ ] Widget-specific gotchas are explicitly excluded from rules scope
- [ ] Review Checklist in the generated rule contains actionable binary items
- [ ] No contradictions with `${CLAUDE_PLUGIN_ROOT}/rules/security.md`
