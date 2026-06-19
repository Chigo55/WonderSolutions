---
name: wonder-extend-init
description: Prepare project-local runtime state for Wonder Extend capabilities.
---

# Initialize Extend

Prepare the current project to use Wonder Extend capabilities.

## Procedure

scope

- Resolve the current project root.
- Resolve the current execution surface.
- Read product catalog files from `packages/wonder-extend/catalog/companions.json` and `packages/wonder-extend/catalog/integrations.json`.
- Reject missing, invalid, or secret-like catalog values before writing runtime snapshots.

prepare

- Ensure `.wonder/` exists.
- Ensure `.wonder/config/` exists.
- Ensure `.wonder/extend/` exists.
- Ensure `.wonder/runs/` exists.
- Create `.wonder/config/extend.json` only when absent.

seed

- Create `.wonder/extend/companions.json` only when absent.
- Seed companion candidates with `enabled: false` and `source: "catalog"`.
- Create `.wonder/extend/integrations.json` only when absent.
- Create `.wonder/extend/capabilities.json` only when absent.
- Leave detected capabilities empty until detection runs.
- Preserve existing runtime snapshots and user choices.

register

- Read `.wonder/state.json` when present.
- If `.wonder/state.json` is invalid JSON, stop without overwriting it and report that registry repair is required.
- Merge only the `wonder-extend` registry section.
- Register `init`, `discover-companions`, `configure-integration`, and `detect-capabilities` capability surfaces.
- Mark only the current execution surface as initialized.

report

- Report created paths.
- Report existing paths reused.
- Report runtime snapshots created.
- Report registered capability ids.
- Report current execution surface initialized state.

Do not install external tools.
Do not enable companion tools.
Do not configure integrations.
Do not perform remote checks.
Do not store secrets.
Do not create `.wonder/reports/extend-latest.json`.
Do not initialize other plugins.
