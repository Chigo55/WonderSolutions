# Deterministic Runtime Specification

This document defines the deterministic runtime layer used by the WonderSolutions
platform surfaces. It is subordinate to `docs/system-design.md` and is the
authoritative contract for typed runtime files, document scaffolds, MCP tools,
and CLI fallback behavior.

## 1. Purpose

WonderSolutions targets Claude Code, Codex, and Antigravity as native platform
surfaces. The deterministic runtime layer is not a fourth marketplace target.
It is a shared execution layer that all three platform surfaces can call for
file work that should be repeatable, schema-bound, and platform-neutral.

The runtime owns deterministic operations:

- plugin init file creation
- `.wonder/state.json` typed merge
- typed JSON creation, update, and validation
- run directory scaffold creation
- Markdown scaffold creation
- reuse template rendering
- generated output calculation, validation, and drift checks

Platform agents own judgment-heavy operations:

- user intent interpretation
- code changes
- planning decisions
- review findings
- standards proposal content
- companion recommendation explanation
- consent and confirmation conversations

## 2. Public Invocation Contract

Deterministic runtime operations expose two equivalent public invocation
surfaces:

1. MCP tools.
2. Repository CLI commands.

Platform agents must prefer MCP tools when available. If MCP is unavailable,
the agent may call the repository CLI fallback. Both invocation surfaces must
call the same shared runtime implementation and produce equivalent filesystem
results for the same inputs.

The fallback path is a public contract, not an internal escape hatch.

```text
platform agent
  -> prefer MCP tool
  -> otherwise call repository CLI
  -> both call shared runtime implementation
  -> both produce equivalent JSON and Markdown files
```

Forbidden fallback:

```text
platform agent -> hand-edit .wonder JSON
```

Allowed fallback:

```text
platform agent -> CLI command -> shared runtime implementation
```

## 3. Writer Roles

File ownership is split into creation and content ownership.

| Role | Meaning |
| --- | --- |
| `runtime` | MCP or CLI creates, updates, validates, or repairs through typed deterministic code. |
| `agent` | Platform agent writes semantic content that requires judgment. |
| `user` | User-editable file content. Existing user edits must be preserved by default. |
| `external` | Content or evidence comes from tools, commands, environment, or remote systems. |
| `mixed` | Multiple non-runtime content sources are valid. |

The capability output matrix uses:

- `creationWriter`: who creates the file or scaffold.
- `contentWriter`: who owns the meaningful content after creation.

## 4. JSON Writer Rules

All `.wonder/**/*.json` files are typed runtime records. Platform agents must
not hand-edit them when MCP or CLI can perform the operation.

MCP and CLI are the supported writers for:

- machine-managed JSON
- generated JSON
- run JSON
- report JSON
- typed integration, capability, and reuse JSON

Exception: `.wonder/config/*.json` is user-editable. Runtime may create config
files when absent, validate them, and apply explicit typed updates, but must
preserve existing user edits by default.

| JSON class | Examples | Policy |
| --- | --- | --- |
| Machine-managed state | `.wonder/state.json` | Typed merge only. Preserve unknown plugin sections. Do not hand-edit. |
| Machine-managed cache | `.wonder/reuse/index.json` | Regenerate from source asset directories when missing or stale. |
| User-editable config | `.wonder/config/*.json` | Create if absent. Validate. Apply explicit typed updates only. Preserve existing content by default. |
| Run record | `.wonder/runs/<run-id>/run.json` | Create once, then typed status and result updates only. |
| Run artifacts | `artifacts.json`, `findings.json`, `violations.json`, `asset-changes.json`, `integration-changes.json` | Typed update allowed. Schema controls shape. |
| Runtime snapshots | `.wonder/extend/*.json`, `.wonder/reuse/**/asset.json` | Typed create/update only. Secret-like values are forbidden where schemas prohibit them. |
| Latest reports | `.wonder/reports/build-latest.json`, `.wonder/reports/govern-latest.json` | Overwrite with typed summary pointer after the owning capability completes or fails. |
| Generated platform output | `.claude-plugin/marketplace.json`, `.agents/plugins/marketplace.json`, plugin manifests | Regenerate from `packages/` and `adapters/`. Do not hand-edit. |

## 5. Markdown Formatting Levels

Markdown files use three formatting levels.

| Level | Runtime behavior | Content behavior |
| --- | --- | --- |
| `strict scaffold` | Runtime creates fixed headings, section order, and optional known markers. | Agents fill semantic content inside declared sections. |
| `light normalization` | Runtime normalizes LF and trailing newline and may validate limited syntax. | Agent or user content remains free-form. |
| `preserve content` | Runtime preserves source text except unavoidable encoding or LF handling when explicitly requested. | Content is evidence or rendered output and must not be wrapped in a report template. |

