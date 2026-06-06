# Skills — Group Planning Document

## Overview

Four reusable SKILL.md skills that extend Claude Code's behavior for specific interaction patterns.
Skills are invoked explicitly by the user via `/skill-name` and loaded on demand.

| Skill | Purpose | Interaction Type |
|-------|---------|-----------------|
| caveman | ~75% token compression | Communication style |
| grill-me | Relentless design interviewing | Planning discipline |
| handoff | Conversation compaction | Context management |
| write-a-skill | Skill authoring guide | Meta / tooling |

## Current Behavior

- All skills are SKILL.md format with progressive disclosure.
- Skills load into the active session and modify agent behavior for the duration.
- `grill-me` enforces one-question-at-a-time discipline with recommended answers.
- `handoff` produces a structured document that can bootstrap a new session.
- `caveman` instructs the model to strip filler words and use fragments.
- `write-a-skill` provides the template and rules for authoring new skills.

## Inputs / Outputs

| Skill | Input | Output |
|-------|-------|--------|
| caveman | User invocation | Modified response style (no new files) |
| grill-me | Plan/design as args | Q&A session → shared understanding |
| handoff | Current conversation | `handoff.md` document |
| write-a-skill | Skill description as args | New `skills/<name>/SKILL.md` file |

## Dependencies

- Skills are self-contained; no cross-skill dependencies.
- `grill-me` and `handoff` depend on conversation context.
- `write-a-skill` writes to the skills directory of the active plugin.

## Improvement Direction

- `grill-me` could save the resolved Q&A as a planning document automatically (currently only oral understanding).
- `handoff` could include a code snapshot (current file states) alongside the conversation summary.
- `caveman` could have configurable compression levels (50% / 75% / 90%).
- Add a `review-skill` skill to evaluate existing skills against quality criteria.
