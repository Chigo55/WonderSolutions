# wonder-govern.init

## Purpose

`wonder-govern.init` prepares a project to use the `wonder-govern` plugin.

It registers govern capabilities, creates govern-owned configuration, and creates starter standards files for project-specific rules.

`wonder-govern.init` must not require any other Wonder plugin.

## User-Facing Behavior

The user explicitly runs the init capability from the current platform.

Installation alone must not modify project files.

On success, the project can use these govern capabilities:

- `wonder-govern.define-standards`
- `wonder-govern.check-policy`

The init result should report what was created, what already existed, and which platform was marked initialized.

## Inputs

Required input:

- Current project root.
- Current platform identity.

Optional input:

- User-provided govern configuration values.

If optional values are absent, init uses conservative defaults.

## Lifecycle

`wonder-govern.init` uses this lifecycle:

```text
scope
prepare
register
report
```

`scope` determines the project root and current platform.

`prepare` ensures govern-owned runtime paths and starter standards exist.

`register` creates or merges govern capability entries in `.wonder/state.json`.

`report` summarizes the resulting state.

## Runtime State

`wonder-govern.init` creates or ensures:

```text
.wonder/
  state.json
  config/
    govern.json
  standards/
    coding.md
    architecture.md
    security.md
    docs.md
  runs/
```

`wonder-govern.init` must not create `.wonder/reports/govern-latest.json`. That file is created only after `wonder-govern.check-policy` completes.

`.wonder/state.json` is machine-managed. Init may create or merge only the `wonder-govern` section.

`.wonder/config/govern.json` is user-editable. Init may create it when absent, but should avoid overwriting user edits.

The starter standards files are user-editable Markdown files. Init should create minimal starter content, not full project standards.

## Run Records

Init does not require a full govern run record.

If the implementation records init runs, the record must be lightweight and must not be treated as a `wonder-govern.define-standards` or `wonder-govern.check-policy` run.

## Reports

Init does not write `govern-latest.json`.

The init command reports directly to the user and may include:

- Created paths.
- Existing paths reused.
- Registered capabilities.
- Starter standards files created.
- Current platform initialized state.

## Capability Discovery

Init registers all `wonder-govern` capability surfaces in `.wonder/state.json`.

Surface names for all supported platforms are recorded, but only the platform running init is marked initialized.

Example:

```json
{
  "plugins": {
    "wonder-govern": {
      "capabilities": {
        "define-standards": {
          "kind": "workflow",
          "surfaces": {
            "claude": "/wonder-govern:define-standards",
            "codex": "$wonder-govern-define-standards",
            "antigravity": "wonder-govern.define-standards"
          }
        },
        "check-policy": {
          "kind": "workflow",
          "surfaces": {
            "claude": "/wonder-govern:check-policy",
            "codex": "$wonder-govern-check-policy",
            "antigravity": "wonder-govern.check-policy"
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
- The `wonder-govern` registry section can be merged without deleting other plugin entries.
- The current platform is supported.
- Generated surface names match the canonical capability identifiers.
- Starter standards file names use kebab-case Markdown names.

## Failure Handling

If `.wonder/state.json` is missing, init creates it.

If `.wonder/state.json` is invalid, init should avoid destructive overwrite. It should preserve the invalid file when possible and report that registry repair is required.

If standards file creation fails, init must report the failure and leave existing files unchanged where possible.

If starter standards files already exist, init must not overwrite user content.

## Non-Goals

`wonder-govern.init` does not:

- Define full project standards.
- Check policy compliance.
- Create `govern-latest.json`.
- Modify other Wonder plugin config files.
- Initialize other Wonder plugins.
- Install companion tools.
