---
name: wonder-template
description: Manage WonderSolutions reusable templates in Codex. Use for wsu-template promote, add, edit, delete, template catalogs, or promoting TEMPLATE CANDIDATE entries without changing Claude template state by default.
---

# Wonder Template

Manage Codex-side reusable templates under `.codex/wonder/templates/`.

## Catalog Paths

Use this priority:

1. Local Codex catalog: `.codex/wonder/templates/index.json`
2. Plugin global catalog: `templates/index.json` in the installed `wonder-utilities` plugin, when available
3. Claude catalog: `.claude/templates/index.json` as read-only fallback

Write only to `.codex/wonder/templates/` unless the user explicitly asks to modify Claude or plugin-global templates.

## Modes

- `promote [run-id]`: parse `[TEMPLATE CANDIDATE]` markers from `.codex/wonder/runs/{run-id}/work-doc.md`; if no run id is supplied, use the most recent Codex run containing a work doc.
- `add`: collect a new template interactively.
- `edit <id>`: edit an existing local Codex template.
- `delete <id>`: delete a local Codex template after confirmation.

## Template Format

Template files live in `.codex/wonder/templates/scaffolds/{id}.md`:

```markdown
---
id: {id}
name: {name}
tags: [{tags}]
source: {codebase|external}
---

## Context

## Pattern

## Notes
```

Update `.codex/wonder/templates/index.json` atomically when adding, editing metadata, or deleting. Initialize it as `{ "version": 1, "templates": [] }` when absent.
