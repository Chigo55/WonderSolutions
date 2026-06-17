# wonder-build.modify

## Purpose

`wonder-build.modify` changes an existing project artifact, behavior, document, workflow, or structure.

The boundary is user intent, not whether new files are created. If the main goal is to change something that already exists, the work is modify even when supporting files must be added.

## User-Facing Behavior

The user asks to alter existing project behavior or content.

`wonder-build.modify` should inspect the current implementation before editing. It should preserve unrelated user work and keep changes scoped to the request.

It should ask the user only when uncertainty would materially change the result or introduce significant risk.

## Inputs

Required input:

- User request.
- Current project context.
- Existing artifact or behavior to change.

Optional input:

- `.wonder/config/build.json`.
- `.wonder/standards/` when `wonder-govern` is available.
- Reuse templates or patterns when `wonder-reuse` is available.
- Companion capability metadata when `wonder-extend` is available.

## Lifecycle

`wonder-build.modify` uses this lifecycle:

```text
understand
plan
implement
inspect
report
```

`understand` identifies the existing artifact and the desired change.

`plan` decides a scoped edit approach. For small tasks, the plan may be brief.

`implement` edits the existing artifact and adds supporting files only when needed.

`inspect` verifies the result with available checks.

`report` summarizes the change, validation, and residual risks.

`inspect` and `report` are mandatory. `plan` may be shortened for low-risk work.

## Runtime State

`wonder-build.modify` reads:

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

It may update project files required by the user request.

It must not directly modify other plugin config files.

## Run Records

One user request creates one run:

```text
.wonder/runs/<run-id>/
  run.json
  request.md
  plan.md
  inspect.md
  report.md
  artifacts.json
```

Retries or follow-up corrections within the same user request append to the same run.

A new independent user request creates a new run.

## Reports

On completion, `wonder-build.modify` updates:

```text
.wonder/reports/build-latest.json
```

`build-latest.json` points to the last completed build capability run and contains summary metadata only.

Example:

```json
{
  "lastCompletedRunId": "<run-id>",
  "lastRunId": "<run-id>",
  "capability": "wonder-build.modify",
  "status": "completed",
  "summary": "Modified the requested artifact and verified available checks.",
  "finishedAt": "<timestamp>"
}
```

If a run fails, `lastRunId` may point to it, but `lastCompletedRunId` must remain the last successful run.

## Capability Discovery

If `wonder-govern` is initialized, `modify` reads relevant standards read-only and incorporates them into planning and inspection.

If `wonder-reuse` is initialized, `modify` may automatically use request and report templates. It should ask or clearly propose before applying reusable templates, snippets, or patterns to the actual project artifact.

If `wonder-extend` is initialized, `modify` may detect companion capabilities. It must get explicit user consent before using companion tools unless the user has opted into read-only companion usage in build config.

## Validation

`wonder-build.modify` must run available validation before completion.

Examples:

- Tests.
- Lint.
- Typecheck.
- Build checks.
- Documentation validation.

If no validation command can be found or a validation command cannot be run, the reason must be recorded in `inspect.md` and reported to the user.

Validation failures must not be hidden.

## Failure Handling

If required context is missing and a reasonable default is safe, continue with the default and record the assumption.

If a decision affects product direction, data safety, security, public API, or broad architecture, ask the user before continuing.

If standards violations are found:

- Fix violations inside the current work scope.
- Report unrelated existing violations without modifying them.
- Ask before changes that require broad structural risk.

If unrelated project changes are present, preserve them and avoid reverting user work.

## Non-Goals

`wonder-build.modify` does not:

- Perform broad rewrites unrelated to the request.
- Edit `wonder-govern`, `wonder-reuse`, or `wonder-extend` config files.
- Automatically install companion tools.
- Treat companion tools as required.
- Directly update `govern-latest.json`.
