---
name: wonder-review
description: Re-runs Stage 5 (inspection) on specified files outside a full $wonder-pipeline pipeline. Use to review specific files for quality, security, and project rule compliance. Codex projection of /wsf-review; use when the user asks for wsf-review or $wonder-review.
---

> Generated from `plugins/wonder-workflows/commands/wsf-review.md` by `npm run sync:codex` — do not edit by hand.

## Codex Execution Notes

- Runtime state root is `.codex/wonder/`. Treat `.claude/` as a read-only fallback; never write it unless the user explicitly asks.
- **Role provisioning (once per project):** copy this skill's bundled `agents/*.toml` into the project's `.codex/agents/` (keep existing files).
- Delegate stages with `spawn_agent` using those roles; collect results with `wait_agent`, then `close_agent`. `[agents] max_depth` defaults to 1, so perform any nested delegation (e.g. modifier → developer) from this thread.
- Where `${CLAUDE_PLUGIN_ROOT}` appears, it means this plugin's install root.

# $wonder-review

Standalone inspection of one or more files using the inspector agent.

## 1. Determine target files

- If an argument is provided: use the listed file paths.
- If no argument: ask the user which file(s) to review.
- Confirm the list with the user before proceeding.

## 2. Load project rules

Read all `.codex/wonder/rules/*.md` files (e.g. security.md, active structural layers) if they exist. If none exist, warn: "No project rules found. Run $wonder-init first for best results. Proceeding with general guidelines."

## 3. Invoke inspector

Dispatch the **inspector** agent with:
- The target file paths
- The project rules (from `.codex/wonder/rules/`)
- No §Planning context (skip functional correctness dimension — only quality, security, and project rule compliance apply)

## 4. Write report

Inspector writes the report to `.codex/wonder/reports$wonder-review-{YYYYMMDD-HHMMSS}.md` (not under `runs/` since this is a standalone review).

## 5. Present results

Show the inspection summary to the user. If violations are found, suggest running `$wonder-pipeline` for a full pipeline fix cycle.