Formatting level by file pattern:

| File pattern | Level |
| --- | --- |
| `.wonder/runs/<run-id>/plan.md` | `strict scaffold` |
| `.wonder/runs/<run-id>/inspect.md` | `strict scaffold` |
| `.wonder/runs/<run-id>/report.md` | `strict scaffold` |
| `.wonder/runs/<run-id>/changes.md` | `strict scaffold` |
| `.wonder/runs/<run-id>/observed-conventions.md` | `strict scaffold` |
| `.wonder/runs/<run-id>/proposed-standards.md` | `strict scaffold` |
| `.wonder/runs/<run-id>/abstraction.md` | `strict scaffold` |
| `.wonder/runs/<run-id>/recommendation-context.md` | `strict scaffold` |
| `.wonder/runs/<run-id>/detection-plan.md` | `strict scaffold` |
| `.wonder/standards/*.md` at creation time | `strict scaffold` |
| `.wonder/runs/<run-id>/request.md` | `light normalization` |
| `.wonder/reuse/**/body.md` | `light normalization` |
| `.wonder/runs/<run-id>/proposed-body.md` | `light normalization` |
| `.wonder/runs/<run-id>/source.md` | `preserve content` |
| `.wonder/runs/<run-id>/output.md` | `preserve content` |

Markdown scaffold regeneration policy:

| Situation | Policy |
| --- | --- |
| Missing Markdown file | Create scaffold. |
| Existing Markdown file | Preserve as-is. |
| Repair mode with empty file | Replace with scaffold. |
| Repair mode with known scaffold | Add missing sections only. |
| Existing content outside known sections | Preserve. |
| Destructive rewrite | Requires explicit user confirmation. |

## 6. Capability Output Matrix

This matrix is the canonical ownership table for files created while plugins
operate. Capability specs should reference this table instead of duplicating it.

### Repository Generation

| Operation | File pattern | Format | creationWriter | contentWriter | Policy |
| --- | --- | --- | --- | --- | --- |
| `generate` | `.claude-plugin/marketplace.json` | typed JSON | runtime | runtime | Regenerate from canonical source and adapter templates. |
| `generate` | `.agents/plugins/marketplace.json` | typed JSON | runtime | runtime | Regenerate from canonical source and adapter templates. |
| `generate` | `plugins/<platform>/<package>/**/plugin.json` | typed JSON | runtime | runtime | Regenerate from canonical source and adapter templates. |
| `generate` | generated `SKILL.md` files | generated Markdown | runtime | runtime | Regenerate from `instruction.md` and adapter templates. |

### Global Runtime

| Operation | File pattern | Format | creationWriter | contentWriter | Policy |
| --- | --- | --- | --- | --- | --- |
| any init | `.wonder/state.json` | typed JSON | runtime | runtime | Typed merge. Register only the current package. Preserve other plugin sections. |
| any init | `.wonder/config/<domain>.json` | typed JSON | runtime | user | Create if absent. Validate and preserve by default. |
| run scaffold | `.wonder/runs/<run-id>/run.json` | typed JSON | runtime | runtime | Create once. Later updates must be typed. |
| run scaffold | `.wonder/runs/<run-id>/request.md` | Markdown, light normalization | runtime | user | Preserve request text with LF and trailing newline normalization. |
| run scaffold | `.wonder/runs/<run-id>/report.md` | Markdown, strict scaffold | runtime | agent | Runtime creates sections. Agent fills summary and outcomes. |
| run scaffold | `.wonder/runs/<run-id>/artifacts.json` | typed JSON | runtime | runtime | Schema-bound artifact lists. |

### `wonder-build`

| Capability | File pattern | Format | creationWriter | contentWriter | Policy |
| --- | --- | --- | --- | --- | --- |
| `init` | `.wonder/config/build.json` | typed JSON | runtime | user | Create if absent. Preserve existing config. |
| `create` | `plan.md` | Markdown, strict scaffold | runtime | agent | Scope, steps, validation, and risks sections. |
| `modify` | `plan.md` | Markdown, strict scaffold | runtime | agent | Scope, allowed paths, steps, validation, and risks sections. |
| `create`, `modify`, `review` | `inspect.md` | Markdown, strict scaffold | runtime | agent | Files read, evidence, commands, skipped validation, and notes. |
| `review` | `findings.json` | typed JSON | runtime | runtime | Findings array sorted by severity when updated. |
| `create`, `modify` | `artifacts.json` | typed JSON | runtime | runtime | Created, modified, deleted, validation, reuse, and companion references as applicable. |
| `create`, `modify`, `review` | `.wonder/reports/build-latest.json` | typed JSON | runtime | runtime | Latest summary pointer. Overwrite after completion or failure. |

