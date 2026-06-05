---
description: Generates project-specific rules in .claude/rules/ by exploring the project codebase. Run once per project before using wh-create.
argument-hint: "[--backend] [--frontend] [--security] [--templates] — omit all flags to initialize all layers"
---

# /wh-init

Generates project-specific rule files at `.claude/rules/` by having **ruler (generate mode)** explore the project's existing code and extract its conventions.

Run this once when starting to use wonder-harness on a new project. Each generated rule replaces the stack-agnostic meta-rule with a rule tailored to the project's actual conventions.

## 1. Parse flags

Read the arguments for `--backend`, `--frontend`, `--security`, `--templates`.

- If **no flags** are provided, treat all four layers as selected.
- Process selected layers **sequentially** (one at a time).

## 2. For each selected layer

### 2a. Existence check

Check whether `.claude/rules/{layer}.md` already exists.

- **Exists** → ask the user:
  > "`.claude/rules/{layer}.md` already exists. Overwrite or skip? (overwrite / skip)"
  - `skip` → proceed to the next layer.
  - `overwrite` → continue to step 2b.
- **Does not exist** → continue to step 2b.

### 2b. Invoke ruler (generate mode)

Invoke the **ruler** agent in **generate mode** with the selected layer:

1. Ruler loads `${CLAUDE_PLUGIN_ROOT}/rules/{layer}.md` (meta-rule).
2. Ruler explores the project's existing source files following the meta-rule's Exploration Guide.
3. Ruler drafts the generated rule from the extracted conventions.
4. Ruler presents the extracted conventions to the user for confirmation (overwrite/skip already decided in step 2a).
5. After confirmation, ruler writes the rule to `.claude/rules/{layer}.md`.

## 3. Result

After all selected layers are processed, report:

- Which layers were **generated** (path written)
- Which layers were **skipped** (already existed, user chose skip)

Remind the user:
> "Project rules are ready. Run `/wh-create` to start building a new domain."
