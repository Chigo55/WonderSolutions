# wonder-reuse.manage-assets Implementation Design

Sources:

- `docs/system-design.md`
- `packages/wonder-reuse/specs/manage-assets.md`

## Contract

`wonder-reuse.manage-assets` creates, updates, organizes, moves, and explicitly deletes reusable assets. It does not render assets into final output and does not promote ordinary output; promotion belongs to `wonder-reuse.promote-asset`.

Required inputs:

- user request
- `.wonder/reuse/`

Optional inputs:

- asset id
- target asset kind
- metadata values
- asset body
- `.wonder/config/reuse.json`

Writes for changing operations:

- `.wonder/reuse/`
- `.wonder/reuse/index.json`
- `.wonder/runs/<run-id>/`

Read-only list/search/inspect operations do not require a run record.

## Asset Directory

Supported paths:

```text
.wonder/reuse/templates/<asset-id>/
.wonder/reuse/snippets/<asset-id>/
.wonder/reuse/requests/<asset-id>/
.wonder/reuse/patterns/<asset-id>/
```

Required files:

```text
asset.json
body.md
```

Optional:

```text
examples/
```

`asset.json`:

```json
{
  "schemaVersion": 1,
  "id": "<asset-id>",
  "kind": "template",
  "title": "<title>",
  "description": "<description>",
  "variables": {},
  "tags": [],
  "appliesTo": [],
  "version": "0.1.0"
}
```

## Run Directory

For changing operations:

```text
.wonder/runs/<run-id>/
  run.json
  request.md
  asset-changes.json
  report.md
  artifacts.json
```

`asset-changes.json`:

```json
{
  "created": [],
  "updated": [],
  "moved": [],
  "deleted": [],
  "deletionCandidates": []
}
```

## Flow

```text
scope
  classify operation: list, search, create, update, move, organize, delete
  resolve asset kind and id

inspect
  read existing asset directories
  check references when deleting or moving

change
  create/update/move/delete only when operation is changing
  require explicit user request for deletion
  never delete candidates automatically

index
  regenerate index.json from asset directories

report
  summarize asset changes and index status
```

## Validation

- asset id is kebab-case
- kind is `template`, `snippet`, `request`, or `pattern`
- `variables` exists; use `{}` when empty
- `asset.json` and `body.md` exist for each indexed asset
- deletion requires explicit user request
- referenced asset deletion requires explicit confirmation

## Failure Handling

- Asset id conflict: ask before overwrite or choose safe new id.
- Referenced asset deletion: warn and require confirmation.
- Missing/corrupt index: regenerate from directories.
- Index regeneration failure: preserve asset files and report.
