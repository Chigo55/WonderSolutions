---
title: Security Authoring Meta-Rules
owner: ruler
applies-to: ruler
stack: stack-agnostic
---

# Security Authoring Meta-Rules

> Related meta-rules: `${CLAUDE_PLUGIN_ROOT}/rules/backend.md` · `${CLAUDE_PLUGIN_ROOT}/rules/frontend.md` · `${CLAUDE_PLUGIN_ROOT}/rules/templates.md`
> Generated output location: `.claude/rules/security.md`

This document is the **meta-rules for rule authors (ruler)**. It defines what a complete project-specific security rule must contain, how to discover each section from the project's existing code and architecture, and how to validate completeness.

## Core Principle

**A generated security rule must make every security boundary explicit: authentication, authorization, data access, input validation, and error handling must each have an unambiguous policy.**

- Security rules are non-negotiable constraints, not guidelines — generated rules must use "must" / "forbidden", not "should" / "prefer".
- Discovery over assumption: identify the project's actual security utilities and patterns before codifying them.
- Confirm extracted conventions with the user before finalizing.

---

## Required Sections

A complete `.claude/rules/security.md` must contain all of the following sections:

| Section | Content |
|---------|---------|
| Data Access Integrity | Permitted query mechanisms, forbidden direct SQL/ORM mutations |
| Permission Validation | How authorization is checked per endpoint and per UI action |
| User Context Handling | How to obtain the authenticated user's identity (do not trust client input) |
| Common Security Utilities | Project-provided utilities to always use (do not re-implement) |
| Input Validation | Where and how to validate user-supplied data |
| File Upload Security | Allowed extension policy, path traversal prevention |
| Sensitive Data Handling | Fields requiring `@JsonIgnore` or equivalent, audit field assignment |
| Error Response Policy | What error details may be exposed to the client |
| Code Security Checklist | Actionable binary checklist for security compliance |

---

## Exploration Guide

For each required section, use the following approach to discover the project's security patterns from existing code:

### Data Access Integrity
- Open 2–3 data access files → identify permitted query methods (SP-only / JPA / raw SQL)
- Search for `@Insert` / `@Update` / `@Delete` / `executeUpdate` → document whether direct mutations are permitted
- Search for error/result code handling after data operations (`errorCode`, `getGeneratedKeys`, etc.)

### Permission Validation
- Search for `hasMenuRoleType` / `hasRole` / `@PreAuthorize` / `@Secured` → identify the authorization mechanism
- Search HTML templates for button-level permission guards → identify the frontend authorization pattern
- Map permission types to actions (SELECT/INSERT/UPDATE/DELETE/EXPORT/PRINT/UPLOAD or equivalent)

### User Context Handling
- Search for `SecurityUtils` / `SecurityContextHolder` / `@AuthenticationPrincipal` → identify how user identity is retrieved
- Check service layer → identify where `userId` / `userSeq` is injected into operations
- Verify that client-supplied user identifiers are never trusted for server-side operations

### Common Security Utilities
- Glob `**/SecurityUtils.java` / `**/CommonUtils.java` / `**/FileUtils.java` → document available utilities
- Check `pom.xml` or `build.gradle` → identify security libraries (Spring Security / Shiro / etc.)
- Identify the project's canonical exception class for business rule violations

### Input Validation
- Search for validation annotations (`@Valid`, `@Validated`, `@NotNull`, etc.) → document validation approach
- Check MyBatis mapper parameter binding → verify `#{...}` vs `${...}` usage (latter allows injection)
- Identify where validation occurs (Controller / Service / both)

### File Upload Security
- Search for file upload handlers → identify the utility class used
- Check the allowed extension configuration (`application.yml` / `properties` / constants)
- Verify path traversal prevention in download handlers

### Sensitive Data Handling
- Search for `@JsonIgnore` → list fields excluded from serialization
- Identify audit fields (`createdBy`, `lastUpdatedBy`, etc.) → confirm server-side assignment only
- Check for any fields that must not appear in API responses

### Error Response Policy
- Open exception handler classes → identify what is returned on error (message / code / stack trace)
- Verify that DB error details and stack traces are not exposed in responses

---

## Reference Example — Spring Boot + MyBatis (Stored Procedure)

