# wonder-govern.check-policy

## Purpose

`wonder-govern.check-policy` evaluates whether the project, a selected scope, or a specific change complies with `.wonder/standards/`.

It reports policy violations and updates the latest govern summary. It does not modify project files.

## User-Facing Behavior

The user asks to check policy compliance.

`check-policy` supports two primary scopes:

- Whole-project check.
- Specific change check, such as a diff, file set, or task result.

It reports violations, severity, confidence, and remediation guidance. It may run read-only validation commands to gather evidence.

## Inputs

Required input:

- User request.
- Check scope.
- `.wonder/standards/`.

Optional input:

- Existing diff or changed file list.
- Validation output.
- `.wonder/config/govern.json`.
- Previous govern reports.
- Related build run records.

## Lifecycle

`wonder-govern.check-policy` uses this lifecycle:

```text
scope
index-standards
inspect
evaluate
report
```

`scope` determines whether the check covers the whole project or a specific change.

`index-standards` records the rule ids, source files, and severities used for this check.

`inspect` gathers evidence from files, diffs, validation output, logs, or relevant project context.

`evaluate` determines policy violations, severity, confidence, and remediation.

`report` updates run records, updates `govern-latest.json`, and summarizes results to the user.

## Runtime State

`wonder-govern.check-policy` reads:

```text
.wonder/state.json
.wonder/config/govern.json
.wonder/standards/
```

It writes:

```text
.wonder/runs/<run-id>/
.wonder/reports/govern-latest.json
```

It must not modify project files under review.

It must not modify `.wonder/standards/`; standards changes belong to `wonder-govern.define-standards`.

## Run Records

One policy check request creates one run:

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

`standards-index.json` records the rule id, source file, and severity snapshot used for the check. This preserves what rules were applied even if standards change later.

`violations.json` records machine-readable violation details.

`inspect.md` records the scope, evidence, files, and read-only commands used.

`report.md` contains the user-facing summary.

## Reports

On completion, `check-policy` updates:

```text
.wonder/reports/govern-latest.json
```

`govern-latest.json` contains summary metadata only and points to the last completed policy check.

Example:

```json
{
  "lastCompletedRunId": "<run-id>",
  "lastRunId": "<run-id>",
  "scope": "project",
  "status": "completed",
  "summary": "Policy check completed with one high and three medium violations.",
  "violationCounts": {
    "critical": 0,
    "high": 1,
    "medium": 3,
    "low": 2,
    "info": 0
  },
  "finishedAt": "<timestamp>"
}
```

Detailed violations live in `.wonder/runs/<run-id>/violations.json`.

Violation severities:

```text
critical
high
medium
low
info
```

Violation confidence:

```text
high
medium
low
```

Example violation:

```json
{
  "ruleId": "GOV-DOCS-001",
  "severity": "medium",
  "confidence": "high",
  "message": "Design document is missing a failure handling section.",
  "remediation": "Add a Failure Handling section describing expected behavior when validation cannot run."
}
```

## Capability Discovery

`check-policy` may be discovered by other plugins through `.wonder/state.json`.

`wonder-build.review` may reference govern rule ids in its own findings. It must not update `govern-latest.json` directly.

`check-policy` does not require other Wonder plugins.

## Validation

`check-policy` may run read-only validation commands, including:

- Tests.
- Lint.
- Typecheck.
- Build checks.
- Static analysis.
- Documentation validation.
- Repository status or diff inspection.

It must not run commands whose purpose is to write changes, such as:

- Format write.
- Auto-fix.
- Code generation.
- Dependency installation without consent.

`check-policy` validates that standards rules use the required rule id format and recognized severity values.

## Failure Handling

If no standards exist, `check-policy` reports that standards must be defined first and recommends `wonder-govern.define-standards`.

If some standards cannot be parsed, `check-policy` should continue with valid rules when safe and report skipped files.

If a violation is plausible but uncertain, record lower confidence rather than overstating certainty.

If validation commands cannot be run, record the reason in `inspect.md` and include it in the report when relevant.

If a policy check fails, `lastRunId` may point to the failed run, but `lastCompletedRunId` must remain the last successful policy check.

## Non-Goals

`wonder-govern.check-policy` does not:

- Modify project files.
- Apply remediation.
- Modify `.wonder/standards/`.
- Define new standards.
- Run write-mode formatters or auto-fix commands.
- Automatically install companion tools.
