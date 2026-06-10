---
name: wonder-template
description: Template catalog management. Promote research candidates, add, edit, or delete templates. Codex projection of /wsu-template; use when the user asks for wsu-template or $wonder-template.
---

> Generated from `plugins/wonder-utilities/commands/wsu-template.md` by `npm run sync:codex` — do not edit by hand.

## Codex Execution Notes

- Runtime state root is `.codex/wonder/`. Treat `.claude/` as a read-only fallback; never write it unless the user explicitly asks.
- **Role provisioning (once per project):** copy this skill's bundled `agents/*.toml` into the project's `.codex/agents/` (keep existing files); copy bundled `references/meta-rules/*.md` into `.codex/wonder/meta-rules/`; seed `.codex/wonder/templates/` from bundled `assets/templates/` when absent.
- Delegate stages with `spawn_agent` using those roles; collect results with `wait_agent`, then `close_agent`. `[agents] max_depth` defaults to 1, so perform any nested delegation (e.g. modifier → developer) from this thread.
- Where `${CLAUDE_PLUGIN_ROOT}` appears, it means this plugin's install root.

# $wonder-template

## Parse mode

Read the argument:
- `promote [run-id]`: promote candidate mode. If no run-id, use the most recent run.
- `add`: manual add mode.
- `edit <id>`: edit an existing template by id.
- `delete <id>`: delete a template by id.
- No argument or unrecognized: display usage and stop.

## Promote mode

1. Locate the target `work-doc.md`:
   - If run-id given: `.codex/wonder/runs/{run-id}/work-doc.md`
   - Otherwise: list all directories under `.codex/wonder/runs/`, pick the most recently modified one that contains a `work-doc.md`
2. Invoke **templater** in **template-promote mode** with the full path to that `work-doc.md`.
3. Templater parses all `[TEMPLATE CANDIDATE]` entries, presents a numbered list, asks the user to select, drafts `{id}.md` files for each selection, shows them for review, and on approval writes them and updates the resolved catalog's `index.json`.

## Add mode

1. Invoke **templater** in **template-add mode**.
2. Templater collects name, description, tags, and pattern content from the user interactively.
3. Templater drafts `{id}.md`, presents for review, and on approval writes `{target_dir}/scaffolds/{id}.md` and appends the entry to `{target_dir}/index.json` (local catalog by default).

## Edit mode

1. Invoke **templater** in **template-edit mode** with `{id}`.
2. Templater searches local `.codex/wonder/templates/scaffolds/{id}.md` first, then global `.codex/wonder/templates/scaffolds/{id}.md`. If not found in either, reports "Template '{id}' not found" and stops.
3. Templater reads the current `scaffolds/{id}.md`, presents it, asks what to change, applies changes, and on approval writes the updated file and updates `index.json` if metadata changed.

## Delete mode

1. Invoke **templater** in **template-delete mode** with `{id}`.
2. Templater locates the template scope, confirms with the user: "Delete template '{id}' ({name})? This cannot be undone."
3. On confirmation, templater removes `{scope_dir}/templates/scaffolds/{id}.md` and removes the entry from `{scope_dir}/templates/index.json`.
