# wonder-reuse.generate-output Implementation Design

Sources:

- `docs/system-design.md`
- `packages/wonder-reuse/specs/generate-output.md`

## Contract

`wonder-reuse.generate-output` renders a reuse asset into concrete output. It returns output to the user by default and writes files only when the target path is explicit or confirmed.

Required inputs:

- user request
- reuse assets

Optional inputs:

- asset id
- asset kind
- purpose or task context
- variable values
- target output path
- `.wonder/config/reuse.json`

Writes:

- `.wonder/runs/<run-id>/` for direct user calls
- target project file only when explicit or confirmed
- `.wonder/reuse/index.json` only when regenerating missing/stale index

Must not modify asset source files.

## Run Directory

Direct user call:

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

`selected-asset.json`:

```json
{
  "id": "<asset-id>",
  "kind": "template",
  "path": ".wonder/reuse/templates/<asset-id>",
  "version": "0.1.0"
}
```

`variables.json` records final values used for rendering.

## Flow

```text
scope
  determine requested output and file writing constraints

select
  use explicit asset id when provided
  otherwise match tags, appliesTo, description, and variables
  ask user when multiple plausible candidates exist

resolve-variables
  fill provided values
  infer safe values from request/context
  ask for required uncertain values
  apply defaults for optional values

render
  render body.md with resolved variables
  write output.md in run directory

deliver
  return output to user
  write target file only when explicit or confirmed

report
  record selected asset, variables, delivery mode, and written paths
```

## Rendering Rules

1차 renderer uses simple variable replacement:

```text
{{variableName}}
```

Rules:

- missing required variable blocks render
- optional missing variable renders default or empty string
- unknown variables in body are validation warnings
- rendered output uses LF line endings

## File Writing Rules

```text
target absent + explicit path
  write allowed

target exists
  require explicit overwrite confirmation

section insertion
  allowed only when insertion point is clear
```

## Caller Integration

When another plugin uses reuse assets internally, no separate `generate-output` run is created. The caller records reuse asset references in its own run.

## Failure Handling

- No matching asset: suggest `manage-assets` or `promote-asset`.
- Ambiguous asset match: ask user.
- Missing required variables: ask user.
- Unsafe overwrite: stop and ask.
- Missing/stale index: regenerate from asset directories without modifying assets.
