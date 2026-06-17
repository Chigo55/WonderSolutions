# wonder-extend.discover-companions

## Purpose

`wonder-extend.discover-companions` recommends companion tools for the current project, platform, and user goal.

It distinguishes possible companion choices from actually available capabilities. Actual availability is determined by `wonder-extend.detect-capabilities`.

## User-Facing Behavior

The user asks what companion tools or extensions could help with a task.

`discover-companions` combines:

- The product catalog.
- Current project context.
- Current platform.
- User goal.

It may show recommendations without changing project state. If the user chooses to save companion selections or refresh the runtime companion snapshot, it updates `.wonder/extend/companions.json`.

It must not install external tools.

## Inputs

Required input:

- User request.
- Current platform identity.
- Product catalog from `packages/wonder-extend/catalog/companions.json`.

Optional input:

- Project context.
- User goal.
- Existing `.wonder/extend/companions.json`.
- Existing `.wonder/extend/capabilities.json`.

## Lifecycle

`wonder-extend.discover-companions` uses this lifecycle:

```text
scope
inspect-context
recommend
optionally-save
report
```

`scope` determines the user goal and current platform.

`inspect-context` gathers project signals that affect recommendations.

`recommend` ranks companion candidates and explains why they may help.

`optionally-save` updates `.wonder/extend/companions.json` only when the user asks to save selections or refresh the snapshot.

`report` summarizes recommendations and next steps.

## Runtime State

`discover-companions` reads:

```text
packages/wonder-extend/catalog/companions.json
.wonder/state.json
.wonder/config/extend.json
.wonder/extend/companions.json
.wonder/extend/capabilities.json
```

It may write:

```text
.wonder/extend/companions.json
.wonder/runs/<run-id>/
```

It writes only when saving selections or refreshing the runtime companion snapshot.

## Run Records

Run records are required only when project state changes.

State-changing discovery uses:

```text
.wonder/runs/<run-id>/
  run.json
  request.md
  recommendation-context.md
  companion-recommendations.json
  selection-changes.json
  report.md
  artifacts.json
```

`recommendation-context.md` records the project context, current platform, and user goal.

`companion-recommendations.json` records candidates and recommendation reasons.

`selection-changes.json` records saved companion selection or snapshot changes.

Simple recommendation display does not require a run record.

## Reports

`wonder-extend` does not maintain an `extend-latest.json` report.

The user-facing report includes:

- Recommended companions.
- Why each companion is relevant.
- Current platform fit.
- Whether the companion is only recommended or already detected as available.
- Required user action, if any.

## Capability Discovery

Companion discovery feeds later capability detection.

Other plugins should not treat recommendations as usable capabilities. They should read `.wonder/extend/capabilities.json` for actual availability.

## Validation

Catalog companion entries must distinguish companion purpose from integration configuration.

`companion` means an external tool, plugin, or agent-like aid that strengthens AI coding workflow capability.

`integration` means a connection path to an external system or service.

`discover-companions` validates that saved companion selections do not imply installation or availability.

## Failure Handling

If project context is limited, produce conservative recommendations and mark assumptions.

If the catalog is missing or invalid, report that recommendations cannot be produced reliably.

If multiple companions fit equally well, present the tradeoffs instead of choosing silently.

If saving selections fails, report the failure and preserve existing runtime snapshots.

## Non-Goals

`wonder-extend.discover-companions` does not:

- Install companion tools.
- Configure integrations.
- Detect actual capability availability.
- Store secrets.
- Create `extend-latest.json`.
- Make other Wonder plugins depend on companions.
