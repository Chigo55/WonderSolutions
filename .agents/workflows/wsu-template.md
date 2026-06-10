---
name: "wsu-template"
description: "Template catalog management. Promote research candidates, add, edit, or delete templates."
---

# /wsu-template

## Parse mode

Read the argument:
- `promote [run-id]`: promote candidate mode. If no run-id, use the most recent run.
- `add`: manual add mode.
- `edit <id>`: edit an existing template by id.
- `delete <id>`: delete a template by id.
- No argument or unrecognized: display usage and stop.

## Promote mode

1. Locate the target `work-doc.md`:
   - If run-id given: `.antigravity/runs/{run-id}/work-doc.md`
   - Otherwise: list all directories under `.antigravity/runs/`, pick the most recently modified one that contains a `work-doc.md`
2. Invoke **templater** in **template-promote mode** with the full path to that `work-doc.md`.
3. Templater parses all `[TEMPLATE CANDIDATE]` entries, presents a numbered list, asks the user to select, drafts `{id}.md` files for each selection, shows them for review, and on approval writes them and updates the resolved catalog's `index.json`.

## Add mode

1. Invoke **templater** in **template-add mode**.
2. Templater collects name, description, tags, and pattern content from the user interactively.
3. Templater drafts `{id}.md`, presents for review, and on approval writes `{target_dir}/scaffolds/{id}.md` and appends the entry to `{target_dir}/index.json` (local catalog by default).

## Edit mode

1. Invoke **templater** in **template-edit mode** with `{id}`.
2. Templater searches local `.antigravity/templates/scaffolds/{id}.md` first, then global `${CLAUDE_PLUGIN_ROOT}/templates/scaffolds/{id}.md`. If not found in either, reports "Template '{id}' not found" and stops.
3. Templater reads the current `scaffolds/{id}.md`, presents it, asks what to change, applies changes, and on approval writes the updated file and updates `index.json` if metadata changed.

## Delete mode

1. Invoke **templater** in **template-delete mode** with `{id}`.
2. Templater locates the template scope, confirms with the user: "Delete template '{id}' ({name})? This cannot be undone."
3. On confirmation, templater removes `{scope_dir}/templates/scaffolds/{id}.md` and removes the entry from `{scope_dir}/templates/index.json`.
