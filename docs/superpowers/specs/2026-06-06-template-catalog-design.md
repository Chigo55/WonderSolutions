# Template Catalog — Design Spec

**Date:** 2026-06-06
**Status:** Approved
**Scope:** Add a reusable template catalog to the wonder-harness pipeline; researcher discovers and surfaces templates, `/wh-template` command manages the catalog.

---

## 1. Problem Statement

The wonder-harness Research stage (Stage 2) collects codebase patterns and external references into `work-doc.md §Research`, but these findings are discarded after each run. Recurring patterns and precedents are re-discovered on every task, with no mechanism to accumulate them as reusable assets. This leads to inconsistent convention adherence across runs.

---

## 2. Goals

1. **Accumulate** — valuable patterns found during research become long-lived templates in a project-level catalog.
2. **Surface** — researcher injects relevant existing templates into §Research so developer can use them immediately.
3. **Curate** — researcher marks candidates; a human decides what enters the catalog via `/wh-template promote`.
4. **Minimal footprint** — no new agents; ruler handles `/wh-template`. No changes to stages 1, 3–6 or the hook system.

---

## 3. Template Storage Structure

```
templates/
├── index.json               ← catalog index (lightweight; content lives in scaffolds/)
└── scaffolds/
    └── {id}.md              ← template file (frontmatter + snippet + description)
```

### 3.1 index.json Schema

Replaces the current empty `index.seed.json`.

```json
{
  "version": 1,
  "templates": [
    {
      "id": "repo-pattern-jpa",
      "name": "JPA Repository Pattern",
      "tags": ["java", "jpa", "repository"],
      "description": "Standard repository interface with custom query methods",
      "source": "codebase",
      "addedFrom": "runs/2026-06-06-001"
    }
  ]
}
```

**Fields:**
- `id` — kebab-case slug, unique across the catalog
- `tags` — used by researcher for keyword matching
- `source` — `"codebase"` (found in existing project code) or `"external"` (library/framework docs)
- `addedFrom` — run ID where the pattern was first discovered (traceability)

### 3.2 Template File Format (`{id}.md`)

```markdown
---
id: repo-pattern-jpa
name: JPA Repository Pattern
tags: [java, jpa, repository]
source: codebase
---

## Context
One or two sentences on when to use this pattern.

## Pattern
\`\`\`java
// Core structure only (≤ 30 lines); use {{PlaceholderName}} for variable parts
public interface {{EntityName}}Repository extends JpaRepository<{{EntityName}}, Long> {
    Optional<{{EntityName}}> findBy{{Field}}(String value);
}
\`\`\`

## Notes
- Edge cases, caveats, or known variations.
```

---

## 4. Researcher Changes (Stage 2)

Two steps are added to the researcher's existing process.

### Step 0 — Template Lookup (before codebase search)

1. Read `templates/index.json`.
2. Match tags against keywords from §Analysis.
3. For each matched template, read `templates/scaffolds/{id}.md`.
4. Embed matched templates at the top of §Research under **Available templates**.

```markdown
## Research

**Available templates:**
- `repo-pattern-jpa` — JPA Repository Pattern (tags: java, jpa, repository)

  [embedded template content]

**Codebase patterns:**
...
```

If no templates match, omit the **Available templates** section entirely.

### Step 4 — Candidate Marking (after compiling findings)

When a newly discovered pattern appears in **2 or more distinct files**, mark it as a template candidate:

```markdown
**Codebase patterns:**
- Service layer uses `@Transactional(readOnly=true)` on all read methods — `UserService.java:45`, `OrderService.java:31`
  **[TEMPLATE CANDIDATE]** tags: java, spring, transaction

**External references:**
- React Query: `useQuery` with `staleTime: Infinity` for static data — Context7 docs
  **[TEMPLATE CANDIDATE]** tags: react, react-query, cache
```

Researcher marks candidates only. Promotion to the catalog is the user's decision via `/wh-template`.

---

## 5. `/wh-template` Command

Handled by the **ruler** agent (catalog management is consistent with ruler's existing role).

### 5.1 Subcommands

| Subcommand | Description |
|------------|-------------|
| `promote`  | Parse `[TEMPLATE CANDIDATE]` entries from a run's `work-doc.md`, let user select, generate `{id}.md` draft, register in `index.json` |
| `add`      | Create a blank template file, user fills it in, register in `index.json` |
| `edit`     | Open an existing template by id or name for modification, update `index.json` if metadata changes |
| `delete`   | Remove `{id}.md` and its entry from `index.json` |

### 5.2 `promote` Flow (detail)

1. Locate the most recent run's `work-doc.md` (or accept a run-id argument).
2. Parse all `[TEMPLATE CANDIDATE]` lines, display as a numbered list.
3. User selects one or more candidates.
4. For each selection, generate a `{id}.md` draft:
   - `id` auto-derived from tags + pattern name (kebab-case)
   - Content skeleton pre-filled from the candidate's context
5. User reviews/edits the draft.
6. On confirmation, write `scaffolds/{id}.md` and append entry to `index.json`.

---

## 6. Affected Components

| Component | Change |
|-----------|--------|
| `researcher.md` | Add Step 0 (lookup + inject) and Step 4 (candidate marking) |
| `templates/index.json` | Replace `index.seed.json`; expand schema per §3.1 |
| `templates/scaffolds/` | Activate as live storage (remove `.gitkeep`) |
| `commands/wh-template.md` | New command (promote / add / edit / delete) |
| `rules/workflow.md` | Update Stage 2 description to mention template lookup and candidate marking |
| `.claude-plugin/plugin.json` | Register `wh-template` command |

**Unchanged:** analyzer, planner, developer, inspector, modifier, all other commands, hook system.

---

## 7. Design Constraints

- Researcher marks a candidate **only** when the pattern appears in ≥ 2 distinct files (codebase) or is directly relevant enough to reuse (external). No noise marking.
- Template files must stay ≤ 30 lines of code in the snippet section. If a pattern requires more, split into multiple templates or use prose description instead.
- `index.json` and `scaffolds/` must remain in sync at all times. `/wh-template` is the sole writer of both.
- No new agents introduced. Ruler handles `/wh-template`.
