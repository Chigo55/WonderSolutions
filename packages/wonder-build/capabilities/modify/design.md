# wonder-build.modify Implementation Design

Sources:

- `docs/system-design.md`
- `packages/wonder-build/specs/modify.md`

## Contract

`wonder-build.modify` changes an existing artifact or behavior. It may add support files, but the main user intent is modifying something already present.

Required inputs:

- user request
- project root and current project context
- existing artifact or behavior to change
- current platform

Writes:

- scoped project file edits
- `.wonder/runs/<run-id>/`
- `.wonder/reports/build-latest.json`

Must preserve unrelated user work. Must not revert changes outside the requested scope.

## Run Directory

```text
.wonder/runs/<run-id>/
  run.json
  request.md
  plan.md
  inspect.md
  report.md
  artifacts.json
```

`artifacts.json`:

```json
{
  "modified": [],
  "created": [],
  "deleted": [],
  "validation": [],
  "preservedUnrelatedChanges": []
}
```

## Flow

```text
understand
  save request.md
  identify target artifact or behavior
  inspect current implementation before editing
  check working tree status when Git is available
  read optional build config, standards, reuse assets, and extend capabilities

plan
  define narrow edit scope
  list files likely to change
  identify risky contract changes
  ask only when ambiguity materially affects result or risk

implement
  edit existing artifact
  add support files only when required
  avoid unrelated cleanup
  preserve unrelated local changes
  record changed paths

inspect
  run available validation
  record unavailable validation reason
  record validation failures without hiding them

report
  write report.md
  update build-latest.json
  include modified paths, validation, and residual risks
```

## Scope Guard

Before editing, compute:

```json
{
  "targetDescription": "<artifact or behavior>",
  "allowedPaths": [],
  "observedRelatedPaths": [],
  "unrelatedDirtyPaths": []
}
```

If a required edit touches a path outside `allowedPaths`, update the plan and record why it is needed.

## Validation

Use the same command selection order as `wonder-build.create`:

1. build config validation commands
2. local package scripts
3. project-specific docs/config

Validation results go to `inspect.md` and `run.json.validation.commands`.

## build-latest.json

On success, set:

```json
{
  "schemaVersion": 1,
  "lastCompletedRunId": "<run-id>",
  "lastRunId": "<run-id>",
  "capability": "wonder-build.modify",
  "status": "completed",
  "summary": "<one sentence>",
  "finishedAt": "<iso timestamp>"
}
```

On failure, preserve the previous successful run id.

## Capability Discovery

- Govern standards are read-only criteria.
- Reuse templates may shape request/report output; applying reusable code/doc patterns to project files must be scoped and reported.
- Extend capabilities require consent unless read-only opt-in allows them.

## Failure Handling

- Missing target artifact: ask if it cannot be safely inferred.
- Unrelated dirty files: preserve and avoid reverting them.
- Broad rewrite pressure: ask before proceeding.
- Validation failure: stop or report depending on user request and severity.
- Partial write failure: report affected path and keep run record.
