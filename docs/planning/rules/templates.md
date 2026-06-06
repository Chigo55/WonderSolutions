# templates rule — Planning Document

## Overview

Meta-rule document that defines the authoritative token convention for template files and the `index.json` catalog schema.
Used by the templater agent as the primary reference; not generated into a project-specific file.

## Current Behavior

**Sections covered:**
- Token Conventions (authoritative):
  - `{module}` — 2-char lowercase module code
  - `{domainName}` — camelCase domain name
  - `Xxx` — PascalCase class placeholder
  - `xxx` — camelCase variable placeholder
  - `{gridId}` — HTML grid element ID
  - `{Entity}` — Entity PascalCase name
- Substitution Table Comments: each template must include a comment block listing all tokens and their expected values
- Section-Divider Comments: standard comment markers for template sections (header, body, footer)
- Layer-Specific Template Rules: Java templates vs. HTML templates vs. JS templates have different token scopes
- Catalog Index Schema: `index.json` structure (id, pathPatterns, description, path, metadata)

## Inputs / Outputs

| | Detail |
|-|--------|
| **Input** | Templater agent reads this for token convention |
| **Output** | (Reference only — no generated project file) |

## Dependencies

- Templater agent is the primary consumer.
- Developer agent uses token convention for substitution.
- `index.schema.json` (JSON Schema draft-07) enforces catalog structure at runtime.

## Improvement Direction

- Add template versioning: `"version"` field in each `index.json` entry so stale templates can be flagged.
- Define a standard token validation step: scan all template files for unresolved `{token}` placeholders before write.
- Add layer-specific token scope table (which tokens apply to which file types).
- Document how to handle templates with optional sections (conditional token substitution).
- Add a template migration guide for when token names change across plugin versions.
