# wonder-build.create Implementation Design

Sources:

- `docs/system-design.md`
- `packages/wonder-build/specs/create.md`

## Contract

`wonder-build.create` adds a new primary project artifact or capability. The capability must work without other Wonder plugins, but may read their state for progressive enhancement.

Required inputs:

- user request
- project root and current project context
- current platform

Optional inputs:

- `.wonder/config/build.json`
- `.wonder/standards/`
- `.wonder/reuse/`
- `.wonder/extend/capabilities.json`

Writes:

- requested project files
- `.wonder/runs/<run-id>/`
- `.wonder/reports/build-latest.json`

Must not write:

- `.wonder/config/govern.json`
- `.wonder/config/reuse.json`
- `.wonder/config/extend.json`
- `.wonder/reports/govern-latest.json`

## Run Directory

Create one run per independent user request:

```text
.wonder/runs/<run-id>/
  run.json
  request.md
  plan.md
  inspect.md
  report.md
  artifacts.json
```

`run.json`:

```json
{
  "schemaVersion": 1,
  "runId": "<run-id>",
  "packageId": "wonder-build",
  "capabilityId": "create",
  "platform": "<platform>",
  "status": "running",
  "startedAt": "<iso timestamp>"
}
```

`artifacts.json` records created and modified paths:

```json
{
  "created": [],
  "modified": [],
  "validated": [],
  "reuseAssetsUsed": [],
  "companionCapabilitiesUsed": []
}
```

## Flow

```text
understand
  save request.md
  inspect project structure and relevant files
  read optional build config
  read govern standards when initialized
  read reuse assets when initialized
  read extend capabilities when initialized

plan
  classify the work as create
  choose target files and integration points
  record assumptions and skipped optional inputs
  ask only for product direction, security, data safety, public API, or broad architecture uncertainty

implement
  create the primary artifact
  update integration files required by the new artifact
  keep unrelated cleanup out of scope
  record changed paths in artifacts.json

inspect
  discover validation commands from build config and project conventions
  run available validation commands
  record command, exit code, and relevant output summary in inspect.md
  record unavailable validation reason when no command can run

report
  write report.md
  update build-latest.json
  summarize changed files, validation, assumptions, and risks
```

## Validation Command Selection

Order:

1. `.wonder/config/build.json.validationCommands`
2. package scripts commonly named `test`, `typecheck`, `lint`, `build`
3. project-specific commands discovered from local docs or config

Do not install dependencies unless the user explicitly consents.

## build-latest.json

On success:

```json
{
  "schemaVersion": 1,
  "lastCompletedRunId": "<run-id>",
  "lastRunId": "<run-id>",
  "capability": "wonder-build.create",
  "status": "completed",
  "summary": "<one sentence>",
  "finishedAt": "<iso timestamp>"
}
```

On failure, update `lastRunId` only when the file already exists or when a failed run record was created. Preserve previous `lastCompletedRunId`.

## Capability Discovery

- Govern standards are read-only criteria.
- Reuse assets may be proposed or used; applying a template/snippet/pattern to project files must be clear in the plan or report.
- Extend capabilities may be used only when available with medium/high confidence and user consent rules allow it.
- Companion tools are never required.

## Failure Handling

- Safe missing context: continue with recorded assumption.
- Risky missing context: ask before continuing.
- Validation failure: report failure and do not hide it.
- Standards violation in current scope: fix or report.
- Unrelated existing violation: report only.
- Write failure: preserve run record and report partial artifacts.
