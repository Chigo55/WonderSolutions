# wonder-reuse.promote-asset Implementation Design

Sources:

- `docs/system-design.md`
- `packages/wonder-reuse/specs/promote-asset.md`

## Contract

`wonder-reuse.promote-asset` turns existing content into a reusable asset by separating fixed structure from variables. It proposes a draft and asks for confirmation before saving unless the user explicitly requested immediate save.

Required inputs:

- source content
- target kind: `template`, `snippet`, `request`, or `pattern`
- intended reuse context

Optional inputs:

- variables to abstract
- suggested id/title/description/tags
- source run id
- `.wonder/config/reuse.json`

Writes:

- `.wonder/reuse/<kind>/<asset-id>/`
- `.wonder/reuse/index.json`
- `.wonder/runs/<run-id>/`

## Run Directory

```text
.wonder/runs/<run-id>/
  run.json
  request.md
  source.md
  abstraction.md
  proposed-asset.json
  proposed-body.md
  report.md
  artifacts.json
```

`abstraction.md` explains:

- fixed content retained
- variables extracted
- why the target kind fits
- assumptions and ambiguities

## Flow

```text
scope
  resolve target kind and reuse context
  find source content from request, run id, or project file

analyze
  identify repeated structure and context-specific values

abstract
  convert context-specific values into variables
  keep useful fixed structure
  avoid over-specific or over-abstract draft

propose
  write proposed-asset.json
  write proposed-body.md
  report draft summary to user

confirm
  ask before saving unless user explicitly requested immediate save

save
  create asset directory
  write asset.json and body.md
  refresh index.json

report
  summarize saved path, variables, and confirmation status
```

## Asset Shape

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
  "version": "0.1.0",
  "createdFromRunId": "<optional run id>"
}
```

`createdFromRunId` is written only when source content came from an existing run.

## Validation

- target kind is supported
- source content exists
- asset id is kebab-case
- `asset.json` has required fields
- `body.md` is non-empty
- conflicting asset id requires confirmation
- immediate save requires explicit user instruction

## Failure Handling

- Missing source: ask for content or run id.
- Missing target kind: ask.
- Ambiguous abstraction: propose draft and ask.
- Asset id conflict: ask before overwrite or choose safe new id.
- User declines draft: keep run record, do not save asset.
- Save failure: preserve proposed draft in run directory.
