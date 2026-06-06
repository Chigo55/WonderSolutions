# Agents — Group Planning Document

## Overview

Four pipeline-stage agents that execute in sequence to produce a complete domain module.
Each agent receives the output of the prior stage as its context.

```
planner → templater → developer → ruler
  (1)         (2)         (3)        (4)
```

All agents share the same three operational modes: `create`, `modify`, `review`.

## Current Behavior

- Agents are invoked sequentially; no parallelism within the pipeline.
- Each agent reads the plan/template/code artifacts produced by the previous stage.
- The ruler agent is always the terminal stage and produces the validation report.
- Mode is passed down from the command; agents adapt their behavior accordingly.

## Inputs / Outputs

| Agent | Input | Output |
|-------|-------|--------|
| planner | Request document | Module plan (7-file decomposition, dependencies, order) |
| templater | Module plan | Updated `index.json`, registered/created templates |
| developer | Plan + templates | Implemented Java/HTML/JS files |
| ruler | All deliverables | Validation report, ADRs (`.claude/adr/`), rules (`.claude/rules/`) |

## Dependencies

- All agents read `.claude/templates/index.json` (enforced by hook for developer).
- Agents read project-specific rules from `.claude/rules/{layer}.md` if present.
- Developer is blocked from writing code without prior template exploration (enforce-template hook).

## Improvement Direction

- Support parallel execution for independent sub-tasks within the developer stage.
- Planner could detect similar existing modules and recommend reuse before creating new files.
- Templater could auto-detect template candidates from the existing codebase.
- Ruler could produce severity-ranked findings (CRITICAL / HIGH / MEDIUM) and auto-fix minor violations.
- Add inter-stage artifact handoff validation so each agent can reject a malformed upstream output.