### `wonder-govern`

| Capability | File pattern | Format | creationWriter | contentWriter | Policy |
| --- | --- | --- | --- | --- | --- |
| `init` | `.wonder/config/govern.json` | typed JSON | runtime | user | Create if absent. Preserve existing config. |
| `init` | `.wonder/standards/coding.md` | Markdown, strict scaffold | runtime | user | Create starter only when absent. Preserve existing content. |
| `init` | `.wonder/standards/architecture.md` | Markdown, strict scaffold | runtime | user | Create starter only when absent. Preserve existing content. |
| `init` | `.wonder/standards/security.md` | Markdown, strict scaffold | runtime | user | Create starter only when absent. Preserve existing content. |
| `init` | `.wonder/standards/docs.md` | Markdown, strict scaffold | runtime | user | Create starter only when absent. Preserve existing content. |
| `define-standards` | `observed-conventions.md` | Markdown, strict scaffold | runtime | agent | Record observed facts separately from proposed standards. |
| `define-standards` | `proposed-standards.md` | Markdown, strict scaffold | runtime | agent | Use rule id, severity, rationale, applies-to, and examples sections. |
| `define-standards` | `changes.md` | Markdown, strict scaffold | runtime | agent | Record changed files, added rules, updated rules, and conflicts. |
| `define-standards` | `.wonder/standards/*.md` | Markdown, strict scaffold | runtime | user | User-editable standards. Runtime may create or repair scaffolds, but must preserve user content by default. |
| `define-standards` | `artifacts.json` | typed JSON | runtime | runtime | Standards created, modified, rules added, rules updated, and conflicts. |
| `check-policy` | `standards-index.json` | typed JSON | runtime | runtime | Snapshot of rules applied during the check. |
| `check-policy` | `inspect.md` | Markdown, strict scaffold | runtime | agent | Scope, evidence, files, commands, and skipped checks. |
| `check-policy` | `violations.json` | typed JSON | runtime | runtime | Machine-readable violation details. |
| `check-policy` | `.wonder/reports/govern-latest.json` | typed JSON | runtime | runtime | Latest policy check summary pointer. |

### `wonder-reuse`

| Capability | File pattern | Format | creationWriter | contentWriter | Policy |
| --- | --- | --- | --- | --- | --- |
| `init` | `.wonder/config/reuse.json` | typed JSON | runtime | user | Create if absent. Preserve existing config. |
| `init` | `.wonder/reuse/requests/basic-task/asset.json` | typed JSON | runtime | runtime | Starter asset metadata. Create if absent. |
| `init` | `.wonder/reuse/requests/basic-task/body.md` | Markdown, light normalization | runtime | user | Starter body. Create if absent. |
| `init` | `.wonder/reuse/templates/basic-report/asset.json` | typed JSON | runtime | runtime | Starter asset metadata. Create if absent. |
| `init` | `.wonder/reuse/templates/basic-report/body.md` | Markdown, light normalization | runtime | user | Starter body. Create if absent. |
| `init`, `manage-assets`, `generate-output`, `promote-asset` | `.wonder/reuse/index.json` | typed JSON | runtime | runtime | Regenerate from asset directories when missing, stale, or explicitly refreshed. |
| `manage-assets` | `.wonder/reuse/<kind>/<asset-id>/asset.json` | typed JSON | runtime | runtime | Typed asset metadata. |
| `manage-assets` | `.wonder/reuse/<kind>/<asset-id>/body.md` | Markdown, light normalization | runtime | user | Reusable body. Validate variables only where needed. |
| `manage-assets` | `asset-changes.json` | typed JSON | runtime | runtime | Created, updated, moved, deleted, and deletion candidates. |
| `generate-output` | `selected-asset.json` | typed JSON | runtime | runtime | Asset metadata snapshot used for rendering. |
| `generate-output` | `variables.json` | typed JSON | runtime | runtime | Final values used for rendering. |
| `generate-output` | `output.md` | Markdown, preserve content | runtime | runtime | Rendered template output. Do not wrap in report sections. |
| `generate-output` | `artifacts.json` | typed JSON | runtime | runtime | Written output paths. |
| `promote-asset` | `source.md` | Markdown, preserve content | runtime | mixed | Preserve promoted source material. |
| `promote-asset` | `abstraction.md` | Markdown, strict scaffold | runtime | agent | Fixed parts, variables, discarded details, and assumptions. |
| `promote-asset` | `proposed-asset.json` | typed JSON | runtime | runtime | Draft asset metadata. |
| `promote-asset` | `proposed-body.md` | Markdown, light normalization | runtime | agent | Draft reusable body. Validate variable syntax only. |
| `promote-asset` | saved `asset.json` | typed JSON | runtime | runtime | Save only after confirmation rules pass. |
| `promote-asset` | saved `body.md` | Markdown, light normalization | runtime | user | Save only after confirmation rules pass. |

