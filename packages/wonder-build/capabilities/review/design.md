# wonder-build.review Implementation Design

Sources:

- `docs/system-design.md`
- `packages/wonder-build/specs/review.md`

## Contract

`wonder-build.review` evaluates existing work and reports findings. It must not intentionally modify reviewed project files.

Required inputs:

- review request
- review target or scope
- current project context
- current platform

Optional inputs:

- existing diff or changed file list
- validation output
- build config
- govern standards
- reuse report templates
- extend capability metadata

Writes:

- `.wonder/runs/<run-id>/`
- `.wonder/reports/build-latest.json`

Must not write:

- reviewed project files
- `.wonder/reports/govern-latest.json`

## Run Directory

```text
.wonder/runs/<run-id>/
  run.json
  request.md
  inspect.md
  findings.json
  report.md
  artifacts.json
```

`findings.json`:

```json
{
  "findings": [
    {
      "severity": "high",
      "title": "<short finding>",
      "location": {
        "path": "<file>",
        "line": 1
      },
      "evidence": "<specific evidence>",
      "impact": "<why it matters>",
      "recommendation": "<actionable fix>",
      "policyRuleId": null
    }
  ]
}
```

Severity order:

```text
critical
high
medium
low
info
```

## Flow

```text
scope
  determine reviewed target
  determine review criteria
  read optional govern standards
  identify read-only validation commands

inspect
  read target files, diffs, logs, and existing validation output
  run read-only validation only
  record evidence and skipped checks

judge
  identify bugs, regressions, security/data risks, missing tests, and design weaknesses
  map applicable govern rule ids when available
  sort by severity

report
  write findings.json
  write report.md
  update build-latest.json
  lead user-facing report with findings
```

## Read-Only Command Policy

Allowed:

- test commands that do not rewrite files
- lint/typecheck/build checks without fix/write mode
- `git diff`, `git status`, file inspection
- static analysis in read-only mode

Forbidden without explicit consent:

- format write
- auto-fix
- code generation
- dependency installation
- commands whose purpose is to modify files

## build-latest.json

On success:

```json
{
  "schemaVersion": 1,
  "lastCompletedRunId": "<run-id>",
  "lastRunId": "<run-id>",
  "capability": "wonder-build.review",
  "status": "completed",
  "summary": "<one sentence>",
  "finishedAt": "<iso timestamp>"
}
```

## Capability Discovery

- Govern standards are read-only criteria.
- Policy-related findings may include `policyRuleId`.
- Reuse may provide report template only.
- Extend companion use requires consent or read-only opt-in.

## Failure Handling

- Unclear scope: ask for clarification.
- Partial evidence: report what was checked and what remains unknown.
- Validation unavailable: record reason in `inspect.md`.
- No findings: state no issues found and include residual risk/test gaps.
- Any attempted write path must be rejected before execution.
