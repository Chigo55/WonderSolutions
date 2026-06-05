---
title: Template Authoring Meta-Rules
owner: ruler
applies-to: ruler
stack: stack-agnostic
---

# Template Authoring Meta-Rules

> Related rules: `${CLAUDE_PLUGIN_ROOT}/rules/backend.md` · `${CLAUDE_PLUGIN_ROOT}/rules/frontend.md` · `${CLAUDE_PLUGIN_ROOT}/rules/security.md`
> Template location (project-owned): `.claude/templates/`

This document is the **meta-rules for template authors (templater)**. Unlike other rule documents that contain only imperative text, this document preserves template format examples — such as substitution table comments and section-divider comments — in code blocks.

## Core Principle

**A copy-paste followed by variable substitution alone must be sufficient to produce working code immediately.**

- The substitution table alone must be sufficient to replace everything — completable without understanding the code structure.
- Provide complete forms including imports, annotations, URL patterns, and method signatures.
- No TODO comments or unfinished blocks — must be free of syntax errors in the pre-substitution state.

---

## Token Conventions (authoritative)

Use only the following notation for each substitution position. **Identifier positions use `Xxx`/`xxx`; string/path positions use `{module}`/`{domainName}` — do not mix.**

| Token | Position | Example |
|---|---|---|
| `{module}` | 2-character lowercase module code (package · URL · string) | `wo`, `eq`, `inv` |
| `{domainName}` | camelCase domain (URL · filename · string) | `woWorkShift` |
| `Xxx` | Class PascalCase prefix (identifier) | `WoWorkShift` |
| `xxx` | Variable camelCase prefix (identifier) | `woWorkShift` |
| `{gridId}` | Grid element ID (HTML/JS) | `wsmErpWoWorkShiftGrid` |
| `{Entity}` | Entity name PascalCase (HTML/JS) | `WoWorkShift` |
| `{author}` · `{date}` | Javadoc | `John Doe` · `2026-05-29` |

---

## Substitution Table Comment [required — top of every template]

The substitution table must be included in the comment at the very top of the file.

### Java

```java
// ============================================================
// [Pattern] {patternName}
//
// Substitution table:
//   {module}     → module code (2 lowercase chars)    e.g.) wo
//   {domainName} → domain name (camelCase)            e.g.) woWorkShift
//   Xxx          → class prefix (PascalCase)          e.g.) WoWorkShift
//   xxx          → variable prefix (camelCase)        e.g.) woWorkShift
//   {author}     → author name
//   {date}       → creation date (YYYY-MM-DD)
//
// Usage scenarios:
//   - {situation where this pattern is appropriate}
//
// Real examples: WoWorkShift, EqEquipmentMaster, PoCurrencies
// ============================================================
```

### HTML

```html
<!-- ============================================================
  Pattern: {patternName}
  Substitution table:
    {module}     → module code       e.g.) wo
    {domainName} → domain name       e.g.) woWorkShift
    {gridId}     → grid ID           e.g.) wsmErpWoWorkShiftGrid
  Real examples: woWorkShift, eqEquipmentMaster
============================================================ -->
```

### JS

```javascript
// ============================================================
// Pattern: {patternName}
// Substitution table:
//   {gridId}     → grid element ID          e.g.) wsmErpWoWorkShiftGrid
//   {domainName} → variable name prefix     e.g.) woWorkShift
//   {module}     → URL module path          e.g.) wo
//   {Entity}     → entity name              e.g.) WoWorkShift
// Real examples: woWorkShift, eqEquipmentMaster, poCurrencies
// ============================================================
```

---

## Section-Divider Comments [required]

### Java

```java
// ── Query ─────────────────────────────────────────────────────

// ── CUD ───────────────────────────────────────────────────────

// ── Popup ─────────────────────────────────────────────────────
```

### HTML

```html
<!-- ===================== Search Criteria ==================== -->

<!-- ===================== Grid =============================== -->
```

### JS

