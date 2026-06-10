---
name: wonder-write-a-skill
description: Draft or revise Codex skills using WonderSolutions conventions. Use when the user wants to create, update, port, or review a Codex skill with concise frontmatter and progressive disclosure.
---

# Wonder Write A Skill

Create or revise Codex skills with a minimal, valid structure.

## Required Structure

Each skill folder must contain `SKILL.md` with YAML frontmatter:

```yaml
---
name: skill-name
description: What the skill does and exactly when Codex should use it.
---
```

Use lowercase hyphenated names. Keep frontmatter to `name` and `description` unless the target platform explicitly supports more fields.

## Writing Rules

- Put trigger conditions in `description`.
- Keep the body procedural and concise.
- Add `references/` only for details that should load on demand.
- Add `scripts/` only for deterministic, repeated operations.
- Add `assets/` only for files used in generated output.
- Avoid README, changelog, and extra explanation files inside the skill.

## Validation

Run the available skill validator when present. If no validator is available, check frontmatter syntax, folder name consistency, and that all referenced resources exist.
