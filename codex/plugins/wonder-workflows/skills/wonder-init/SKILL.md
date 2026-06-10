---
name: wonder-init
description: Initialize WonderSolutions project rules for Codex. Use when the user asks for wsf-init, project rule initialization, ADR extraction, or generating Codex-side rules without modifying Claude .claude state.
---

# Wonder Init

Initialize Codex-side WonderSolutions state for a project. Use `.codex/wonder/` as the default output root.

## Outputs

- `.codex/wonder/adr/{layer}.md`
- `.codex/wonder/rules/{layer}.md`
- `.codex/wonder/reports/wonder-init-{layer}-{YYYYMMDD-HHMMSS}.html`

Do not overwrite `.claude/adr/`, `.claude/rules/`, or `.claude/reports/`. Existing Claude files may be read as legacy evidence, but Claude state is read-only unless the user explicitly opts in.

## Process

1. Parse `--layers layer1,layer2` from the request. If no layers are supplied, inspect the repository and propose likely layers, defaulting to `security` plus the main source layer.
2. For each layer, inspect representative files and infer 3 to 7 architectural decisions. Ignore one-off patterns unless they are security critical.
3. Present the inferred ADR summary to the user before writing if the change is large or ambiguous.
4. Write the ADR with context, decision, rationale, and consequences.
5. Generate the matching rule file from code evidence and ADR consequences. Prefer hard constraints using `must` and `forbidden` for security and architectural boundaries.
6. Write a self-contained HTML report with inline CSS only.

## Rule File Sections

For structural layers, include:

- Layer Definition
- Entry Points and I/O Contract
- Core Logic and Side Effects
- State and Persistence
- Review Checklist

For security, include:

- Trust Boundaries and Input Validation
- Execution Context and Resource Control
- Sensitive Data Handling
- Error and Log Safety
- Code Security Checklist

## Overwrite Policy

If a Codex ADR or rule already exists for the layer, ask whether to overwrite or skip. Never use this overwrite prompt for Claude files.
