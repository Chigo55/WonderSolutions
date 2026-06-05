---
title: Backend Authoring Meta-Rules
owner: ruler
applies-to: ruler
stack: stack-agnostic
---

# Backend Authoring Meta-Rules

> Related meta-rules: `${CLAUDE_PLUGIN_ROOT}/rules/frontend.md` · `${CLAUDE_PLUGIN_ROOT}/rules/security.md` · `${CLAUDE_PLUGIN_ROOT}/rules/templates.md`
> Generated output location: `.claude/rules/backend.md`

This document is the **meta-rules for rule authors (ruler)**. It defines what a complete project-specific backend rule must contain, how to discover each section from the project's existing code, and how to validate completeness.

## Core Principle

**A generated backend rule must be self-sufficient: a developer reading it alone must be able to implement any new domain without referencing external sources.**

- Every decision that varies between projects must be explicitly stated.
- Discovery over assumption: extract conventions from the project's existing code, not from general knowledge.
- Confirm extracted conventions with the user before finalizing.

---

## Required Sections

A complete `.claude/rules/backend.md` must contain all of the following sections:

| Section | Content |
|---------|---------|
| Layer Structure | Package root, one-way dependency direction, file count per domain |
| Naming | Class/variable/method naming rules, domain naming formula |
| Data Access Layer | Query technology (ORM / raw SQL / SP), method prefix conventions, parameter rules |
| DTO/Form | Base class requirements, field conventions, serialization rules |
| Service — Query | Return type, transaction rules |
| Service — CUD | Transaction requirements, processing order, error handling |
| Controller | Return types per endpoint type, annotation rules |
| Template Exploration | Reference to template catalog before implementation |
| Review Checklist | Actionable binary checklist for rule compliance |

---

## Exploration Guide

For each required section, use the following approach to discover the project's conventions from existing code:

### Layer Structure
- Glob `**/*Controller.java` → extract common package prefix
- Count files per domain → determine expected file-per-domain count
- Check import statements for cross-layer dependencies

### Naming
- Sample 3–5 existing class names → extract casing pattern
- Sample data access layer method names → extract prefix convention
- Read `${CLAUDE_PLUGIN_ROOT}/rules/workflow.md` → domain naming formula

### Data Access Layer
- Open 2–3 data access files → identify query technology (MyBatis @Select / JPA / QueryDSL / JDBC)
- Check for stored procedure calls (EXEC / CALL) vs. inline SQL vs. JPQL
- Identify method-level annotations and parameter binding style

### DTO/Form
- Open 1–2 DTO files → check for base class and field ordering conventions
- Check for grid-binding annotations
- Identify `@JsonIgnore` targets (sensitive fields such as user credentials)

### Service — Query / CUD
- Check `@Transactional` placement (class-level / method-level / absent)
- Identify CUD processing order from existing service methods (delete/insert/update sequence)
- Identify error handling pattern (errorCode field / exception class / HTTP status)

### Controller
- Sample 2–3 Controllers → identify return types per method type
- Check annotation pattern (`@RestController` / `@Controller` + `@ResponseBody`)
- Identify CUD HTTP methods (POST / PUT / PATCH split policy)

---

## Reference Example — Spring Boot + MyBatis (Stored Procedure)

The following is a complete reference implementation of `.claude/rules/backend.md` for a Spring Boot + MyBatis SP project. Use as a quality benchmark when authoring a new rule.

### Layer Structure
- `Controller → Service → Mapper` one-way dependency. Reverse direction and layer-skipping are forbidden.
- Controller handles HTTP concerns only; business logic belongs exclusively in Service.
- Do not expose entities/internal objects directly in Controller responses — convert to DTO.
- Package root: `io.boot.wonder.web...` (group by domain/feature).
- One domain = 5 Java files: `{Entity}Controller.java`, `service/{Entity}Service.java`, `mapper/{Entity}Mapper.java`, `dto/{Entity}DTO.java`, `form/{Entity}Form.java`.

### Naming
- Class names in PascalCase (`WoWorkShift`), variables and methods in camelCase (`woWorkShift`, `selectWoWorkShift`).
- Mapper method prefixes: `select` / `selectCount` / `insert` / `update` / `delete`.
- Domain naming conventions: see `${CLAUDE_PLUGIN_ROOT}/rules/workflow.md`.

