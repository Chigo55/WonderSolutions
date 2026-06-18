# wonder-reuse.init Implementation Design

Sources:

- `docs/system-design.md`
- `packages/wonder-reuse/specs/init.md`

## Contract

`wonder-reuse.init` prepares only the `wonder-reuse` runtime area. It registers reuse capabilities, creates reuse config, creates asset directories, seeds minimal starter assets, and refreshes the reuse index.

Inputs:

- project root
- current platform
- optional reuse config values

Writes:

- `.wonder/state.json`
- `.wonder/config/reuse.json` when absent
- `.wonder/reuse/index.json`
- starter assets when absent
- `.wonder/runs/` directory

Must not write latest report files.

## Runtime Files

Ensure:

```text
.wonder/
.wonder/config/
.wonder/reuse/
.wonder/reuse/templates/
.wonder/reuse/snippets/
.wonder/reuse/requests/
.wonder/reuse/patterns/
.wonder/runs/
```

Default `.wonder/config/reuse.json`:

```json
{
  "schemaVersion": 1,
  "autoRefreshIndex": true
}
```

Starter assets:

```text
.wonder/reuse/requests/basic-task/
  asset.json
  body.md

.wonder/reuse/templates/basic-report/
  asset.json
  body.md
```

Starter files are created only when absent.

## Index Shape

`.wonder/reuse/index.json`:

```json
{
  "schemaVersion": 1,
  "generatedAt": "<iso timestamp>",
  "assets": [
    {
      "id": "basic-task",
      "kind": "request",
      "title": "Basic Task",
      "path": ".wonder/reuse/requests/basic-task",
      "tags": [],
      "version": "0.1.0"
    }
  ]
}
```

The index is machine-managed and regenerated from asset directories.

## State Merge

Register:

```text
wonder-reuse.init
wonder-reuse.manage-assets
wonder-reuse.generate-output
wonder-reuse.promote-asset
```

Only current platform is marked initialized.

## Flow

```text
scope
  resolve root and platform

prepare
  create reuse-owned directories
  create reuse config when absent

seed
  create starter assets when absent
  never overwrite existing asset content

index
  scan asset directories
  validate asset.json and body.md
  write index.json

register
  merge wonder-reuse state section

report
  list created paths, starter assets, index status, registered capabilities
```

## Failure Handling

- Invalid state: preserve and request repair.
- Existing starter asset: skip.
- Invalid existing asset: report and skip from index.
- Index write failure: preserve asset directories and report.
- Init run record, if created, is lightweight only.
