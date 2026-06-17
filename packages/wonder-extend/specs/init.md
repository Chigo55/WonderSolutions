# wonder-extend.init

## Purpose

`wonder-extend.init` prepares a project to use the `wonder-extend` plugin.

It registers extend capabilities, creates extend-owned configuration, creates runtime snapshot files, and seeds inactive companion and integration state from the product catalog.

`wonder-extend.init` must not require any other Wonder plugin.

## User-Facing Behavior

The user explicitly runs the init capability from the current platform.

Installation alone must not modify project files.

On success, the project can use these extend capabilities:

- `wonder-extend.discover-companions`
- `wonder-extend.configure-integration`
- `wonder-extend.detect-capabilities`

Init must not enable companions, configure integrations, perform remote checks, or install external tools.

## Inputs

Required input:

- Current project root.
- Current platform identity.
- Product catalog from `packages/wonder-extend/catalog/`.

Optional input:

- User-provided extend configuration values.

If optional values are absent, init uses conservative defaults.

## Lifecycle

`wonder-extend.init` uses this lifecycle:

```text
scope
prepare
seed
register
report
```

`scope` determines the project root and current platform.

`prepare` ensures extend-owned runtime paths exist.

`seed` creates inactive runtime snapshots from the product catalog.

`register` creates or merges extend capability entries in `.wonder/state.json`.

`report` summarizes the resulting state.

## Runtime State

`wonder-extend.init` reads:

```text
packages/wonder-extend/catalog/
  companions.json
  integrations.json
```

It creates or ensures:

```text
.wonder/
  state.json
  config/
    extend.json
  extend/
    companions.json
    integrations.json
    capabilities.json
  runs/
```

Runtime snapshots:

- `.wonder/extend/companions.json` lists known companion candidates with `enabled: false`.
- `.wonder/extend/integrations.json` is empty or disabled by default.
- `.wonder/extend/capabilities.json` is empty until detection runs.

`.wonder/config/extend.json` is user-editable. Init may create it when absent, but should avoid overwriting user edits.

## Run Records

Init does not require a full extend run record.

If the implementation records init runs, the record must be lightweight and must not be treated as a `wonder-extend.discover-companions`, `wonder-extend.configure-integration`, or `wonder-extend.detect-capabilities` run.

## Reports

`wonder-extend` does not maintain an `extend-latest.json` report.

The init command reports directly to the user and may include:

- Created paths.
- Existing paths reused.
- Runtime snapshots created.
- Registered capabilities.
- Current platform initialized state.

## Capability Discovery

Init registers all `wonder-extend` capability surfaces in `.wonder/state.json`.

Surface names for all supported platforms are recorded, but only the platform running init is marked initialized.

Example:

```json
{
  "plugins": {
    "wonder-extend": {
      "capabilities": {
        "discover-companions": {
          "kind": "workflow",
          "surfaces": {
            "claude": "/wonder-extend:discover-companions",
            "codex": "$wonder-extend-discover-companions",
            "antigravity": "wonder-extend.discover-companions"
          }
        },
        "configure-integration": {
          "kind": "workflow",
          "surfaces": {
            "claude": "/wonder-extend:configure-integration",
            "codex": "$wonder-extend-configure-integration",
            "antigravity": "wonder-extend.configure-integration"
          }
        },
        "detect-capabilities": {
          "kind": "workflow",
          "surfaces": {
            "claude": "/wonder-extend:detect-capabilities",
            "codex": "$wonder-extend-detect-capabilities",
            "antigravity": "wonder-extend.detect-capabilities"
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
- The `wonder-extend` registry section can be merged without deleting other plugin entries.
- The current platform is supported.
- Generated surface names match the canonical capability identifiers.
- Catalog files can be read.
- Runtime snapshot files do not contain secrets.

## Failure Handling

If `.wonder/state.json` is missing, init creates it.

If `.wonder/state.json` is invalid, init should avoid destructive overwrite. It should preserve the invalid file when possible and report that registry repair is required.

If catalog files cannot be read, init reports the failure and does not create misleading snapshots.

If runtime snapshots already exist, init must not overwrite user choices or existing integration references.

## Non-Goals

`wonder-extend.init` does not:

- Install external tools.
- Enable companion tools.
- Configure integrations.
- Perform remote checks.
- Store secrets.
- Create `extend-latest.json`.
- Initialize other Wonder plugins.