### `wonder-extend`

| Capability | File pattern | Format | creationWriter | contentWriter | Policy |
| --- | --- | --- | --- | --- | --- |
| `init` | `.wonder/config/extend.json` | typed JSON | runtime | user | Create if absent. Preserve existing config. |
| `init` | `.wonder/extend/companions.json` | typed JSON | runtime | runtime | Snapshot from catalog with `enabled: false`. Must not imply availability. |
| `init` | `.wonder/extend/integrations.json` | typed JSON | runtime | runtime | Disabled integration references from catalog. No secrets. |
| `init` | `.wonder/extend/capabilities.json` | typed JSON | runtime | runtime | Empty capability snapshot until detection runs. |
| `discover-companions` | `recommendation-context.md` | Markdown, strict scaffold | runtime | agent | Current platform, user goal, project context, constraints, and assumptions. |
| `discover-companions` | `companion-recommendations.json` | typed JSON | runtime | runtime | Candidates, rank, fit, reason, availability, next action, assumptions. |
| `discover-companions` | `selection-changes.json` | typed JSON | runtime | runtime | Enabled, disabled, and refreshed state changes. |
| `discover-companions` | `.wonder/extend/companions.json` | typed JSON | runtime | runtime | Update only for save-selection or refresh-snapshot operations. |
| `configure-integration` | `integration-changes.json` | typed JSON | runtime | runtime | Added, updated, disabled, and removed integration ids. |
| `configure-integration` | `.wonder/extend/integrations.json` | typed JSON | runtime | runtime | Typed integration metadata. Secret values are forbidden. |
| `detect-capabilities` | `detection-plan.md` | Markdown, strict scaffold | runtime | mixed | Providers, local checks, remote consent, skipped remote checks, and assumptions. |
| `detect-capabilities` | `detection-results.json` | typed JSON | runtime | runtime | Machine-readable detected capability snapshot. |
| `detect-capabilities` | `.wonder/extend/capabilities.json` | typed JSON | runtime | runtime | Current external capability status. No secret values. |

## 7. Runtime Operation Set

Initial public runtime operations:

| Operation | Responsibility |
| --- | --- |
| `listPackages` | Read canonical package manifests. |
| `listCapabilities` | Read canonical capability manifests. |
| `getCapabilitySpec` | Return the source spec for a capability. |
| `initPlugin` | Ensure init files and merge `.wonder/state.json` for one package and platform. |
| `readState` | Read and validate `.wonder/state.json`. |
| `validateState` | Validate runtime JSON files when present. |
| `createRunScaffold` | Create run directory files for a capability. |
| `updateRunRecord` | Apply typed status, output, validation, and error updates. |
| `updateLatestReport` | Write typed build or govern latest report. |
| `refreshReuseIndex` | Regenerate `.wonder/reuse/index.json` from asset directories. |
| `renderReuseOutput` | Render a reuse `body.md` with typed variables and optionally write the rendered output to the run output file or an explicit target path. |
| `applyIntegrationChange` | Apply typed integration changes without storing secrets. |
| `detectCapabilities` | Write typed capability detection snapshot. |
| `generate` | Regenerate native platform outputs. |
| `validate` | Validate source, generated output, and runtime state. |
| `drift` | Fail when generated output differs from canonical source. |

The MCP tool names and CLI command names may differ by adapter, but they must
map to these operation contracts.

## 8. Error Handling And Preservation

General rules:

- Invalid existing JSON aborts the operation with a repair hint unless the
  operation is explicitly a repair.
- Runtime must not destructively overwrite user-editable files by default.
- Runtime must write JSON with two-space indentation and a trailing newline.
- Runtime must normalize generated Markdown to LF line endings and a trailing
  newline unless the file is classified as `preserve content`.
- Runtime must never store secret values in `.wonder/extend/*.json` or run
  records.
- Runtime must report created, existing, updated, and skipped paths.

Repair rules:

- Empty Markdown files may be replaced with their scaffold in repair mode.
- Known scaffold files may receive missing sections in repair mode.
- Unknown user or agent content must be preserved.
- Destructive Markdown rewrites require explicit user confirmation.
- Machine-managed JSON cache files may be regenerated.
- User-editable config JSON requires explicit typed update intent.

## 9. Non-Goals

This document does not define:

- platform-specific MCP installation details
- exact adapter prompt wording
- code-generation or code-editing behavior
- the semantic content of plans, reports, standards, or recommendations
- remote service protocols
- secret storage
