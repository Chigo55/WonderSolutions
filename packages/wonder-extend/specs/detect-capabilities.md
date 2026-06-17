# wonder-extend.detect-capabilities

## Purpose

`wonder-extend.detect-capabilities` determines which external capabilities are currently available to the project.

It updates `.wonder/extend/capabilities.json`, which is the current extend status file read by other Wonder plugins.

## User-Facing Behavior

The user asks to detect available external capabilities.

Detection is local and configuration-based by default. Remote checks require explicit user consent.

`detect-capabilities` reports what appears available, how confident the result is, and what evidence supports the result.

It must not install external tools.

## Inputs

Required input:

- User request.
- Current platform identity.
- Existing `.wonder/extend/companions.json`.
- Existing `.wonder/extend/integrations.json`.

Optional input:

- Product catalog.
- User consent for remote checks.
- Environment variable presence.
- CLI/tool availability.
- Platform registry state.
- `.wonder/config/extend.json`.

## Lifecycle

`wonder-extend.detect-capabilities` uses this lifecycle:

```text
scope
plan-detection
detect-local
optionally-detect-remote
write-status
report
```

`scope` determines which providers or capability groups to check.

`plan-detection` records local and remote checks to perform.

`detect-local` checks installed plugins, configuration, environment variable presence, CLI/tool availability, and platform registry state.

`optionally-detect-remote` performs external checks only after explicit user consent.

`write-status` updates `.wonder/extend/capabilities.json`.

`report` summarizes availability, confidence, evidence, and skipped checks.

## Runtime State

`detect-capabilities` reads:

```text
.wonder/state.json
.wonder/config/extend.json
.wonder/extend/companions.json
.wonder/extend/integrations.json
```

It writes:

```text
.wonder/extend/capabilities.json
.wonder/runs/<run-id>/
```

`.wonder/extend/capabilities.json` is the current detected capability status. There is no `extend-latest.json`.

## Run Records

Every detection run requires a run record:

```text
.wonder/runs/<run-id>/
  run.json
  request.md
  detection-plan.md
  detection-results.json
  report.md
  artifacts.json
```

`detection-plan.md` records whether detection was local-only or included remote checks, which providers were checked, and what consent was granted.

`detection-results.json` records machine-readable detection results.

`artifacts.json` records `.wonder/extend/capabilities.json` as an updated artifact.

## Reports

`wonder-extend` does not maintain an `extend-latest.json` report.

The user-facing report includes:

- Capabilities detected as available.
- Capabilities detected as unavailable.
- Confidence level.
- Evidence.
- Whether remote checks were skipped or performed.
- Required user action, if any.

## Capability Discovery

Other Wonder plugins read `.wonder/extend/capabilities.json` to decide whether external capabilities may be used.

Capability ids use this format:

```text
provider.resource.action
```

Examples:

```text
github.pr.read
github.issue.write
security.scan.run
docs.lookup.read
review.assistant.suggest
```

Detected capability entries include:

```text
available
source
confidence
evidence
remoteChecked
lastCheckedAt
```

Example:

```json
{
  "generatedAt": "<timestamp>",
  "capabilities": {
    "github.pr.read": {
      "available": true,
      "source": "integration",
      "confidence": "high",
      "evidence": [
        "integration github enabled",
        "env var GITHUB_TOKEN is present"
      ],
      "remoteChecked": false,
      "lastCheckedAt": "<timestamp>"
    }
  }
}
```

Other plugins may use an extend capability only when:

- `available` is `true`.
- `confidence` is `medium` or `high`.
- The user explicitly consents, or the capability is read-only and read-only companion opt-in is enabled in the caller's config.

Write capabilities always require explicit user consent.

## Validation

Default detection is limited to local or configuration-based evidence:

- Installed plugin lists.
- Integration config presence.
- Environment variable presence.
- CLI command presence.
- Platform registry state.

Remote detection requires explicit user consent:

- External API health checks.
- Marketplace lookups.
- Remote service capability checks.

Confidence values:

```text
high
medium
low
```

Detection must not store secret values in `.wonder/extend/capabilities.json` or run records.

## Failure Handling

If detection cannot verify a capability, mark it unavailable or low confidence instead of overstating availability.

If remote consent is not granted, skip remote checks and record `remoteChecked: false`.

If an environment variable is expected but missing, record that evidence without exposing any secret value.

If `.wonder/extend/integrations.json` is invalid, report the issue and avoid producing misleading availability.

If writing `capabilities.json` fails, preserve the previous status file when possible and report the failure.

## Non-Goals

`wonder-extend.detect-capabilities` does not:

- Install external tools.
- Configure integrations.
- Recommend companion choices.
- Store secret values.
- Perform remote checks without consent.
- Create `extend-latest.json`.
