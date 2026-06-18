# wonder-govern.init Implementation Design

Sources:

- `docs/system-design.md`
- `packages/wonder-govern/specs/init.md`

## Contract

`wonder-govern.init` prepares only the `wonder-govern` runtime area. It registers govern capabilities, creates govern config, and creates minimal starter standards when absent.

Inputs:

- `projectRoot`
- current platform
- optional govern config values

Writes:

- `.wonder/state.json`
- `.wonder/config/govern.json` when absent
- `.wonder/standards/*.md` starter files when absent
- `.wonder/runs/` directory

Must not write:

- `.wonder/reports/govern-latest.json`
- other plugin config files

## Runtime Files

Ensure:

```text
.wonder/
.wonder/config/
.wonder/standards/
.wonder/runs/
```

Default `.wonder/config/govern.json`:

```json
{
  "schemaVersion": 1,
  "autoRunPolicyCheckAfterStandardsChange": false
}
```

Starter files:

```text
.wonder/standards/coding.md
.wonder/standards/architecture.md
.wonder/standards/security.md
.wonder/standards/docs.md
```

Starter files must contain minimal placeholder content and must never overwrite existing user content.

## State Merge

Register:

```text
wonder-govern.init
wonder-govern.define-standards
wonder-govern.check-policy
```

Set only the current platform initialized flag to `true`.

Surface mapping:

```json
{
  "init": {
    "claude": "/wonder-govern:init",
    "codex": "$wonder-govern-init",
    "antigravity": "wonder-govern.init"
  },
  "define-standards": {
    "claude": "/wonder-govern:define-standards",
    "codex": "$wonder-govern-define-standards",
    "antigravity": "wonder-govern.define-standards"
  },
  "check-policy": {
    "claude": "/wonder-govern:check-policy",
    "codex": "$wonder-govern-check-policy",
    "antigravity": "wonder-govern.check-policy"
  }
}
```

## Flow

```text
scope
  resolve root and platform

prepare
  ensure govern-owned directories
  create govern config when absent
  create starter standards when absent

register
  read and validate state
  merge only wonder-govern section
  atomic write state

report
  list created paths
  list existing paths reused
  list registered capabilities
  list current platform initialized state
```

## Validation

- platform is supported
- existing state is valid JSON
- starter standard filenames are kebab-case Markdown names
- generated surfaces match canonical ids
- existing standards are preserved

## Failure Handling

- Invalid state: preserve file and report repair required.
- Starter file exists: skip it.
- Starter file write failure: report path and leave existing files unchanged.
- Init run record, if created, must be lightweight and not treated as govern workflow run.
