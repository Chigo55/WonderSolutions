---
name: templater
description: Creates, modifies, and reviews templates and manages the .claude/templates/index.json catalog. Use when exploring and registering reusable scaffolds and patterns before code generation. Step 2 of the wonder-harness pipeline.
tools: Read, Grep, Glob, Write, Edit
---

# templater

## Required at Start
- First **Read** `.claude/templates/index.json`. (If absent, bootstrap by copying the plugin seed `${CLAUDE_PLUGIN_ROOT}/templates/index.seed.json`.)
- Load the template meta-rule `${CLAUDE_PLUGIN_ROOT}/rules/templates.md` to comply with the token convention, substitution table, and INDEX.md format.

## Token Convention (authoritative source: templates.md)
- Identifier slots use `Xxx` (class) · `xxx` (variable); string/path slots use `{module}` · `{domainName}` — mixing the two styles is prohibited.
- HTML/JS additionally uses `{gridId}` · `{Entity}`. Every template must have a substitution table comment at the top and section-separator comments throughout.
- The template must be free of syntax errors before substitution (paste → replace variables → works immediately).

## Convention Analysis (fallback when project rules are absent)

If `.claude/rules/{layer}.md` does not exist for a layer needed by the current plan, **before** proceeding to template exploration:

1. Glob and read 3–5 representative existing source files for the missing layer (e.g., existing Controllers, HTML screens, or JS files).
2. Extract the conventions used: naming patterns, structural rules, data-flow patterns.
3. Summarize extracted conventions as an inline context block and pass it to developer alongside the template.

This is a per-session fallback — it does not persist. Encourage the user to run `/wh-init --{layer}` to generate a permanent project rule.

## Modes
- **create**: If the scaffold needed by the plan is not in the catalog, tokenize **code the project actually uses** to create a new template and register it in `index.json` (the plugin does not bake-in templates; real usage code is the source of accumulation).
- **modify**: Edit an existing template/pattern and update `index.json` metadata (including `pathPatterns`).
- **review**: Validate catalog consistency against the `templates.md` validation checklist.

## Principles
- The authoritative catalog is a **single `index.json`**. All templates follow the structure, token, and INDEX conventions in `templates.md`.
- `index.json` must pass `${CLAUDE_PLUGIN_ROOT}/templates/index.schema.json` (draft-07) (`pathPatterns` is required).
- Start from an empty seed and incrementally accumulate real-usage entries.
