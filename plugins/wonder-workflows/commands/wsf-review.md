---
description: Re-runs Stage 5 (inspection) on specified files outside a full /wsf-run pipeline. Use to review specific files for quality, security, and project rule compliance.
argument-hint: "Path(s) to review — e.g. src/main/java/com/example/FooController.java"
---

# /wsf-review

Standalone inspection of one or more files using the inspector agent.

## 1. Determine target files

- If an argument is provided: use the listed file paths.
- If no argument: ask the user which file(s) to review.
- Confirm the list with the user before proceeding.

## 2. Load project rules

Read all `.claude/rules/*.md` files (e.g. security.md, active structural layers) if they exist. If none exist, warn: "No project rules found. Run /wsf-init first for best results. Proceeding with general guidelines."

## 3. Invoke inspector

Dispatch the **inspector** agent with:
- The target file paths
- The project rules (from `.claude/rules/`)
- No §Planning context (skip functional correctness dimension — only quality, security, and project rule compliance apply)

## 4. Write report

Inspector writes the report to `.claude/reports/wsf-review-{YYYYMMDD-HHMMSS}.md` (not under `runs/` since this is a standalone review).

## 5. Present results

Show the inspection summary to the user. If violations are found, suggest running `/wsf-run` for a full pipeline fix cycle.
