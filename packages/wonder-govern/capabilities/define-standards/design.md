# wonder-govern.define-standards Implementation Design

Sources:

- `docs/system-design.md`
- `packages/wonder-govern/specs/define-standards.md`

## Contract

`wonder-govern.define-standards` creates and maintains project-specific standards in `.wonder/standards/`. It may inspect project conventions, but must distinguish observed conventions from adopted standards.

Required inputs:

- user request
- project context
- existing `.wonder/standards/` when present

Writes:

- `.wonder/standards/*.md`
- `.wonder/runs/<run-id>/`

Must not write:

- `.wonder/reports/govern-latest.json`
- other plugin config files

## Run Directory

```text
.wonder/runs/<run-id>/
  run.json
  request.md
  observed-conventions.md
  proposed-standards.md
  changes.md
  report.md
  artifacts.json
```

`artifacts.json`:

```json
{
  "standardsCreated": [],
  "standardsModified": [],
  "rulesAdded": [],
  "rulesUpdated": [],
  "conflicts": []
}
```

## Flow

```text
scope
  determine standards domains in scope
  read existing standards
  read optional govern config

observe
  inspect project files and docs relevant to scope
  record observed conventions separately from proposed rules

propose
  create candidate rules with ids, severity, rationale
  detect conflicts with existing rules
  ask for confirmation before conflicting changes

apply
  write accepted non-conflicting standards
  delete standards only when explicitly requested
  preserve unrelated standards content

report
  summarize created/modified files
  list conflicts and skipped changes
  recommend check-policy
```

## Rule Format

Rule id:

```text
GOV-<DOMAIN>-<NUMBER>
```

Severity:

```text
critical
high
medium
low
info
```

Markdown shape:

```md
## GOV-CODING-001: Prefer Project-Local Patterns

Use existing local patterns before introducing new abstractions.

Rationale: Keeps generated changes consistent with the repository.
Severity: medium
```

## Conflict Detection

A conflict exists when a proposed rule:

- has the same id but materially different instruction
- contradicts an existing rule in the same domain
- changes severity in a way that affects enforcement
- deletes or replaces a rule without explicit user request

Conflicts are recorded in `changes.md` and `artifacts.json`.

## Validation

- standards filenames are kebab-case Markdown
- rule ids match `GOV-<DOMAIN>-<NUMBER>`
- severities are recognized
- observed conventions are not written as standards unless accepted
- deletion requires explicit user request

## Failure Handling

- Unclear conventions: propose cautious starter standards and mark assumptions.
- Conflict: do not auto-merge; ask user.
- Ambiguous deletion: ask user.
- Write failure: report path and avoid destructive partial edits.
