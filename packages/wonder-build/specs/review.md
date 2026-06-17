# wonder-build.review

## Purpose

`wonder-build.review` evaluates existing work and reports findings.

It gathers evidence, makes judgments, and reports risks. It does not directly modify project files.

## User-Facing Behavior

The user asks for a review of code, documents, architecture, generated output, a diff, or a completed task.

The review result leads with findings, ordered by severity. If no issues are found, the report says so clearly and notes remaining test gaps or residual risk.

`wonder-build.review` may run read-only validation commands to gather evidence, but it must not run commands that intentionally modify files.

## Inputs

Required input:

- Review request.
- Review target or scope.
- Current project context.

Optional input:

- Existing diff or changed file list.
- Validation output.
- `.wonder/config/build.json`.
- `.wonder/standards/` when `wonder-govern` is available.
- Reuse report templates when `wonder-reuse` is available.
- Companion capability metadata when `wonder-extend` is available.

## Lifecycle

`wonder-build.review` uses this lifecycle:

```text
scope
inspect
judge
report
```

`scope` determines what is being reviewed and what criteria apply.

`inspect` gathers evidence from files, diffs, validation output, logs, or relevant project context.

`judge` identifies bugs, risks, missing tests, design weaknesses, regressions, and policy-related concerns.

`report` presents findings in severity order with enough evidence to act.

## Runtime State

`wonder-build.review` reads:

```text
.wonder/state.json
.wonder/config/build.json
.wonder/standards/
.wonder/reuse/
.wonder/extend/capabilities.json
```

It writes:

```text
.wonder/runs/<run-id>/
.wonder/reports/build-latest.json
```

It must not modify reviewed project files.

It must not directly modify `.wonder/reports/govern-latest.json`.

## Run Records

One review request creates one run:

```text
.wonder/runs/<run-id>/
  run.json
  request.md
  inspect.md
  findings.json
  report.md
  artifacts.json
```

`findings.json` contains machine-readable findings and uses the same severity order as the user report.

## Reports

On completion, `wonder-build.review` updates:

```text
.wonder/reports/build-latest.json
```

`build-latest.json` points to the last completed build capability run and contains summary metadata only.

Example:

```json
{
  "lastCompletedRunId": "<run-id>",
  "lastRunId": "<run-id>",
  "capability": "wonder-build.review",
  "status": "completed",
  "summary": "Reviewed the target and reported findings.",
  "finishedAt": "<timestamp>"
}
```

Review findings use these severities:

```text
critical
high
medium
low
info
```

Severity meaning:

- `critical`: Data loss, security vulnerability, deployment blocker, or equivalent severe failure.
- `high`: Major functional bug, clear regression, or important contract violation.
- `medium`: Conditional bug, missing verification, or maintainability risk.
- `low`: Minor quality issue.
- `info`: Reference note or improvement suggestion.

## Capability Discovery

If `wonder-govern` is initialized, `review` reads relevant standards read-only and uses them as review criteria.

If a finding matches an explicit govern standard or policy, `review` may record a policy violation reference in `findings.json`.

`review` must not update `govern-latest.json`; govern report updates belong to `wonder-govern.check-policy`.

If `wonder-reuse` is initialized, `review` may automatically use review report templates.

If `wonder-extend` is initialized, `review` may detect companion capabilities. It must get explicit user consent before using companion tools unless the user has opted into read-only companion usage in build config.

## Validation

`wonder-build.review` may run read-only validation commands, including:

- Tests.
- Lint.
- Typecheck.
- Build checks.
- Diff or status inspection.
- Static analysis.

It must not run commands whose purpose is to write changes, such as:

- Format write.
- Code generation write.
- Auto-fix.
- Dependency installation without consent.

If validation cannot be run, the reason should be recorded in `inspect.md` and included in the report when relevant.

## Failure Handling

If the review scope is unclear and cannot be inferred from project context, ask the user to clarify.

If validation produces partial results, use the available evidence and report the gap.

If no findings are found, state that clearly and include any remaining validation gaps or residual risks.

## Non-Goals

`wonder-build.review` does not:

- Modify project files.
- Apply fixes.
- Run write-mode formatters or auto-fix commands.
- Directly update `govern-latest.json`.
- Automatically install or invoke companion tools without consent.
