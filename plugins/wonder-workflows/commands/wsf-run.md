---
description: Runs the wonder-workflows 6-stage development pipeline for a task. Accepts a one-line task description as argument, or reads from .claude/requests/create_request.md for complex tasks.
argument-hint: '"Brief task description" — or omit to use create_request.md'
---

# /wsf-run

## 0. Determine input

- **Argument provided** (e.g. `/wsf-run "add JWT auth"`): use the argument as task description. The orchestrator will ask clarifying questions.
- **No argument**: read `.claude/requests/create_request.md`. Validate that `## Goal`, `## Scope`, `## Constraints`, `## Acceptance Criteria` are all present and non-empty. If any section is missing or blank, stop and report: "Please fill in the missing sections in `.claude/requests/create_request.md` before running `/wsf-run`."

## 1. Initialize pipeline state

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/write-state.js" "<cwd>" "current.command" "wsf-run"
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/write-state.js" "<cwd>" "current.run-id"  null
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/write-state.js" "<cwd>" "current.stage"   null
```

## 2. Dispatch orchestrator

Invoke the **orchestrator** agent, passing the task input (argument text or path to create_request.md).

The orchestrator handles all subsequent stages:
1. Clarifying questions
2. Run ID generation and state setup
3. Sequential dispatch of: analyzer → researcher → planner → developer → inspector → (modifier if requested)
4. Final summary

## 3. Reset state on completion

After the orchestrator signals completion or the user closes the task, reset:

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/write-state.js" "<cwd>" "current.command" null
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/write-state.js" "<cwd>" "current.run-id"  null
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/write-state.js" "<cwd>" "current.stage"   null
```
