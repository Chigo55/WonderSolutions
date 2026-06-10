---
name: wonder-pipeline
description: Runs the wonder-workflows 6-stage development pipeline for a task. Accepts a one-line task description as argument, or reads from .codex/wonder/requests/create_request.md for complex tasks. Codex projection of /wsf-run; use when the user asks for wsf-run or $wonder-pipeline.
---

> Generated from `plugins/wonder-workflows/commands/wsf-run.md` by `npm run sync:codex` — do not edit by hand.

## Codex Execution Notes

- Runtime state root is `.codex/wonder/`. Treat `.claude/` as a read-only fallback; never write it unless the user explicitly asks.
- **Role provisioning (once per project):** copy this skill's bundled `agents/*.toml` into the project's `.codex/agents/` (keep existing files).
- Delegate stages with `spawn_agent` using those roles; collect results with `wait_agent`, then `close_agent`. `[agents] max_depth` defaults to 1, so perform any nested delegation (e.g. modifier → developer) from this thread.
- Where the instructions below say to invoke the **orchestrator** agent, assume that role yourself in this conversation (role reference: `agents/orchestrator.toml`) and spawn the other stage roles from here.
- Where `${CLAUDE_PLUGIN_ROOT}` appears, it means this plugin's install root.

# $wonder-pipeline

## 0. Determine input

- **Argument provided** (e.g. `$wonder-pipeline "add JWT auth"`): use the argument as task description. The orchestrator will ask clarifying questions.
- **No argument**: read `.codex/wonder/requests/create_request.md`.
  - If the file does not exist, stop and report: "`.codex/wonder/requests/create_request.md` not found. Create it first — a reference template ships in the wonder-utilities plugin under `requests/create_request.md`."
  - If it exists, validate that `## Goal`, `## Scope`, `## Constraints`, `## Acceptance Criteria` are all present and non-empty. If any section is missing or blank, stop and report: "Please fill in the missing sections in `.codex/wonder/requests/create_request.md` before running `$wonder-pipeline`."

## 1. Load the State Registry (read-only binding)

Read `ws-state.codex.json` from the project root. It is **read-only context** — never block the pipeline on it.

- **Absent** → run with core defaults (the pipeline is self-reliant). Mention once that `$wonder-init` provisions the registry, then continue.
- **Valid JSON** → pass the registry to the orchestrator as extension-binding context. Only features with `enabled: true` are bound into the pipeline.
  - **Forced core override**: if `plugins."wonder-workflows".enabled` is `false`, treat it as `true` for this run and write the correction back to the file (the only registry write permitted during a run).
  - **Missing-component fallback**: if an `enabled: true` entry's components are not actually available in this session, ignore that entry for this run — the next `$wonder-init` will prune it. Never crash.
- **Invalid JSON** → rename the corrupt file to `ws-state.codex.json.bak` (replacing any older `.bak`), rebuild a fresh registry using the same self-registration scan as `$wonder-init` §1.2, write it, report the backup path, then continue with the regenerated registry.

## 2. Dispatch orchestrator

Invoke the **orchestrator** agent, passing the task input (argument text or path to create_request.md) and the extension-binding context from §1 (registry flags, or "no registry" for core defaults).

The orchestrator handles all subsequent stages:
1. Clarifying questions
2. Run ID generation
3. Sequential dispatch of: analyzer → researcher → planner → developer → inspector → (modifier if requested)
4. Final summary
