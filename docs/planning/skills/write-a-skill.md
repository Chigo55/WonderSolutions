# write-a-skill skill — Planning Document

## Overview

Meta skill that guides the authoring of new SKILL.md skills.
Provides the template structure, progressive disclosure patterns, and quality criteria for skill files.

## Current Behavior

- Invoked via `/write-a-skill <description>`.
- Provides the canonical SKILL.md structure: frontmatter, trigger conditions, step-by-step instructions, examples.
- Explains progressive disclosure (show minimal content first, expand on demand).
- Enforces utility script conventions (if the skill includes scripts).
- Guides placement: `skills/<name>/SKILL.md` under the active plugin.
- May scaffold the SKILL.md file after gathering sufficient detail.

## Inputs / Outputs

| | Detail |
|-|--------|
| **Input** | Skill description or intent (as args) |
| **Output** | New `skills/<name>/SKILL.md` file |

## Dependencies

- Plugin directory must be writable.
- `skill-reviewer` agent (if available) can validate the produced skill.

## Improvement Direction

- Auto-validate the created SKILL.md against quality criteria (trigger clarity, step completeness, example coverage).
- Integrate with `plugin-dev:skill-reviewer` agent for post-creation review.
- Provide a SKILL.md linter that checks frontmatter schema, required sections, and trigger phrase specificity.
- Support skill templates for common patterns (pipeline skill, review skill, communication style skill).
