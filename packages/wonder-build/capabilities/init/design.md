# wonder-build.init Implementation Design

Sources:

- `docs/system-design.md`
- `packages/wonder-build/specs/init.md`

## Contract

`wonder-build.init` prepares only the `wonder-build` runtime area. It must not run create, modify, or review work, and must not initialize other Wonder plugins.

Inputs:

- `projectRoot: string`
- `platform: "claude" | "codex" | "antigravity"`
- optional user config values for `.wonder/config/build.json`

Writes:

- `.wonder/state.json`
- `.wonder/config/build.json` when absent
- `.wonder/runs/` directory

Must not write:

- `.wonder/reports/build-latest.json`
- other plugin config files

## Runtime Files

Directory creation order:

```text
.wonder/
.wonder/config/
.wonder/runs/
```

Default `.wonder/config/build.json`:

```json
{
  "schemaVersion": 1,
  "validationCommands": [],
  "companionReadOnlyOptIn": false
}
```

Existing `build.json` is never overwritten. If optional config values are supplied and the file exists, report that the existing user-editable file was preserved.

## State Merge

Use the shared state merge helper:

```ts
initPluginState({
  packageId: "wonder-build",
  platform,
  capabilities: ["init", "create", "modify", "review"]
})
```

The merge must:

- preserve unknown plugin sections
- update only `plugins["wonder-build"]`
- register all `wonder-build` capability surfaces for all platforms
- set only `platforms[platform].initialized = true`
- leave other platform initialized flags unchanged when present

Surface mapping:

```json
{
  "init": {
    "claude": "/wonder-build:init",
    "codex": "$wonder-build-init",
    "antigravity": "wonder-build.init"
  },
  "create": {
    "claude": "/wonder-build:create",
    "codex": "$wonder-build-create",
    "antigravity": "wonder-build.create"
  },
  "modify": {
    "claude": "/wonder-build:modify",
    "codex": "$wonder-build-modify",
    "antigravity": "wonder-build.modify"
  },
  "review": {
    "claude": "/wonder-build:review",
    "codex": "$wonder-build-review",
    "antigravity": "wonder-build.review"
  }
}
```

## Flow

```text
scope
  resolve project root
  resolve current platform
  reject unsupported platform

prepare
  ensure .wonder/
  ensure .wonder/config/
  ensure .wonder/runs/
  create build.json only when absent

register
  read state.json if present
  fail without overwrite if state JSON is invalid
  merge wonder-build capability registry
  atomic write state.json

report
  return created paths
  return existing paths reused
  return registered capability ids
  return current platform initialized state
```

## Validation

Before writing:

- project root exists
- platform is supported
- existing `.wonder/state.json` is valid JSON when present
- existing `.wonder/config/build.json` is valid JSON when present

After writing:

- `.wonder/state.json` contains `wonder-build`
- all build surfaces match canonical ids
- only the current platform is newly marked initialized

## Failure Handling

- Missing `.wonder/state.json`: create it.
- Invalid `.wonder/state.json`: stop and report registry repair required.
- Config creation failure: leave existing files unchanged where possible and report path.
- Partial directory creation: report created paths and failed path.
- Init runs are not full build run records.
