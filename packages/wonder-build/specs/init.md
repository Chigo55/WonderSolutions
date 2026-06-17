# wonder-build.init

## Purpose

`wonder-build.init` prepares a project to use the `wonder-build` plugin.

It registers build capabilities in the project-local Wonder registry and creates the build-owned runtime directories and configuration needed by later build runs.

`wonder-build.init` must not require any other Wonder plugin.

## User-Facing Behavior

The user explicitly runs the init capability from the current platform.

Installation alone must not modify project files.

On success, the project can use these build capabilities:

- `wonder-build.create`
- `wonder-build.modify`
- `wonder-build.review`

The init result should report what was created, what already existed, and which platform was marked initialized.

## Inputs

Required input:

- Current project root.
- Current platform identity.

Optional input:

- User-provided build configuration values.

If optional values are absent, init uses conservative defaults.

## Lifecycle

`wonder-build.init` uses this lifecycle:

```text
scope
prepare
register
report
```

`scope` determines the project root and current platform.

`prepare` ensures build-owned runtime paths exist.

`register` creates or merges build capability entries in `.wonder/state.json`.

`report` summarizes the resulting state.

## Runtime State

`wonder-build.init` creates or ensures:

```text
.wonder/
  state.json
  config/
    build.json
  runs/
```

`wonder-build.init` must not create `.wonder/reports/build-latest.json`. That file is created only after a build capability run completes.

`.wonder/state.json` is machine-managed. Init may create or merge only the `wonder-build` section.

`.wonder/config/build.json` is user-editable. Init may create it when absent, but should avoid overwriting user edits.

## Run Records

Init does not require a full build run record.

If the implementation records init runs, the record must be lightweight and must not be treated as a `wonder-build.create`, `wonder-build.modify`, or `wonder-build.review` run.

## Reports

Init does not write `build-latest.json`.

The init command reports directly to the user and may include:

- Created paths.
- Existing paths reused.
- Registered capabilities.
- Current platform initialized state.

## Capability Discovery

Init registers all `wonder-build` capability surfaces in `.wonder/state.json`.

Surface names for all supported platforms are recorded, but only the platform running init is marked initialized.

Example:

```json
{
  "plugins": {
    "wonder-build": {
      "capabilities": {
        "create": {
          "kind": "workflow",
          "surfaces": {
            "claude": "/wonder-build:create",
            "codex": "$wonder-build-create",
            "antigravity": "wonder-build.create"
          }
        }
      },
      "platforms": {
        "claude": { "initialized": true },
        "codex": { "initialized": false },
        "antigravity": { "initialized": false }
      }
    }
  }
}
```

## Validation

Init validates that:

- `.wonder/state.json` is valid JSON when present.
- The `wonder-build` registry section can be merged without deleting other plugin entries.
- The current platform is supported.
- Generated surface names match the canonical capability identifiers.

## Failure Handling

If `.wonder/state.json` is missing, init creates it.

If `.wonder/state.json` is invalid, init should avoid destructive overwrite. It should preserve the invalid file when possible and report that registry repair is required.

If config creation fails, init must report the failure and leave existing files unchanged where possible.

## Non-Goals

`wonder-build.init` does not:

- Execute create, modify, or review work.
- Create `build-latest.json`.
- Modify other Wonder plugin config files.
- Initialize other Wonder plugins.
- Install companion tools.
