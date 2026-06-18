# wonder-govern.check-policy Implementation Design

Sources:

- `docs/system-design.md`
- `packages/wonder-govern/specs/check-policy.md`

## Contract

`wonder-govern.check-policy` evaluates project or change compliance against `.wonder/standards/`. It reports violations and updates `govern-latest.json`. It must not modify reviewed project files or standards.

Required inputs:

- user request
- check scope
- `.wonder/standards/`

Writes:

- `.wonder/runs/<run-id>/`
- `.wonder/reports/govern-latest.json`

Must not write:

- project files under review
- `.wonder/standards/`

## Run Directory

```text
.wonder/runs/<run-id>/
  run.json
  request.md
  standards-index.json
  inspect.md
  violations.json
  report.md
  artifacts.json
```

`standards-index.json` snapshot:

```json
{
  "rules": [
    {
      "ruleId": "GOV-DOCS-001",
      "sourceFile": ".wonder/standards/docs.md",
      "severity": "medium",
      "title": "Documentation must include failure handling"
    }
  ]
}
```

`violations.json`:

```json
{
  "violations": [
    {
      "ruleId": "GOV-DOCS-001",
      "severity": "medium",
      "confidence": "high",
      "message": "<violation>",
      "location": {
        "path": "<file>",
        "line": 1
      },
      "remediation": "<action>"
    }
  ]
}
```

## Flow

```text
scope
  determine project-wide or change-specific scope
  collect target files/diff when applicable

index-standards
  parse standards files
  extract rule ids, titles, severity, source file
  write standards-index.json

inspect
  gather evidence from files, diffs, validation output, logs
  run read-only validation commands when useful
  record skipped checks

evaluate
  map evidence to rule violations
  assign severity from rule
  assign confidence per evidence strength
  create remediation text

report
  write violations.json
  write report.md
  update govern-latest.json
```

## Read-Only Command Policy

Allowed:

- tests, lint, typecheck, build checks in non-writing mode
- static analysis in read-only mode
- diff/status inspection

Forbidden without explicit user consent:

- format write
- auto-fix
- code generation
- dependency installation

## govern-latest.json

On success:

```json
{
  "schemaVersion": 1,
  "lastCompletedRunId": "<run-id>",
  "lastRunId": "<run-id>",
  "scope": "project",
  "status": "completed",
  "summary": "<one sentence>",
  "violationCounts": {
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0,
    "info": 0
  },
  "finishedAt": "<iso timestamp>"
}
```

On failure, preserve previous `lastCompletedRunId`.

## Validation

- standards exist before check
- rule ids match required format
- rule severities are recognized
- violation confidence is `high`, `medium`, or `low`
- all commands are read-only

## Failure Handling

- No standards: report and recommend `wonder-govern.define-standards`.
- Some standards invalid: continue with valid rules only when safe; report skipped files.
- Uncertain violation: use lower confidence.
- Validation command unavailable: record reason.
- Failed check: update `lastRunId` only, preserve last successful completed id.