### Data Access Layer — Stored Procedure Only
- All queries invoke a stored procedure via `@Select("EXEC dbo.SP_{MODULE}_{DOMAIN}_{ACTION} ...")`.
- `@Insert` / `@Update` / `@Delete` are forbidden.
- `@Options(statementType = StatementType.CALLABLE)` only on CUD methods — do not declare on SELECT.
- SELECT/COUNT methods must explicitly declare `@Param("xxxForm")` and `@Param("pageable")`. CUD uses a single DTO parameter → `@Param` not needed.
- Stored procedure naming format: `SP_{MODULE}_{DOMAIN}_{ACTION}`. Variants: `_SELECT_TC` (count) · `_PRINT_LIST_SELECT` (print) · `_REQUEST_SEQ_SELECT` (sequence).

### DTO
- Must extend `BaseDTO` — automatically includes 7 common fields (`rowNo`, `createdBy`, `creationDate`, `lastUpdatedBy`, `lastUpdateDate`, `errorCode`, `errorMsg`); do not redeclare in child DTOs.
- `rowNo` is a 1-based row number returned by the stored procedure (not assigned by the client).
- `@GridSetup(gridName)` is required — gridName must exactly match the HTML grid element id.
- `loginUserSeq` field must be annotated with `@JsonIgnore`.
- Columns fetched via JOIN must have their source table noted in a comment.

### Form
- Field declaration order: `createdRows` → `updatedRows` → `deletedRows` → search criteria.
- When the same Form includes detail rows, prefix them with `detail*` (e.g., `detailCreatedRows`).

### Service — Query
- Return: `new PageImpl<>(list, pageable, mapper.selectCount(form))` (for print full-list return use `new PageImpl<>(list)`).
- Do not declare `@Transactional`.

### Service — CUD
- `@Transactional` is required — only on public CUD methods (do not redeclare on private helpers).
- Processing order: **delete → insert → update** (order must not change).
- Check rows for null/empty before entering each processing block.
- After a stored procedure call, if `"E".equals(dto.getErrorCode())` → throw `ApplicationException` (transaction rolls back automatically).
- `loginUserSeq` — obtain once via `SecurityUtils.getPrincipal().getUserSeq()` in the public method and pass to private helpers and DTOs.

### Controller
- Page rendering: return `String` (view path), no `@ResponseBody`.
- List query: return `Page<DTO>`, `@GetMapping("/list")`.
- CUD: return `new SuccessVO(MessageUtils.getUpdateMessage(true))`.
- Save with files: `@PostMapping` (multipart) / Save without files: `@PutMapping`.
- Class annotation: pure API = `@RestController`, page-only = `@Controller`, mixed = `@Controller` + method-level `@ResponseBody`.

### Template Exploration Before Implementation
Before writing code, explore the project template catalog (`.claude/templates/index.json`) and reference the template most similar to the screen type.

### Review Checklist
- [ ] Controller → Service → Mapper one-way, package `io.boot.wonder.web`
- [ ] Mapper is stored-procedure-only (`@Select EXEC`), no `@Insert/@Update/@Delete`
- [ ] `@Options(CALLABLE)` only on CUD, `@Param` declared on SELECT/COUNT
- [ ] DTO extends `BaseDTO` · `@GridSetup` · `loginUserSeq @JsonIgnore`
- [ ] Service-CUD `@Transactional` + delete→insert→update + errorCode `"E"` check
- [ ] Controller return types (String / Page<DTO> / SuccessVO) follow the convention
- [ ] No direct entity exposure (converted to DTO)

---

## Validation Checklist

After completing a generated `.claude/rules/backend.md`, verify:

- [ ] All 9 required sections are present and non-empty
- [ ] Conventions were extracted from the project's actual code (not assumed from general knowledge)
- [ ] User confirmed extracted conventions before finalization
- [ ] Data access technology is unambiguously specified (ORM / SP / raw SQL)
- [ ] Error handling pattern is explicitly stated
- [ ] Review Checklist in the generated rule contains actionable binary items
- [ ] No contradictions with `${CLAUDE_PLUGIN_ROOT}/rules/workflow.md` or `${CLAUDE_PLUGIN_ROOT}/rules/security.md`
