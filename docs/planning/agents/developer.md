# developer — Planning Document

## Overview

Stage 3 of the pipeline. Implements the actual code (Java, Thymeleaf HTML, ES6 JS) following the plan and templates from earlier stages, constrained by the project-specific rules.

## Current Behavior

- Reads `.claude/templates/index.json` to confirm templates were explored (required by enforce-template hook).
- Reads `.claude/rules/{layer}.md` if present; falls back to meta-rules.
- Implements the 7-file set in the order specified by the planner.
- **Backend rules enforced:**
  - `Controller → Service → Mapper` one-way dependency only.
  - SP-only data access (no `@Insert`, `@Update`, `@Delete` annotations).
  - `@Transactional` required on all CUD service methods.
  - Package root: `io.boot.wonder.web`.
- **Frontend rules enforced:**
  - Thymeleaf + Kendo web components (no JSP, no jQuery).
  - ES6 modules; no global state.
  - Required form fields per `frontend.md` checklist.
  - Permission guard on all data mutation operations.
- Validates at system boundaries (user input in Controllers and Forms).
- In `modify` mode, edits only the files listed as changed by the planner.
- In `review` mode, reads files and reports violations without writing.

## Inputs / Outputs

| | Detail |
|-|--------|
| **Input** | Module plan + template instructions from templater + project rules |
| **Output** | Implemented Java/HTML/JS files written to project source tree |

## Dependencies

- `enforce-template.js` hook blocks writes if templater stage was skipped.
- Project rules (`.claude/rules/`) override meta-rules; developer must respect both.
- SP definitions must already exist in the database (developer does not create SPs).

## Improvement Direction

- Generate unit test stubs alongside each implemented file.
- Validate that all referenced SPs exist in the DB schema before writing mapper calls.
- In modify mode, produce a minimal diff rather than rewriting the whole file.
- Post-write lint check (via Bash tool) to catch compilation errors immediately.
