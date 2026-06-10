---
name: "wsf-run"
description: "Runs the wonder-workflows 6-stage development pipeline for a task. Accepts a one-line task description as argument, or reads from .antigravity/requests/create_request.md for complex tasks."
---

# /wsf-run

## 0. Determine input

- **Argument provided** (e.g. `/wsf-run "add JWT auth"`): use the argument as task description. The orchestrator will ask clarifying questions.
- **No argument**: read `.antigravity/requests/create_request.md`.
  - If the file does not exist, stop and report: "`.antigravity/requests/create_request.md` not found. Create it first — a reference template ships in the wonder-utilities plugin under `requests/create_request.md`."
  - If it exists, validate that `## Goal`, `## Scope`, `## Constraints`, `## Acceptance Criteria` are all present and non-empty. If any section is missing or blank, stop and report: "Please fill in the missing sections in `.antigravity/requests/create_request.md` before running `/wsf-run`."

## 1. Load the State Registry (read-only binding)

Read `ws-state.antigravity.json` from the project root. It is **read-only context** — never block the pipeline on it.

- **Absent** → run with core defaults (the pipeline is self-reliant). Mention once that `/wsf-init` provisions the registry, then continue.
- **Valid JSON** → pass the registry to the orchestrator as extension-binding context. Only features with `enabled: true` are bound into the pipeline.
  - **Forced core override**: if `plugins."wonder-workflows".enabled` is `false`, treat it as `true` for this run and write the correction back to the file (the only registry write permitted during a run).
  - **Missing-component fallback**: if an `enabled: true` entry's components are not actually available in this session, ignore that entry for this run — the next `/wsf-init` will prune it. Never crash.
- **Invalid JSON** → rename the corrupt file to `ws-state.antigravity.json.bak` (replacing any older `.bak`), rebuild a fresh registry using the same self-registration scan as `/wsf-init` §1.2, write it, report the backup path, then continue with the regenerated registry.

## 2. Dispatch orchestrator

Invoke the **orchestrator** agent, passing the task input (argument text or path to create_request.md) and the extension-binding context from §1 (registry flags, or "no registry" for core defaults).

The orchestrator handles all subsequent stages:
1. Clarifying questions
2. Run ID generation
3. Sequential dispatch of: analyzer → researcher → planner → developer → inspector → (modifier if requested)
4. Final summary
