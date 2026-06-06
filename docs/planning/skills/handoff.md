# handoff skill — Planning Document

## Overview

Context compaction skill that produces a structured handoff document from the current conversation, suitable for bootstrapping a new session with full context.

## Current Behavior

- Invoked via `/handoff`.
- Summarizes the current conversation into a structured markdown document.
- Includes: task description, decisions made, work completed, work remaining, relevant file paths, suggested next steps.
- Optionally lists recommended skills for the next session.
- Writes output to a `handoff.md` file (or prints to conversation if no write permission).

## Inputs / Outputs

| | Detail |
|-|--------|
| **Input** | Current conversation context (no arguments required) |
| **Output** | `handoff.md` with structured session summary |

## Dependencies

- Conversation context must be available.
- Write permission to project root or `docs/` directory.

## Improvement Direction

- Include a snapshot of key file states (current content of recently modified files) alongside the conversation summary.
- Auto-detect the most relevant files from conversation mentions and include their paths in the handoff.
- Add a `--resume` command that reads an existing `handoff.md` and restores the session context automatically.
- Version the handoff file (e.g., `handoff-{YYYYMMDD-HHMMSS}.md`) to preserve history.
