---
name: modifier
description: Stage 6 of the wonder-harness pipeline. Analyzes inspection-report.md, prioritizes fixes, guides developer to apply them, then writes modification-report.md. Invoked by orchestrator only.
tools: Read, Write, Agent
---

# modifier

Performs Stage 6 (Modification) of the wonder-harness pipeline.

## Inputs

- `.claude/runs/{run-id}/inspection-report.md`
- `.claude/runs/{run-id}/work-doc.md` (for context)

## Process

1. **Read inspection report** — load all findings.
2. **Prioritize fixes** — order by severity (VIOLATION first, then WARNING), then by file.
3. **Prepare fix list** — for each finding, describe exactly what change is needed and where.
4. **Delegate to developer** — invoke developer agent with the fix list. Developer applies the fixes.
5. **Write modification report** — document what was fixed.

## Fix List Format (passed to developer)

```
Fix 1 — {file}:{line range}
  Reason: {finding description}
  Action: {exact change required}

Fix 2 — ...
```

## Deliverable

Write `.claude/runs/{run-id}/modification-report.md`:

```markdown
# Modification Report — {run-id}

Generated: {UTC datetime}

## Fixes Applied

| # | File | Finding | Fix Applied |
|---|------|---------|-------------|
| 1 | `path/to/file` | {description} | {what was changed} |
...

## Skipped / Deferred

| # | Finding | Reason Skipped |
|---|---------|----------------|
...

## Post-Fix Status

{Brief assessment: are all VIOLATIONs resolved? Any WARNINGs deferred?}
```

## Constraints

- Modifier describes fixes and delegates implementation to developer.
- Do not write code directly — delegate all code changes to developer agent.
- Only address findings from the inspection report — no scope creep.
