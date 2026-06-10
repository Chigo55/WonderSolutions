---
name: wonder-review
description: Run a standalone WonderSolutions code inspection in Codex. Use when the user asks for wsf-review, file review, rule compliance review, security review, or inspection outside a full pipeline.
---

# Wonder Review

Review one or more files for quality, security, functional correctness when context is available, and project rule compliance.

## Inputs

If file paths are provided, review those files. If not, ask for the target paths. Confirm the review set before performing large reviews.

## Rule Loading

Load rules in this order:

1. `.codex/wonder/rules/*.md`
2. `.claude/rules/*.md` as read-only fallback
3. General repository conventions if no project rules exist

Do not write to `.claude/`.

## Inspection Dimensions

- Quality: readability, naming, focused functions, excessive nesting, duplicated logic, hardcoded configuration.
- Functional correctness: whether implementation satisfies the stated task, plan, tests, or nearby behavior.
- Security: input validation, injection risks, authorization checks, path handling, sensitive data exposure, unsafe command execution.
- Rule compliance: naming, layering, state access, dependency direction, and local conventions.

## Report

Write `.codex/wonder/reports/wonder-review-{YYYYMMDD-HHMMSS}.md`:

```markdown
# Wonder Review Report

Generated: {UTC datetime}

## Summary

PASS: N | VIOLATION: N | WARNING: N

## Findings

| # | File | Dimension | Severity | Detail |
|---|------|-----------|----------|--------|

## Recommendation
```

Lead the user-facing response with findings, ordered by severity. If no issues are found, say so and list any test gaps.
