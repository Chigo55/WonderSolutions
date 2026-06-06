# workflow rule — Planning Document

## Overview

Meta-rule document covering the development process, domain naming formula, and template exploration enforcement.
Referenced directly by the developer agent; not generated into a project-specific file.

## Current Behavior

**Sections covered:**
- Rule Application Priority: project rules > meta-rules; developer must check `.claude/rules/` first
- Domain Naming Formula: `{module}` (2-char lowercase) + camelCase feature = `{module}{Feature}`
  - Example: `wo` + `WorkShift` = `woWorkShift` → class `WoWorkShift` → URL `/wo/workShift`
- Template Exploration Before Implementation: templater must complete before developer writes
- DB Label Registration: SP naming and registration conventions in the DB catalog
- Review Checklist: naming consistency, rule priority adherence, template coverage

## Inputs / Outputs

| | Detail |
|-|--------|
| **Input** | Developer and ruler agents read this directly |
| **Output** | (Reference only — no generated project file) |

## Dependencies

- Developer agent reads this for naming and process rules.
- Ruler agent validates naming consistency against this convention.
- `templates.md` complements this rule (token convention for template files).

## Improvement Direction

- Add a naming collision detection guide (what to do when 2-char module code conflicts).
- Add troubleshooting section: common naming mistakes and how to fix them.
- Add DB label registration step to the standard workflow checklist.
- Clarify the rule application priority with a decision flowchart.
- Consider generating a project-specific `workflow.md` (currently reference-only) to capture project-specific process deviations.
