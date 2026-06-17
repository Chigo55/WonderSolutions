# wonder-reuse.promote-asset

## Purpose

`wonder-reuse.promote-asset` turns existing content or repeated output into a reusable asset.

It abstracts concrete content into a template, snippet, request, or pattern by separating fixed content from variables.

## User-Facing Behavior

The user asks to save existing output as a reusable asset.

Examples:

- Promote this document to a template.
- Save this review phrase as a snippet.
- Turn this repeated process into a pattern.
- Save this task prompt as a request form.

By default, `promote-asset` proposes a draft asset and asks for confirmation before saving. If the user explicitly asks to save immediately, it may save after validating the asset.

## Inputs

Required input:

- Source content.
- Target kind: `template`, `snippet`, `request`, or `pattern`.
- Intended reuse context.

Optional input:

- Variables to abstract.
- Suggested asset id.
- Suggested title, description, or tags.
- Source run id.
- `.wonder/config/reuse.json`.

## Lifecycle

`wonder-reuse.promote-asset` uses this lifecycle:

```text
scope
analyze
abstract
propose
confirm
save
report
```

`scope` determines the target kind and reuse context.

`analyze` reads the source content and identifies reusable structure.

`abstract` separates fixed content from variable content.

`propose` creates draft `asset.json` and `body.md`.

`confirm` asks the user before saving unless immediate save was explicitly requested.

`save` writes the asset and refreshes the index.

`report` summarizes the created asset and abstraction decisions.

## Runtime State

`promote-asset` reads:

```text
.wonder/state.json
.wonder/config/reuse.json
.wonder/reuse/
```

It writes:

```text
.wonder/reuse/<kind>/<asset-id>/
.wonder/reuse/index.json
.wonder/runs/<run-id>/
```

It may read source content from an existing run, user-provided text, or project files.

## Run Records

One promote request creates one run:

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

`source.md` records the input content being promoted.

`abstraction.md` explains which parts became variables and which parts stayed fixed.

`proposed-asset.json` records the draft metadata.

`proposed-body.md` records the draft reusable body.

`artifacts.json` records the final saved asset path when saved.

## Reports

`wonder-reuse` does not maintain a latest report file.

The user-facing report includes:

- Target asset kind.
- Proposed or saved asset id.
- Variables abstracted.
- Fixed structure retained.
- Final asset path, if saved.
- Whether user confirmation was required.

## Capability Discovery

`promote-asset` may use context from other plugin runs as source content when the user requests it.

If a source run came from `wonder-build`, the promoted asset may record `createdFromRunId` in `asset.json`.

Other plugins may recommend promotion when repeated outputs are detected, but promotion itself belongs to `wonder-reuse.promote-asset`.

## Validation

Promoted assets use the standard asset directory structure:

```text
.wonder/reuse/<kind>/<asset-id>/
  asset.json
  body.md
```

Templates and patterns may include:

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

The target kind must be one of:

```text
template
snippet
request
pattern
```

The draft should avoid being too specific to a single use case unless the user explicitly wants a narrow asset.

The draft should avoid being so abstract that it no longer provides useful structure.

## Failure Handling

If source content is missing, ask for the source content or source run.

If target kind is missing, ask which asset kind to create.

If variable abstraction is ambiguous, propose a draft and ask for confirmation.

If the generated asset id conflicts with an existing asset, ask before overwriting or choose a new id when safe.

If the user declines the proposed draft, keep the run record but do not save the asset.

If saving fails, report the failure and preserve the proposed draft in the run record.

## Non-Goals

`wonder-reuse.promote-asset` does not:

- Render final output for immediate use.
- Manage existing assets unrelated to the promotion.
- Save a draft without confirmation unless explicitly requested.
- Overwrite existing assets without confirmation.
- Maintain a latest report file.
- Modify other Wonder plugin config files.
