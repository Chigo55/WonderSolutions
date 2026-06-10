---
name: wonder-pipeline
description: Run the WonderSolutions 6-stage development pipeline in Codex. Use when the user asks for wsf-run, a structured implementation pipeline, or analysis-research-planning-implementation-inspection-modification workflow execution without changing Claude runtime state.
---

# Wonder Pipeline

Run the task through six ordered stages in the current Codex conversation:

1. Analysis
2. Research
3. Planning
4. Implementation
5. Inspection
6. Modification, only when inspection finds issues or the user requests fixes

## State Paths

Write Codex runtime artifacts under `.codex/wonder/` by default:

- `.codex/wonder/runs/{run-id}/work-doc.md`
- `.codex/wonder/runs/{run-id}/inspection-report.md`
- `.codex/wonder/runs/{run-id}/modification-report.md`

Do not write to `.claude/`, `.claude-plugin/`, Claude `commands/`, Claude `agents/`, or Claude `skills/` unless the user explicitly asks to update Claude assets. Read `.claude/rules/` only as a compatibility fallback when `.codex/wonder/rules/` is absent.

## Input Handling

If the user gives a task directly, clarify scope, constraints, and acceptance criteria before Stage 1. If no task is provided, read `.codex/wonder/requests/create_request.md`; if it is absent, fall back to `.claude/requests/create_request.md` read-only and ask before writing any Codex copy.

Create a run id as `YYYYMMDD-{slug}` using 4 or 5 lowercase ASCII words from the task.

## Stage Deliverables

Maintain `work-doc.md` with these sections:

```markdown
# Work Document - {run-id}

## Analysis
## Research
## Planning
```

Stage 1 records current state, affected scope, requirements, assumptions, and acceptance criteria.

Stage 2 searches local code patterns first, then current external docs only when needed. Check `.codex/wonder/templates/index.json` before `.claude/templates/index.json` as a read-only fallback. Mark reusable patterns sparingly with `[TEMPLATE CANDIDATE] tags: ...`.

Stage 3 creates ordered, testable implementation steps with exact files to create or modify and known risks.

Stage 4 implements only the approved plan, following repository conventions and project rules.

Stage 5 reviews quality, functional correctness, security, and rule compliance. Write findings to `inspection-report.md` with `PASS`, `WARNING`, or `VIOLATION`.

Stage 6 fixes only inspection findings, then writes `modification-report.md`.

## Completion

Before finishing, run the relevant project validation commands. Summarize changed files, reports, inspection counts, and any remaining risks.
