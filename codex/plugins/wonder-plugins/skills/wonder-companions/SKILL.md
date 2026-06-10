---
name: wonder-companions
description: Explain how the Claude-only WonderSolutions companion bundle maps to Codex. Use when the user asks about wonder-plugins, companion plugins, optional dependencies, or Codex equivalents for superpowers, context7, claude-md-management, or code-simplifier.
---

# Wonder Companions

`wonder-plugins` is a Claude dependency aggregator. In Codex, do not try to install Claude companion plugins as Codex plugins.

## Codex Mapping

- For structured workflows, use `wonder-workflows` skills.
- For reusable templates and handoffs, use `wonder-utilities` skills.
- For current library documentation, use official docs or configured MCP servers available in the Codex environment.
- For CLAUDE.md review, inspect repository docs directly and preserve Claude behavior.
- For simplification or cleanup, use normal Codex refactoring with project tests.

## Safety Rule

Never add hard dependencies from `wonder-workflows` or `wonder-utilities` to companion tools. Keep optional integrations optional so Claude and Codex can use the repository independently.
