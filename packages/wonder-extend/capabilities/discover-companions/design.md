# wonder-extend.discover-companions Implementation Design

Sources:

- `docs/system-design.md`
- `packages/wonder-extend/specs/discover-companions.md`

## Contract

`wonder-extend.discover-companions` recommends companion tools. It distinguishes recommendations from actual availability. Actual availability is owned by `wonder-extend.detect-capabilities`.

Required inputs:

- user request
- current platform
- `packages/wonder-extend/catalog/companions.json`

Optional inputs:

- project context
- user goal
- `.wonder/extend/companions.json`
- `.wonder/extend/capabilities.json`

May write only when the user asks to save selections or refresh snapshot:

- `.wonder/extend/companions.json`
- `.wonder/runs/<run-id>/`

Must not install tools or imply availability.

## Run Directory

State-changing discovery:

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

Read-only recommendation display does not require a run record.

## Flow

```text
scope
  determine user goal and current platform

inspect-context
  inspect project signals relevant to companion fit
  read existing companion snapshot
  read detected capabilities only as availability evidence

recommend
  rank catalog candidates
  explain relevance, platform fit, and required user action
  mark whether each candidate is recommended only or already detected available

optionally-save
  write companions.json only when user asks to save selections or refresh snapshot
  record selection changes

report
  present recommendations and next steps
```

## Recommendation Entry

```json
{
  "id": "<companion-id>",
  "rank": 1,
  "fit": "high",
  "reason": "<why it helps>",
  "platforms": ["claude", "codex", "antigravity"],
  "availability": "recommended-only",
  "nextAction": "run wonder-extend.detect-capabilities"
}
```

## Validation

- catalog entries distinguish companion purpose from integration config
- saved selections do not set `available: true`
- saved selections do not imply installation
- no secret values are written

## Failure Handling

- Limited context: produce conservative recommendations and mark assumptions.
- Missing/invalid catalog: report inability to recommend reliably.
- Equal candidates: show tradeoffs.
- Save failure: preserve existing snapshots and report path.
