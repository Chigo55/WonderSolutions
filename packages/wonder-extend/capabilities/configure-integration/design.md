# wonder-extend.configure-integration Implementation Design

Sources:

- `docs/system-design.md`
- `packages/wonder-extend/specs/configure-integration.md`

## Contract

`wonder-extend.configure-integration` records non-secret integration metadata. It does not install tools, verify remote access by default, detect availability, or manage companion selections.

Required inputs:

- user request
- integration id or goal
- existing `.wonder/extend/integrations.json` when present

Optional inputs:

- `packages/wonder-extend/catalog/integrations.json`
- authentication reference such as environment variable name
- non-secret endpoint/provider metadata
- `.wonder/config/extend.json`

Writes:

- `.wonder/extend/integrations.json`
- `.wonder/runs/<run-id>/`

Must not write:

- `.wonder/extend/capabilities.json`
- secret values

## Run Directory

```text
.wonder/runs/<run-id>/
  run.json
  request.md
  integration-changes.json
  report.md
  artifacts.json
```

`integration-changes.json`:

```json
{
  "added": [],
  "updated": [],
  "disabled": [],
  "removed": []
}
```

## Integration Metadata

Allowed shape:

```json
{
  "schemaVersion": 1,
  "integrations": {
    "github": {
      "enabled": true,
      "auth": {
        "type": "env",
        "envVar": "GITHUB_TOKEN"
      },
      "metadata": {
        "provider": "github"
      }
    }
  }
}
```

Forbidden fields anywhere:

```text
token
password
secret
privateKey
apiKeyValue
credentialValue
```

Secret reference names such as environment variable names may be stored.

## Flow

```text
scope
  resolve target integration and requested action

validate-reference
  reject secret values and obvious secret fields
  use catalog to validate known integration ids when available

change
  add, update, disable, or remove integration metadata
  preserve unrelated integration entries

report
  summarize changes
  confirm no secret value was stored
  recommend detect-capabilities refresh
```

## Validation

- integration id is known or user confirms custom metadata
- enabled state is boolean
- auth uses secret reference, not secret value
- no secret-like value is written to integration metadata or run record

## Failure Handling

- User provides secret: reject and ask for env var or external secret reference.
- Unknown integration: use catalog or ask confirmation.
- Write failure: preserve existing integrations file.
- Disable/remove may affect capabilities: report detection refresh needed.
