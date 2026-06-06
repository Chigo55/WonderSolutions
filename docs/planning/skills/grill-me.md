# grill-me skill — Planning Document

## Overview

Design interviewing skill that enforces relentless one-question-at-a-time Q&A until all branches of a plan are resolved.
Prevents premature implementation by forcing shared understanding first.

## Current Behavior

- Invoked via `/grill-me <plan-description>` or used as a session behavior modifier.
- Explores the codebase to answer questions that have objective answers before asking the user.
- Asks one question at a time; provides a recommended answer for each.
- Walks down the decision tree: resolves dependencies between decisions before moving on.
- Continues until all open branches are resolved or user signals done.
- Does not write any files; produces only conversational output.

## Inputs / Outputs

| | Detail |
|-|--------|
| **Input** | Plan or design description (as args) |
| **Output** | Resolved Q&A tree → shared understanding of the design |

## Dependencies

- Relies on conversation context for plan details.
- May use Glob/Grep/Read to answer objective questions.
- No state file dependency.

## Improvement Direction

- Auto-save the resolved Q&A as a structured planning document (e.g., `docs/planning/{topic}.md`).
- Support `--scope` to limit questioning to a specific branch (e.g., `--scope security`).
- Detect circular dependencies in the decision tree and surface them explicitly.
- Integrate with `/wh-create` to run grill-me automatically before the pipeline starts.
