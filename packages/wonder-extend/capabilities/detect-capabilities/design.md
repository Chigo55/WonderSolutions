# wonder-extend.detect-capabilities Implementation Design

Sources:

- `docs/system-design.md`
- `packages/wonder-extend/specs/detect-capabilities.md`

## Contract

`wonder-extend.detect-capabilities` determines currently available external capabilities and writes `.wonder/extend/capabilities.json`. Detection is local/configuration-based by default. Remote checks require explicit user consent.

Required inputs:

- user request
- current platform
- `.wonder/extend/companions.json`
- `.wonder/extend/integrations.json`

Optional inputs:

- product catalog
- consent for remote checks
- environment variable presence
- CLI/tool availability
- platform registry state
- `.wonder/config/extend.json`

Writes:

- `.wonder/extend/capabilities.json`
- `.wonder/runs/<run-id>/`

Must not:

- install tools
- configure integrations
- store secret values
- perform remote checks without consent

## Run Directory

```text
.wonder/runs/<run-id>/
  run.json
  request.md
  detection-plan.md
  detection-results.json
  report.md
  artifacts.json
```

`artifacts.json` records `.wonder/extend/capabilities.json` as updated.

## Capabilities File

```json
{
  "schemaVersion": 1,
  "generatedAt": "<iso timestamp>",
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
      "lastCheckedAt": "<iso timestamp>"
    }
  }
}
```

Capability id format:

```text
provider.resource.action
```

Confidence:

```text
high
medium
low
```

## Flow

```text
scope
  determine providers or capability groups to check

plan-detection
  build local check list
  build remote check list only when user consent exists
  write detection-plan.md

detect-local
  inspect integration config
  inspect companion snapshot
  inspect env var presence by name only
  inspect CLI/tool presence when safe
  inspect platform registry state

optionally-detect-remote
  run remote checks only with explicit consent
  record skipped remote checks otherwise

write-status
  write capabilities.json atomically
  write detection-results.json

report
  summarize available/unavailable capabilities, confidence, evidence, skipped checks
```

## Usage Rules For Other Plugins

Other plugins may use an extend capability only when:

- `available === true`
- `confidence` is `medium` or `high`
- the user explicitly consents, or the capability is read-only and read-only opt-in is enabled in caller config

Write capabilities always require explicit user consent.

## Validation

- capability ids match `provider.resource.action`
- confidence is recognized
- `remoteChecked` is boolean
- evidence contains no secret values
- environment variable values are never written, only names/presence

## Failure Handling

- Cannot verify: mark unavailable or low confidence.
- Remote consent absent: skip and record `remoteChecked: false`.
- Missing env var: record missing evidence without exposing value.
- Invalid integrations file: report and avoid misleading availability.
- Write failure: preserve previous status where possible and report path.
