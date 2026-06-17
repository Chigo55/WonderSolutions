# wonder-reuse.init

## Purpose

`wonder-reuse.init` prepares a project to use the `wonder-reuse` plugin.

It registers reuse capabilities, creates reuse-owned configuration, creates the reuse asset directory structure, and seeds minimal starter assets.

`wonder-reuse.init` must not require any other Wonder plugin.

## User-Facing Behavior

The user explicitly runs the init capability from the current platform.

Installation alone must not modify project files.

On success, the project can use these reuse capabilities:

- `wonder-reuse.manage-assets`
- `wonder-reuse.generate-output`
- `wonder-reuse.promote-asset`

The init result should report what was created, what already existed, which starter assets were created, and which platform was marked initialized.

## Inputs

Required input:

- Current project root.
- Current platform identity.

Optional input:

- User-provided reuse configuration values.

If optional values are absent, init uses conservative defaults.

## Lifecycle

`wonder-reuse.init` uses this lifecycle:

```text
scope
prepare
seed
index
register
report
```

`scope` determines the project root and current platform.

`prepare` ensures reuse-owned runtime paths exist.

`seed` creates minimal starter assets when absent.

`index` creates or refreshes `.wonder/reuse/index.json`.

`register` creates or merges reuse capability entries in `.wonder/state.json`.

`report` summarizes the resulting state.

## Runtime State

`wonder-reuse.init` creates or ensures:

```text
.wonder/
  state.json
  config/
    reuse.json
  reuse/
    index.json
    templates/
    snippets/
    requests/
    patterns/
  runs/
```

Starter assets use the same structure as regular assets:

```text
.wonder/reuse/requests/basic-task/
  asset.json
  body.md

.wonder/reuse/templates/basic-report/
  asset.json
  body.md
```

`asset.json` may include `"starter": true`.

`.wonder/reuse/index.json` is machine-managed and regenerated from asset directories.

`.wonder/config/reuse.json` is user-editable. Init may create it when absent, but should avoid overwriting user edits.

## Run Records

Init does not require a full reuse run record.

If the implementation records init runs, the record must be lightweight and must not be treated as a `wonder-reuse.manage-assets`, `wonder-reuse.generate-output`, or `wonder-reuse.promote-asset` run.

## Reports

`wonder-reuse` does not maintain a latest report file.

The init command reports directly to the user and may include:

- Created paths.
- Existing paths reused.
- Starter assets created.
- Index status.
- Registered capabilities.
- Current platform initialized state.

## Capability Discovery

Init registers all `wonder-reuse` capability surfaces in `.wonder/state.json`.

Surface names for all supported platforms are recorded, but only the platform running init is marked initialized.

Example:

```json
{
  "plugins": {
    "wonder-reuse": {
      "capabilities": {
        "manage-assets": {
          "kind": "workflow",
          "surfaces": {
            "claude": "/wonder-reuse:manage-assets",
            "codex": "$wonder-reuse-manage-assets",
            "antigravity": "wonder-reuse.manage-assets"
          }
        },
        "generate-output": {
          "kind": "workflow",
          "surfaces": {
            "claude": "/wonder-reuse:generate-output",
            "codex": "$wonder-reuse-generate-output",
            "antigravity": "wonder-reuse.generate-output"
          }
        },
        "promote-asset": {
          "kind": "workflow",
          "surfaces": {
            "claude": "/wonder-reuse:promote-asset",
            "codex": "$wonder-reuse-promote-asset",
            "antigravity": "wonder-reuse.promote-asset"
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
- The `wonder-reuse` registry section can be merged without deleting other plugin entries.
- The current platform is supported.
- Generated surface names match the canonical capability identifiers.
- Starter asset directories contain `asset.json` and `body.md`.
- `.wonder/reuse/index.json` can be generated from asset directories.

## Failure Handling

If `.wonder/state.json` is missing, init creates it.

If `.wonder/state.json` is invalid, init should avoid destructive overwrite. It should preserve the invalid file when possible and report that registry repair is required.

If starter assets already exist, init must not overwrite user content.

If index generation fails, init reports the failure and leaves asset directories unchanged.

## Non-Goals

`wonder-reuse.init` does not:

- Generate user-requested output.
- Promote project artifacts into reusable assets.
- Create a latest report file.
- Modify other Wonder plugin config files.
- Initialize other Wonder plugins.
- Install companion tools.
