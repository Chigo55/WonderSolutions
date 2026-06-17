# wonder-reuse.manage-assets

## Purpose

`wonder-reuse.manage-assets` creates, updates, organizes, moves, and explicitly deletes reusable assets.

It manages assets that are already intended to be reusable. Turning ordinary project output into a reusable asset belongs to `wonder-reuse.promote-asset`.

## User-Facing Behavior

The user asks to add, update, organize, list, search, move, or delete reusable assets.

Create, update, organize, and move operations are allowed.

Deletion is allowed only when explicitly requested by the user.

Unused or questionable assets may be reported as deletion candidates, but must not be deleted automatically.

## Inputs

Required input:

- User request.
- Current reuse asset directory.

Optional input:

- Asset id or target asset kind.
- Asset metadata values.
- Asset body content.
- `.wonder/config/reuse.json`.

## Lifecycle

`wonder-reuse.manage-assets` uses this lifecycle:

```text
scope
inspect
change
index
report
```

`scope` determines the target asset kind and operation.

`inspect` reads existing assets and checks references when relevant.

`change` creates, updates, moves, or explicitly deletes assets.

`index` refreshes `.wonder/reuse/index.json`.

`report` summarizes the asset changes.

## Runtime State

`manage-assets` reads:

```text
.wonder/state.json
.wonder/config/reuse.json
.wonder/reuse/
```

It writes:

```text
.wonder/reuse/
.wonder/reuse/index.json
.wonder/runs/<run-id>/
```

Asset source of truth is each asset directory's `asset.json`.

`.wonder/reuse/index.json` is a machine-managed cache/registry and may be regenerated from asset directories.

## Run Records

Run records are required only for asset-changing operations.

Changing operations use:

```text
.wonder/runs/<run-id>/
  run.json
  request.md
  asset-changes.json
  report.md
  artifacts.json
```

`asset-changes.json` records:

```text
created
updated
moved
deleted
```

Simple list, search, or read-only inspection operations do not need run records.

## Reports

`wonder-reuse` does not maintain a latest report file.

The user-facing report includes:

- Assets created.
- Assets updated.
- Assets moved.
- Assets explicitly deleted.
- Index refresh status.
- Deletion candidates, if any.

## Capability Discovery

`manage-assets` owns reuse asset maintenance.

Other plugins may read reuse assets and may record references to assets they used, but should not directly modify reuse assets.

When `wonder-build` uses reuse assets internally, it records reuse references inside the build run instead of creating a separate reuse run.

## Validation

Assets live under:

```text
.wonder/reuse/templates/<asset-id>/
.wonder/reuse/snippets/<asset-id>/
.wonder/reuse/requests/<asset-id>/
.wonder/reuse/patterns/<asset-id>/
```

Each asset directory contains:

```text
asset.json
body.md
```

Templates and patterns may also contain:

```text
examples/
```

Required `asset.json` fields:

```text
id
kind
title
description
variables
```

Optional `asset.json` fields:

```text
tags
appliesTo
version
createdFromRunId
starter
```

Supported asset kinds:

```text
template
snippet
request
pattern
```

`variables` is required. Assets without variables use an empty object.

## Failure Handling

If an asset id conflicts with an existing asset, ask before overwriting or choose a new id when safe.

If an asset is referenced by other records, warn before deletion and require explicit confirmation.

If `.wonder/reuse/index.json` is missing or corrupt, regenerate it from asset directories.

If index regeneration fails, report the failure and preserve asset files.

## Non-Goals

`wonder-reuse.manage-assets` does not:

- Render assets into final user output.
- Promote ordinary project output into reusable assets.
- Delete assets without explicit user request.
- Maintain a latest report file.
- Modify other Wonder plugin config files.