```javascript
// ── 1. Grid Initialization ────────────────────────────────────
// ── 2. Document Ready ─────────────────────────────────────────
// ── 3. Query ──────────────────────────────────────────────────
// ── 4. Save ───────────────────────────────────────────────────
// ── 5. Add / Delete Row ───────────────────────────────────────
```

---

## Layer-Specific Template Rules

- **Java**: Complete file from package declaration to the closing `}` of the class. Wildcard imports (`*`) are forbidden; use `@Autowired` injection (do not mix with constructor injection). Add variant patterns as `// [Variant] ...` comment blocks.
- **HTML**: Write only the content inside `layout:fragment="Content"` (do not include `<html>` or `<head>`). searchForm hidden fields, button permissions, and CSS classes follow their respective authoritative rules — `${CLAUDE_PLUGIN_ROOT}/rules/frontend.md`, `${CLAUDE_PLUGIN_ROOT}/rules/security.md`.
- **JS**: Complete file including `$(document).ready()`. Apply `changesData` array conversion + filter `deletedRows` from `updatedRows`, check fetch response `res.ok`, do not redeclare global variables (`CONTEXT_PATH` · `COMMON_MESSAGES`).

---

## Catalog — Single index.json (authoritative)

The authoritative catalog is **one place**: `.claude/templates/index.json` (schema: `${CLAUDE_PLUGIN_ROOT}/templates/index.schema.json`, draft-07). The templater accumulates entries during active use, starting from an empty seed.

Fields for each template entry:

| Field | Type | Description |
|------|------|-------------|
| `id` | string (`^[a-z0-9-]+$`) | Unique identifier |
| `pathPatterns` | string[] (minItems 1) | Target path globs this template applies to (e.g., `**/*Controller.java`) |
| `description` | string | One-line description |
| `path` | string | Relative path under `scaffolds/` or `patterns/` |
| `metadata` | object | (optional) stack, tags, etc. |

- `pathPatterns` glob convention: `**/` (zero or more directories), `**` (arbitrary), `*` (single segment, no slash).
- Reading `index.json` sets the explore marker for the enforce-template hook — `Write`/`Edit` to a matching path without prior exploration is blocked.

---

## INDEX.md Authoring Rules

The `INDEX.md` in each template directory (human-readable pattern index) follows this structure:

```markdown
# {Layer} Template Index

## Pattern Selection Criteria

| Filename | Condition1 | Condition2 | Condition3 |
|--------|:-----:|:-----:|:-----:|
| pattern-a | ✓ | ✗ | ✓ |

---

## Per-File Details

### {filename}
- **Usage**: {one line describing when to use it}
- **Real examples**: {3 or more actual domain names}
- (layer-specific additional items — see table below)
```

### Layer-Specific Additional Items

| Layer | Common (required) | Layer-specific additional items |
|--------|----------|---------------------|
| Controller | Usage, real examples | `Endpoints` (method · path · return type) |
| Service | Usage, real examples | `Methods`, `Rules` (transaction · processing order) |
| Mapper | Usage, real examples | `Method list` (select / count / cud) |
| Form | Usage, real examples | `Field composition` (row types · search criteria) |
| DTO | Usage, real examples | `Field groups`, `@JsonIgnore targets` |
| HTML | Usage, real examples | `Structure`, `Characteristics` (layout type) |
| JS | Usage, real examples | `Sections` (1.init / 2.query / 3.save ...) |

- Pattern selection criteria table is required — must enable at-a-glance template selection.
- Real examples must be actual existing domain names only (no fictitious names).
- INDEX.md is a reference document for AI code writing, not a rules document — these meta-rules define the minimum standard; more detailed items may be added per layer.

---

## Validation Checklist

Must verify after completing a new template:

- [ ] Substitution table is included in the top-of-file comment
- [ ] All variables in the substitution table are actually used in the code body
- [ ] No syntax errors in the pre-substitution state (Java: compiles, HTML: tags closed, JS: brackets matched)
- [ ] At least 3 real example domains are listed
- [ ] Section-divider comments are included
- [ ] No unfinished logic (TODO, empty method bodies)
- [ ] Entry added to `index.json` (schema passes, `path` exists, `pathPatterns` not over-matching)
