# wonder-reuse.generate-output

## Purpose

`wonder-reuse.generate-output` renders a reusable asset into concrete output.

It selects an asset, resolves required variables, generates output, and optionally writes that output to a file when the target is explicit and safe.

## User-Facing Behavior

The user asks to generate a document, request, report, snippet, or other output from reusable assets.

The user may specify an asset id directly or describe the desired output.

If a single asset is clearly appropriate, it may be used automatically. If multiple candidates are plausible, the user is asked to choose.

Generated output is returned to the user by default. It is written to a file only when a target path is explicit or safely agreed.

## Inputs

Required input:

- User request.
- Reuse assets.

Optional input:

- Asset id.
- Target asset kind.
- Purpose or task context.
- Variable values.
- Target output path.
- `.wonder/config/reuse.json`.

## Lifecycle

`wonder-reuse.generate-output` uses this lifecycle:

```text
scope
select
resolve-variables
render
deliver
report
```

`scope` determines the requested output and target constraints.

`select` chooses an asset by id or by matching tags, `appliesTo`, description, and variables.

`resolve-variables` fills required and optional variables.

`render` produces concrete output from `body.md`.

`deliver` returns output to the user or writes it to an agreed file.

`report` records what was generated and which asset was used.

## Runtime State

`generate-output` reads:

```text
.wonder/state.json
.wonder/config/reuse.json
.wonder/reuse/index.json
.wonder/reuse/
```

It writes:

```text
.wonder/runs/<run-id>/
```

It may write a project file only when the target path is explicit or the user confirms the write.

It may regenerate `.wonder/reuse/index.json` if the index is missing or stale. Regeneration must be based on asset directories and must not modify asset source files.

## Run Records

Direct user calls to `generate-output` require a run record:

```text
.wonder/runs/<run-id>/
  run.json
  request.md
  selected-asset.json
  variables.json
  output.md
  report.md
  artifacts.json
```

`selected-asset.json` records the asset id, kind, and version or metadata snapshot used for rendering.

`variables.json` records the variable values used.

`output.md` records the generated output.

`artifacts.json` records file paths written, if any.

When another plugin such as `wonder-build` uses reuse assets internally, no separate `generate-output` run is created. The caller records embedded reuse references in its own run.

## Reports

`wonder-reuse` does not maintain a latest report file.

The user-facing report includes:

- Selected asset.
- Variable values used or inferred.
- Output delivery mode.
- Written file path, if any.
- Any unresolved optional values.

## Capability Discovery

`generate-output` can be used directly by the user or discovered by other plugins.

Other plugins may use reuse assets for request forms and reports. They should record asset references in their own run records rather than creating nested reuse runs.

## Validation

Asset selection supports both direct and purpose-based flows:

```text
asset id specified
  use that asset

purpose specified
  match tags, appliesTo, description, and variables
  use one clear candidate
  ask when candidates are ambiguous
```

Required variables must be resolved before rendering.

If a required variable can be confidently inferred from request or context, it may be filled automatically.

If inference is uncertain or multiple values are possible, ask the user.

Optional variables use defaults when available. Otherwise they may be blank or omitted.

File writing rules:

```text
target file absent
  write is allowed when path is explicit

target file exists
  explicit user confirmation is required before overwrite

section insertion
  allowed only when insertion location is clear
  ask when unclear
```

## Failure Handling

If no matching asset exists, report that no suitable asset was found and suggest creating one with `wonder-reuse.manage-assets` or `wonder-reuse.promote-asset`.

If multiple assets match and no clear best candidate exists, ask the user to choose.

If required variables cannot be resolved, ask for the missing values.

If output file writing would overwrite existing content without explicit confirmation, stop and ask.

If `.wonder/reuse/index.json` is missing or stale, regenerate it from asset directories.

## Non-Goals

`wonder-reuse.generate-output` does not:

- Modify asset definitions.
- Promote generated output into a reusable asset.
- Overwrite existing files without explicit confirmation.
- Maintain a latest report file.
- Modify other Wonder plugin config files.
