# wonder-extend.init Implementation Design

Sources:

- `docs/system-design.md`
- `packages/wonder-extend/specs/init.md`

## Contract

`wonder-extend.init` prepares only the `wonder-extend` runtime area. It registers extend capabilities, creates extend config, creates inactive runtime snapshots from product catalogs, and must not enable, install, configure, or remotely check anything.

Inputs:

- project root
- current platform
- product catalogs from `packages/wonder-extend/catalog/`
- optional extend config values

Writes:

- `.wonder/state.json`
- `.wonder/config/extend.json` when absent
- `.wonder/extend/companions.json` when absent
- `.wonder/extend/integrations.json` when absent
- `.wonder/extend/capabilities.json` when absent
- `.wonder/runs/` directory

Must not write:

- secret values
- `extend-latest.json`
- other plugin config files

## Runtime Snapshots

Default `.wonder/config/extend.json`:

```json
{
  "schemaVersion": 1,
  "allowRemoteChecksByDefault": false
}
```

`.wonder/extend/companions.json` is seeded from catalog with inactive entries:

```json
{
  "schemaVersion": 1,
  "companions": [
    {
      "id": "<companion-id>",
      "enabled": false,
      "source": "catalog"
    }
  ]
}
```

`.wonder/extend/integrations.json` starts empty or disabled.

`.wonder/extend/capabilities.json` starts with no available capabilities.

Existing runtime snapshots are not overwritten.

## State Merge

Register:

```text
wonder-extend.init
wonder-extend.discover-companions
wonder-extend.configure-integration
wonder-extend.detect-capabilities
```

Only current platform is marked initialized.

## Flow

```text
scope
  resolve root and platform
  read product catalogs

prepare
  create extend-owned directories and config

seed
  create runtime snapshots only when absent
  mark companions disabled
  leave capabilities empty

register
  merge wonder-extend state section

report
  summarize created paths, snapshots, registered capabilities, platform state
```

## Validation

- catalogs can be read
- current platform is supported
- existing state is valid JSON
- snapshots do not contain secret-like fields
- generated surfaces match canonical ids

## Failure Handling

- Missing/invalid catalog: report and do not create misleading snapshots.
- Existing snapshots: preserve user choices.
- Invalid state: preserve and request repair.
- Secret-like catalog value: reject snapshot creation and report path.
