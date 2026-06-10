---
name: wonder-hand-off
description: Create a concise handoff document for another Codex or Claude agent. Use when the user asks for a handoff, session summary, continuation brief, or transfer note.
---

Write a handoff document that lets a fresh agent continue the work.

## Save Path

Use this path order:

1. User-specified path
2. `CLAUDE.md` handoff path if one is documented
3. `.codex/wonder/handoffs/handoff-{YYYYMMDD-HHMMSS}.md`

Do not write into `.claude/` unless the user explicitly asks.

## Contents

Include:

- Current objective
- Repository and branch state relevant to the work
- Files changed or important files read
- Decisions made
- Commands run and results
- Remaining tasks and validation gaps
- Suggested skills for the next agent

Redact secrets, tokens, private keys, credentials, and personal data.
