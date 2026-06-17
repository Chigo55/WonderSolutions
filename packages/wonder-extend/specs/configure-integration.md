# wonder-extend.configure-integration

## Purpose

`wonder-extend.configure-integration` records or updates integration connection metadata.

It manages how Wonder should refer to external systems, without storing secret values and without installing external tools.

## User-Facing Behavior

The user asks to configure, update, disable, or inspect an integration.

`configure-integration` records integration references such as provider id, enabled state, authentication method, environment variable names, and non-secret connection metadata.

It must not store tokens, passwords, private keys, or other secret values.

Companion selection is not managed here. Companion recommendation and selection belongs to `wonder-extend.discover-companions`.

## Inputs

Required input:

- User request.
- Integration id or integration goal.
- Existing `.wonder/extend/integrations.json` when present.

Optional input:

- Product catalog from `packages/wonder-extend/catalog/integrations.json`.
- Authentication reference, such as environment variable name.
- Non-secret endpoint or provider metadata.
- `.wonder/config/extend.json`.

## Lifecycle

`wonder-extend.configure-integration` uses this lifecycle:

```text
scope
validate-reference
change
report
```

`scope` determines the target integration and requested change.

`validate-reference` checks that configuration does not include secret values.

`change` records integration metadata in `.wonder/extend/integrations.json`.

`report` summarizes the integration changes and any follow-up detection needed.

## Runtime State

`configure-integration` reads:

```text
packages/wonder-extend/catalog/integrations.json
.wonder/state.json
.wonder/config/extend.json
.wonder/extend/integrations.json
```

It writes:

```text
.wonder/extend/integrations.json
.wonder/runs/<run-id>/
```

It does not write `.wonder/extend/capabilities.json`; capability availability belongs to `wonder-extend.detect-capabilities`.

## Run Records

Integration changes require a run record:

```text
.wonder/runs/<run-id>/
  run.json
  request.md
  integration-changes.json
  report.md
  artifacts.json
```

`integration-changes.json` records added, updated, disabled, or removed integration references.

Secret values must never be written to run records.

Environment variable names or secret reference names may be recorded.

## Reports

`wonder-extend` does not maintain an `extend-latest.json` report.

The user-facing report includes:

- Integration changed.
- Whether it is enabled.
- Authentication reference type.
- Follow-up recommendation to run `wonder-extend.detect-capabilities`.
- Confirmation that no secret value was stored.

## Capability Discovery

Configured integrations are inputs to `wonder-extend.detect-capabilities`.

Other plugins should not assume that a configured integration is available. They should rely on `.wonder/extend/capabilities.json` after detection.

## Validation

Stored integration metadata may include:

```json
{
  "id": "github",
  "enabled": true,
  "auth": {
    "type": "env",
    "envVar": "GITHUB_TOKEN"
  }
}
```

Stored integration metadata must not include:

```json
{
  "token": "secret-value"
}
```

Validation rejects obvious secret fields and secret-like values.

Secret storage belongs to platform, OS, environment, or user-managed secret systems outside `.wonder/`.

## Failure Handling

If the user provides a secret value, do not store it. Ask for a secret reference such as an environment variable name instead.

If an integration id is unknown, use the catalog when available or ask the user to confirm custom integration metadata.

If writing integration metadata fails, report the failure and preserve existing configuration where possible.

If disabling or removing an integration may affect detected capabilities, report that detection should be refreshed.

## Non-Goals

`wonder-extend.configure-integration` does not:

- Store secret values.
- Install external tools.
- Verify remote service access by default.
- Detect actual capability availability.
- Manage companion selection.
- Create `extend-latest.json`.
- Modify other Wonder plugin config files.
