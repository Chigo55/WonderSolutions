# wonder-build.create

## Purpose

`wonder-build.create` introduces a new primary artifact or capability into the project.

The boundary is user intent, not file operation type. If the main goal is to add something new, the work is create even when existing files must be updated to integrate it.

## User-Facing Behavior

The user asks for a new feature, document, module, workflow, file set, or other project artifact.

`wonder-build.create` should work autonomously by default. It should inspect available project context, choose reasonable defaults, and ask the user only when uncertainty would materially change the result.

It may use discovered capabilities from other Wonder plugins, but must still function when no other Wonder plugin is initialized.

## Inputs

Required input:

- User request.
- Current project context.

Optional input:

- `.wonder/config/build.json`.
- `.wonder/standards/` when `wonder-govern` is available.
- Reuse templates or request forms when `wonder-reuse` is available.
- Companion capability metadata when `wonder-extend` is available.

## Lifecycle

`wonder-build.create` uses this lifecycle:

```text
understand
plan
implement
inspect
report
```

`understand` gathers the user intent and relevant project context.

`plan` decides the implementation approach. For small tasks, the plan may be brief.

`implement` creates the new primary artifact and any needed integration changes.

`inspect` verifies the result with available checks.

`report` summarizes what changed, what was verified, and any remaining risks.

`inspect` and `report` are mandatory. `plan` may be shortened for low-risk work.

## Runtime State

`wonder-build.create` reads:

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

On completion, `wonder-build.create` updates:

```text
.wonder/reports/build-latest.json
```

`build-latest.json` points to the last completed build capability run and contains summary metadata only.

Example:

```json
{
  "lastCompletedRunId": "<run-id>",
  "lastRunId": "<run-id>",
  "capability": "wonder-build.create",
  "status": "completed",
  "summary": "Created the requested artifact and verified available checks.",
  "finishedAt": "<timestamp>"
}
```

If a run fails, `lastRunId` may point to it, but `lastCompletedRunId` must remain the last successful run.

## Capability Discovery

If `wonder-govern` is initialized, `create` reads relevant standards read-only and incorporates them into planning and inspection.

If `wonder-reuse` is initialized, `create` may automatically use request and report templates. It should ask or clearly propose before applying reusable templates, snippets, or patterns to the actual project artifact.

If `wonder-extend` is initialized, `create` may detect companion capabilities. It must get explicit user consent before using companion tools unless the user has opted into read-only companion usage in build config.

## Validation

`wonder-build.create` must run available validation before completion.

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

## Non-Goals

`wonder-build.create` does not:

- Edit `wonder-govern`, `wonder-reuse`, or `wonder-extend` config files.
- Automatically install companion tools.
- Treat companion tools as required.
- Directly update `govern-latest.json`.
- Perform unrelated cleanup outside the user request.