The following is a complete reference implementation of `.claude/rules/security.md` for a Spring Boot + MyBatis SP project. Use as a quality benchmark when authoring a new rule.

### Data Access Integrity (CRITICAL)
- Inventory and quantity modification code must be performed exclusively through the Mapper's `@Select("EXEC dbo.SP_XXX ...")` stored procedure call. Direct SQL (`@Insert`/`@Update`) and ORM entity mutation are forbidden.
- The stored procedure returns the validation result via an `errorCode` OUT parameter — if `"E"`, throw `ApplicationException` immediately.
- Inventory adjustments spanning multiple tables must be processed atomically within a single stored procedure or a single `@Transactional` method.

### Permission Validation (required)
- Check `SecurityUtils.hasMenuRoleType(menuId, type)` on every Controller CUD endpoint.
- Thymeleaf row add/delete buttons: require a `th:if="${@securityUtils.hasMenuRoleType(param.menuId, 'INSERT')}"` permission guard.
- Grid edit permission is passed to the frontend via the `isGridEditUse` hidden field.

#### Permission ↔ Action / Button / Endpoint Mapping (authoritative)

| Permission | Mapped Action | Related Buttons / Endpoints |
|---|---|---|
| `SELECT` | Query | `#searchBtn`, `GET /list` |
| `INSERT` | Add row | Row add button, `POST` / `PUT` (includes new rows) |
| `UPDATE` | Edit row | Grid inline edit, `PUT` (includes modified rows) |
| `DELETE` | Delete row | Row delete button, `PUT` (includes `deletedRows`) |
| `EXPORT` | Excel export | `#exportBtn` |
| `PRINT` | Print / label | `#printBtn`, `/printList` endpoint |
| `UPLOAD` | File upload | `#uploadBtn`, `POST` (multipart) |

### User Context Handling
- Obtain user identity via `SecurityUtils.getPrincipal().getUserSeq()` — never trust client-supplied userId.
- `loginUserSeq` — obtain once in the public service method and pass to private helpers and DTOs.
- `createdBy` / `lastUpdatedBy` are set server-side automatically; ignore client-supplied values.

### Common Security Utilities (do not re-implement)
- `SecurityUtils` (`getPrincipal()`, `hasMenuRoleType(menuId, type)`) · `MessageUtils` · `CommonUtils` · `FileUtils` — always use these; do not re-implement.
- Exception class: use `ApplicationException` exclusively (throw when stored procedure `errorCode = "E"`).

### File Upload Security
- Use `FileUtils.saveFile(file, GlobalConstants.FileSubPath.TEMP)` — extension validation is performed inside `FileUtils`.
- Block path traversal (`..`) in download paths.

### Sensitive Data Handling
- `loginUserSeq` field must be annotated with `@JsonIgnore` (must not be exposed in responses).
- Audit fields (`createdBy`, `lastUpdatedBy`, etc.) are assigned server-side; do not accept from client.

### Error Response Policy
- Error messages must not include stack traces or DB details — expose `ApplicationException` message only.
- Use `errorCode` / `errorMsg` fields in DTO for SP-level validation results.

### Code Security Checklist
- [ ] Do not concatenate user input directly into query parameters (use MyBatis binding `#{...}`)
- [ ] File upload extension allowlist validation, path traversal blocked
- [ ] Obtain user context via `SecurityUtils.getPrincipal()` (do not trust client-provided userId)
- [ ] `createdBy` / `lastUpdatedBy` set server-side; ignore client-supplied values
- [ ] Verify XSS safety when using Thymeleaf `th:utext`
- [ ] Error messages must not include stack traces or DB details
- [ ] Controller CUD permission check + button `th:if` guard present

---

## Validation Checklist

After completing a generated `.claude/rules/security.md`, verify:

- [ ] All 9 required sections are present and non-empty
- [ ] Every section uses "must" / "forbidden" language (not "should" / "prefer")
- [ ] Conventions were extracted from the project's actual code (not assumed)
- [ ] User confirmed extracted conventions before finalization
- [ ] Permission ↔ Action mapping table is complete for the project's permission types
- [ ] The canonical exception/error class is identified and named explicitly
- [ ] File upload security policy is confirmed (allowed extensions, path traversal prevention)
- [ ] Code Security Checklist in the generated rule contains actionable binary items
