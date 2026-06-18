# WonderSolutions Implementation Design

이 문서는 `docs/system-design.md`를 구현 가능한 Node.js + TypeScript 계약으로 내린다. `docs/system-design.md`가 기준이며, 이 문서가 충돌하면 `docs/system-design.md`를 따른다.

## 1. Purpose And Scope

1차 구현 산출물은 다음이다.

- `packages/*` canonical product source
- `adapters/*` platform projection rule
- `tools/generate` deterministic generator
- `tools/validate` source/generated/runtime validator
- `.githooks/pre-commit` generated output drift gate
- `.wonder/*` project-local runtime state utilities

Capability별 사용자 workflow 단계와 prompt 세부 내용은 이 문서에서 정의하지 않는다. 그 내용은 `packages/<package>/specs/*.md`와 `packages/<package>/capabilities/<capability>/instruction.md`가 맡는다.

## 2. Implementation Principles

구현 원칙은 코드 규칙으로 해석한다.

- `packages/` 아래 JSON/Markdown만 사람이 수정한다.
- `adapters/`는 platform output rule만 정의한다.
- `tools/generate`는 `packages/`와 `adapters/`만 읽고 native output을 쓴다.
- `tools/validate`는 source schema, generated output, runtime state를 검증한다.
- Generated output은 commit 대상이다.
- Generated output은 사람이 직접 수정하지 않는다.
- Generator는 deterministic해야 한다. 같은 input은 byte-identical output을 만든다.
- Platform별 output은 override가 아니다. Claude Code, Codex, Antigravity는 같은 canonical source에서 동시에 생성된다.
- Plugin 간 연결은 hard dependency가 아니다. `.wonder/state.json` capability discovery만 사용한다.
- Invalid runtime state는 자동 복구하지 않는다. path, reason, repair hint를 출력하고 중단한다.

## 3. Technology Stack

고정 stack:

```text
Node.js >= 20
TypeScript
npm
package-lock.json
tsx
tsc
Zod
Handlebars
```

`package.json`은 ESM으로 둔다.

```json
{
  "type": "module"
}
```

`packages/`는 npm workspace가 아니다. Wonder marketplace product source다. pnpm, turbo, workspace package linking은 1차 구현에 넣지 않는다.

## 4. Source Of Truth

Generator가 읽는 canonical input:

```text
packages/<package>/manifest.json
packages/<package>/capabilities/<capability>/capability.json
packages/<package>/capabilities/<capability>/instruction.md
adapters/<platform>/adapter.json
adapters/<platform>/templates/*.hbs
```

사람용 설계 문서. Tool input으로 파싱하지 않는다.

```text
docs/system-design.md
docs/implementation-design.md
packages/<package>/specs/*.md
okf-spec.md
llm-wiki.md
```

필수 package/capability 목록은 `docs/system-design.md`와 동일하다.

```ts
export const REQUIRED_PACKAGES = {
  "wonder-build": ["init", "create", "modify", "review"],
  "wonder-govern": ["init", "define-standards", "check-policy"],
  "wonder-reuse": ["init", "manage-assets", "generate-output", "promote-asset"],
  "wonder-extend": [
    "init",
    "discover-companions",
    "configure-integration",
    "detect-capabilities",
  ],
} as const;
```

Validator는 이 목록의 manifest, spec, capability directory가 없으면 실패한다.

## 5. Repository Layout

Source tree:

```text
packages/
  wonder-build/
    manifest.json
    specs/
      init.md
      create.md
      modify.md
      review.md
    capabilities/
      init/
        capability.json
        instruction.md
      create/
        capability.json
        instruction.md
      modify/
        capability.json
        instruction.md
      review/
        capability.json
        instruction.md

  wonder-govern/
    manifest.json
    specs/
      init.md
      define-standards.md
      check-policy.md
    capabilities/

  wonder-reuse/
    manifest.json
    specs/
      init.md
      manage-assets.md
      generate-output.md
      promote-asset.md
    capabilities/

  wonder-extend/
    manifest.json
    catalog/
      companions.json
      integrations.json
    specs/
      init.md
      discover-companions.md
      configure-integration.md
      detect-capabilities.md
    capabilities/
```

Adapter/tool tree:

```text
adapters/
  claude/
    adapter.json
    templates/
      marketplace.json.hbs
      plugin.json.hbs
      skill.md.hbs
  codex/
    adapter.json
    templates/
      marketplace.json.hbs
      plugin.json.hbs
      skill.md.hbs
  antigravity/
    adapter.json
    templates/
      plugin.json.hbs
      skill.md.hbs

tools/
  generate/
    cli.ts
    src/
      load-source.ts
      render-platform.ts
      compute-output.ts
      write-output.ts
  validate/
    cli.ts
    src/
      validate-source.ts
      validate-generated.ts
      validate-runtime.ts
      drift.ts
  shared/
    schema/
      package.ts
      capability.ts
      adapter.ts
      runtime.ts
      generated.ts
    platform/
      names.ts
      paths.ts
    fs/
      read-json.ts
      write-json.ts
      atomic-write.ts
      paths.ts
    hash/
      canonicalize.ts
      source-hash.ts
    errors.ts

.githooks/
  pre-commit
```

Generated native output tree:

```text
.claude-plugin/
  marketplace.json

.agents/
  skills/
    <package>-<capability>/
      SKILL.md
  plugins/
    marketplace.json
    <package>/
      plugin.json
      skills/
        <capability>/
          SKILL.md

plugins/
  claude/
    <package>/
      .claude-plugin/
        plugin.json
      skills/
        <capability>/
          SKILL.md
  codex/
    <package>/
      .codex-plugin/
        plugin.json
      skills/
        <package>-<capability>/
          SKILL.md
```

Generated output은 `docs/system-design.md`의 native path 직접 생성 원칙을 따른다. 별도 generated output ledger는 만들지 않는다.

## 6. Package And Capability Files

### Package Manifest

`packages/<package>/manifest.json` shape:

```ts
export interface PackageManifest {
  schemaVersion: 1;
  id: PackageId;
  displayName: string;
  version: string;
  userJob: "Build" | "Govern" | "Reuse" | "Extend";
  description: string;
  capabilityOrder: CapabilityId[];
}
```

Validation rules:

- `id` must match directory name.
- `id` must match `/^wonder-[a-z0-9]+(?:-[a-z0-9]+)*$/`.
- `version` must match simple semver `/^\d+\.\d+\.\d+$/`.
- `capabilityOrder` must exactly match capability directories after sorting by declared order.
- No unknown top-level keys. Zod uses `.strict()`.

Example:

```json
{
  "schemaVersion": 1,
  "id": "wonder-build",
  "displayName": "Wonder Build",
  "version": "0.1.0",
  "userJob": "Build",
  "description": "Structure task creation, modification, and review.",
  "capabilityOrder": ["init", "create", "modify", "review"]
}
```

### Capability Metadata

`packages/<package>/capabilities/<capability>/capability.json` shape:

```ts
export type CapabilityKind = "workflow" | "operation";

export type AbstractAction =
  | "read"
  | "search"
  | "write"
  | "edit"
  | "run-command"
  | "delegate"
  | "web-research"
  | "ask-user"
  | "report"
  | "manage-state";

export interface CapabilityManifest {
  schemaVersion: 1;
  id: CapabilityId;
  title: string;
  kind: CapabilityKind;
  description: string;
  requires: AbstractAction[];
}
```

Validation rules:

- `id` must match directory name.
- `id` must match `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`.
- `requires` cannot be empty.
- `requires` cannot contain duplicates.
- `requires` values must be in `AbstractAction`.
- New action values require schema update and all three platform adapters.
- No platform words in `instruction.md`: `Claude`, `Codex`, `Antigravity`, `shell_command`, `.claude/`, `.codex/`, `.agents/`.

Example:

```json
{
  "schemaVersion": 1,
  "id": "create",
  "title": "Create Task",
  "kind": "workflow",
  "description": "Create a structured task from a user request.",
  "requires": ["read", "write", "delegate", "run-command", "report"]
}
```

### Instruction Body

`instruction.md` is platform-neutral Markdown.

Allowed:

```text
Read project files.
Write required artifacts.
Delegate analysis when useful.
Run validation commands.
Report result and changed files.
```

Forbidden:

```text
Use Claude command...
Call Codex shell_command...
Write .agents/skills...
```

Generator wraps this body with platform-specific invocation and tool guidance in adapter templates.

## 7. Adapter And Template Model

Adapter config shape:

```ts
export type PlatformId = "claude" | "codex" | "antigravity";
export type OutputScope = "repository" | "package" | "capability";
export type OutputKind =
  | "marketplace"
  | "plugin-manifest"
  | "repo-skill"
  | "plugin-skill";

export interface AdapterOutput {
  kind: OutputKind;
  scope: OutputScope;
  path: string;
  template: string;
  textKind: "json" | "markdown";
  header: "none" | "html-comment";
}

export interface AdapterConfig {
  schemaVersion: 1;
  platform: PlatformId;
  surfaceNameRule: "claude-command" | "codex-skill" | "antigravity-workflow-id";
  outputs: AdapterOutput[];
}
```

Adapter validation:

- `platform` must match adapter directory.
- `path` cannot be absolute.
- `path` cannot contain `..`.
- `template` must exist below `adapters/<platform>/templates/`.
- `json` output must use `header: "none"`.
- `markdown` output may use `header: "html-comment"`.

Template context:

```ts
export interface TemplateContext {
  platform: PlatformId;
  generatedAt: null;
  package: PackageManifest;
  capability?: CapabilityManifest;
  instruction?: string;
  surface: {
    canonicalId: string;
    platformName: string;
  };
  paths: {
    sourceFiles: string[];
    outputPath: string;
  };
  hash: {
    sourceHash: string;
  };
}
```

`generatedAt` is always `null` in 1차 구현. Timestamps would break deterministic output.

Template rules:

- No business branching beyond simple optional sections.
- No filesystem path calculation in templates.
- No sorting in templates.
- No source hash calculation in templates.
- JSON templates must render valid JSON with trailing newline.
- Markdown templates must render LF line endings and trailing newline.

## 8. Platform Output Mapping

Surface names:

```ts
export function canonicalId(pkg: PackageId, cap: CapabilityId): string {
  return `${pkg}.${cap}`;
}

export function surfaceName(platform: PlatformId, pkg: PackageId, cap: CapabilityId): string {
  if (platform === "claude") return `/${pkg}:${cap}`;
  if (platform === "codex") return `$${pkg}-${cap}`;
  return `${pkg}.${cap}`;
}
```

Output path rules:

| Platform | Scope | Path |
| --- | --- | --- |
| Claude | repository | `.claude-plugin/marketplace.json` |
| Claude | package | `plugins/claude/<package>/.claude-plugin/plugin.json` |
| Claude | capability | `plugins/claude/<package>/skills/<capability>/SKILL.md` |
| Codex | repository | `.agents/plugins/marketplace.json` |
| Codex | package | `plugins/codex/<package>/.codex-plugin/plugin.json` |
| Codex | capability | `plugins/codex/<package>/skills/<package>-<capability>/SKILL.md` |
| Codex | capability | `.agents/skills/<package>-<capability>/SKILL.md` |
| Antigravity | package | `.agents/plugins/<package>/plugin.json` |
| Antigravity | capability | `.agents/plugins/<package>/skills/<capability>/SKILL.md` |

Manual native files outside the computed target paths above are not generator targets.

### Claude Code Native Contract

Claude generated plugin:

```text
plugins/claude/<package>/
  .claude-plugin/
    plugin.json
  skills/
    <capability>/
      SKILL.md
```

Claude plugin manifest:

```json
{
  "name": "wonder-build",
  "displayName": "Wonder Build",
  "version": "0.1.0",
  "description": "Structure task creation, modification, and review."
}
```

Claude marketplace:

```text
.claude-plugin/marketplace.json
```

Marketplace entries point to `./plugins/claude/<package>` from repository root.

Sources:

- `https://code.claude.com/docs/en/skills`
- `https://code.claude.com/docs/en/plugins`
- `https://code.claude.com/docs/en/plugins-reference`
- `https://code.claude.com/docs/en/plugin-marketplaces`

### Codex Native Contract

Codex repo-local skill:

```text
.agents/skills/<package>-<capability>/SKILL.md
```

Codex plugin:

```text
plugins/codex/<package>/
  .codex-plugin/
    plugin.json
  skills/
    <package>-<capability>/
      SKILL.md
```

Codex plugin manifest:

```json
{
  "name": "wonder-build",
  "version": "0.1.0",
  "description": "Structure task creation, modification, and review.",
  "skills": "./skills/"
}
```

Codex skill frontmatter:

```md
---
name: wonder-build-create
description: Create a structured Wonder task from a user request.
---
```

Codex marketplace:

```text
.agents/plugins/marketplace.json
```

Marketplace entry `source.path` points to `./plugins/codex/<package>` from marketplace root. `agents/openai.yaml` is not generated in 1차 구현.

Sources:

- `https://developers.openai.com/codex/skills`
- `https://developers.openai.com/codex/plugins`
- `https://developers.openai.com/codex/plugins/build`

### Antigravity Native Contract

Antigravity plugin:

```text
.agents/plugins/<package>/
  plugin.json
  skills/
    <capability>/
      SKILL.md
```

Antigravity `plugin.json`:

```json
{
  "name": "wonder-build"
}
```

Do not add Wonder metadata such as `version`, `capabilities`, or `surfaces` to Antigravity `plugin.json`.

Antigravity output uses official plugin/skill files. Antigravity workflow docs describe markdown slash-command workflows, but the official plugin contract does not define a workflow component and does not define a repository-local workflow path. Therefore 1차 구현 does not generate a separate workflow markdown file. Validator must not treat missing workflow markdown as drift.

Sources:

- `https://antigravity.google/docs/plugins`
- `https://antigravity.google/docs/cli-plugins`
- `https://antigravity.google/docs/skills`
- `https://antigravity.google/docs/hooks`
- `https://antigravity.google/docs/ide-workflows`

## 9. Generator Design

Command:

```text
npm run generate
wonder generate [--platform claude|codex|antigravity|all] [--dry-run]
```

Core types:

```ts
export interface SourceGraph {
  packages: PackageSource[];
  adapters: Record<PlatformId, AdapterSource>;
}

export interface PackageSource {
  manifestPath: string;
  manifest: PackageManifest;
  specs: Record<CapabilityId, string>;
  capabilities: CapabilitySource[];
}

export interface CapabilitySource {
  manifestPath: string;
  instructionPath: string;
  manifest: CapabilityManifest;
  instruction: string;
}

export interface GeneratedFile {
  platform: PlatformId;
  kind: OutputKind;
  packageId?: PackageId;
  capabilityId?: CapabilityId;
  path: string;
  content: string;
  sourceFiles: string[];
  sourceHash: string;
  textKind: "json" | "markdown";
  header: "none" | "html-comment";
}
```

Implementation entrypoints:

```ts
export async function loadSource(root: string): Promise<SourceGraph>;
export function computeOutputs(graph: SourceGraph, platforms: PlatformId[]): GeneratedFile[];
export async function writeOutputs(root: string, files: GeneratedFile[], options: WriteOptions): Promise<WriteReport>;
```

Generation algorithm:

```text
1. Resolve repository root.
2. Load required package list from constant.
3. Read package manifests in REQUIRED_PACKAGES order.
4. Read capability manifests in manifest.capabilityOrder order.
5. Read instruction.md as UTF-8.
6. Read adapter configs in platform order: claude, codex, antigravity.
7. Validate source graph.
8. Compute canonical ids and platform surface names.
9. Compute output paths.
10. Render repository-scoped outputs once per platform.
11. Render package-scoped outputs once per package.
12. Render capability-scoped outputs once per capability.
13. Detect duplicate output paths before writing.
14. Compute source hash for each output.
15. Apply generated headers where allowed.
16. Write files atomically unless --dry-run.
17. Print report.
```

Ordering:

- Packages use `REQUIRED_PACKAGES` order.
- Capabilities use `manifest.capabilityOrder`.
- Platforms use `claude`, `codex`, `antigravity`.
- JSON object keys emitted by generator are sorted unless native examples require a specific order. If specific order is used, implement it in one helper.

## 10. Source Hash

`sourceHash` is a SHA-256 hash of canonical source bytes, not output content.

Hash input per generated file:

```ts
export interface HashInput {
  generatorVersion: string;
  platform: PlatformId;
  outputKind: OutputKind;
  outputPath: string;
  sourceFiles: Array<{
    path: string;
    sha256: string;
  }>;
}
```

Canonicalization rules:

- Path separator is `/`.
- Paths are relative to repository root.
- Text files normalize CRLF to LF before hashing.
- JSON source files are parsed and re-stringified with stable key order before hashing.
- Hash input JSON is stable-stringified with sorted keys and trailing newline.
- Timestamps are excluded.
- Absolute local paths are excluded.

Source files by output kind:

| Output kind | Source files |
| --- | --- |
| marketplace | all package manifests, adapter config, marketplace template |
| plugin-manifest | package manifest, adapter config, plugin template |
| repo-skill | package manifest, capability manifest, instruction, adapter config, skill template |
| plugin-skill | package manifest, capability manifest, instruction, adapter config, skill template |

Generated markdown header:

```md
<!-- GENERATED by WonderSolutions. Source hash: <sha256>. Do not edit. -->
```

JSON output cannot contain comments. JSON files are still generated output because their paths are computed from `packages/` and `adapters/`.

## 11. Generated Output Ownership

Write rules:

- New computed target path may be created.
- Existing computed target path may be overwritten by generator.
- Existing non-target native files are never touched.
- Markdown generated files include Wonder generated header.
- JSON generated files do not include header or embedded metadata.
- Collision means two generated outputs compute the same target path.
- Collision aborts generation before any write.
- Generator never deletes files in 1차 구현.
- Generator never moves or backs up manual files.
- If a previously generated path is no longer computed, 1차 validator does not delete it. Removal is manual.

Atomic write:

```text
target.tmp-<pid>-<random>
write UTF-8
fsync best effort
rename to target
```

On Windows, temp file must be in the same directory as target.

## 12. Validator Design

Command:

```text
npm run validate
wonder validate [--source] [--generated] [--runtime]
wonder drift
```

Default `wonder validate` runs all validators.

Source validator:

```text
validate package manifest schema
validate required package/capability existence
validate capability manifest schema
validate instruction forbidden platform words
validate spec file existence
validate adapter schema
validate template existence
validate wonder-extend catalog schema
```

Generated validator:

```text
load source graph
compute expected generated files in memory
check duplicate generated target paths
check every expected file exists
compare actual content byte-for-byte
validate JSON outputs parse as JSON
validate markdown outputs contain header when required
```

Runtime validator:

```text
validate .wonder/state.json if present
validate .wonder/config/*.json if present
validate .wonder/extend/*.json if present
validate .wonder/reuse/index.json if present
validate .wonder/runs/*/run.json if present
```

Zod schemas in `tools/shared/schema/*` are canonical. JSON Schema export is not generated in 1차 구현.

Drift definition:

- expected file missing
- actual content differs from computed content
- generated output path set differs from current source and adapters
- in pre-commit context, generated target path has unstaged, staged, or untracked change after `npm run generate`

Validator does not auto-fix drift.

## 13. Runtime State Design

Runtime root:

```text
.wonder/
  state.json
  config/
  standards/
  reuse/
  extend/
  runs/
  reports/
```

`.wonder/state.json` shape:

```ts
export interface WonderState {
  schemaVersion: 1;
  plugins: Record<PackageId, PluginState>;
}

export interface PluginState {
  initialized: boolean;
  capabilities: Record<CapabilityId, RuntimeCapability>;
  platforms: Record<PlatformId, PlatformInitState>;
}

export interface RuntimeCapability {
  kind: CapabilityKind;
  surfaces: Record<PlatformId, string>;
}

export interface PlatformInitState {
  initialized: boolean;
}
```

State merge algorithm for `init`:

```text
1. Read .wonder/state.json if it exists.
2. If missing, start with { schemaVersion: 1, plugins: {} }.
3. If invalid JSON, abort with repair hint.
4. Preserve unknown plugin sections.
5. Upsert only current package section.
6. Register all capabilities for current package.
7. Register surfaces for all platforms.
8. Set platforms[currentPlatform].initialized = true.
9. Do not change other package sections.
10. Do not change other platform initialized states.
11. Atomic write state.json.
```

Generated surfaces example:

```json
{
  "schemaVersion": 1,
  "plugins": {
    "wonder-build": {
      "initialized": true,
      "capabilities": {
        "create": {
          "kind": "workflow",
          "surfaces": {
            "claude": "/wonder-build:create",
            "codex": "$wonder-build-create",
            "antigravity": "wonder-build.create"
          }
        }
      },
      "platforms": {
        "claude": { "initialized": true },
        "codex": { "initialized": false },
        "antigravity": { "initialized": false }
      }
    }
  }
}
```

## 14. Run Record Design

Run id:

```text
yyyyMMdd-HHmmss-<package>-<capability>-<shortid>
```

Run directory:

```text
.wonder/runs/<run-id>/
  run.json
  inspect.md
  changes.json
  report.md
```

`run.json` shape:

```ts
export interface RunRecord {
  schemaVersion: 1;
  runId: string;
  packageId: PackageId;
  capabilityId: CapabilityId;
  platform: PlatformId;
  status: "running" | "succeeded" | "failed";
  startedAt: string;
  finishedAt?: string;
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  validation?: {
    commands: Array<{
      command: string;
      exitCode: number;
    }>;
  };
  error?: {
    code: string;
    message: string;
  };
}
```

Mandatory run record targets from `docs/system-design.md`:

```ts
export const MANDATORY_RUN_RECORDS = new Set<string>([
  "wonder-build.create",
  "wonder-build.modify",
  "wonder-build.review",
  "wonder-govern.define-standards",
  "wonder-govern.check-policy",
  "wonder-reuse.manage-assets",
  "wonder-reuse.generate-output",
  "wonder-reuse.promote-asset",
  "wonder-extend.discover-companions",
  "wonder-extend.configure-integration",
  "wonder-extend.detect-capabilities",
]);
```

Conditional rules:

- `wonder-reuse.manage-assets` requires run record only for asset-changing operations.
- `wonder-reuse.generate-output` requires run record only for direct user calls.
- `wonder-extend.discover-companions` requires run record only for state-changing operations.
- `init` does not require a full run record.
- Failed mandatory runs still write `run.json` with `status: "failed"` when possible.

## 15. Report Files

Latest reports:

```text
.wonder/reports/build-latest.json
.wonder/reports/govern-latest.json
```

`wonder-build` updates `build-latest.json` after `create`, `modify`, or `review`.

`wonder-govern.check-policy` updates `govern-latest.json`.

`wonder-reuse` does not maintain latest report. Reuse assets and run records are state.

`wonder-extend` does not maintain latest report. `.wonder/extend/capabilities.json` is current external capability state.

Report JSON shape:

```ts
export interface LatestReport {
  schemaVersion: 1;
  packageId: PackageId;
  capabilityId: CapabilityId;
  runId: string;
  status: "succeeded" | "failed";
  updatedAt: string;
  summary: string;
  artifacts: string[];
}
```

## 16. OKF-Light Runtime Markdown

`okf-spec.md` and `llm-wiki.md` guide runtime knowledge artifacts only. They do not define canonical package schema or generated native output.

OKF-light applies to:

```text
.wonder/standards/*.md
.wonder/reuse/**/body.md
.wonder/runs/<run-id>/report.md
.wonder/reports/*.md
```

Rules:

- Markdown frontmatter allowed.
- Standard metadata: `type`, `title`, `description`, `tags`, `timestamp`.
- Cross-links use Markdown links.
- 1차 구현 does not auto-generate runtime `index.md`.
- `.wonder/reuse/index.json` is machine state.
- `index.md` is read-only report created only by explicit export/summarize request.
- `log.md` may be append-only history if a capability spec requires it.

Not applied to:

```text
manifest.json
capability.json
adapter.json
generated native files
```

## 17. CLI And NPM Scripts

`package.json` scripts:

```json
{
  "scripts": {
    "generate": "tsx tools/generate/cli.ts",
    "validate": "tsx tools/validate/cli.ts",
    "drift": "tsx tools/validate/cli.ts --generated --drift",
    "check": "npm run generate && npm run validate && npm run drift",
    "typecheck": "tsc --noEmit"
  }
}
```

CLI flags:

```text
wonder generate [--platform claude|codex|antigravity|all] [--dry-run]
wonder validate [--source] [--generated] [--runtime] [--drift]
wonder drift
wonder check
```

Behavior:

- `wonder generate` default platform is `all`.
- `wonder validate` with no flags runs source, generated, runtime.
- `wonder drift` is alias for `wonder validate --generated --drift`.
- `wonder check` is local convenience only.
- Git hook runs the explicit sequence from `docs/system-design.md`: generate, validate, drift.

## 18. Git Hook Flow

Install:

```bash
git config core.hooksPath .githooks
```

`.githooks/pre-commit`:

```bash
#!/usr/bin/env sh
set -eu
npm run generate
npm run validate
npm run drift
```

Hook policy:

- Do not run `git add`.
- Do not change staged set intentionally.
- If generated output changed, fail commit.
- User reviews generated diff and stages manually.
- Do not delete stale generated files automatically.

Hook drift check implementation:

```text
1. Run npm run generate.
2. Run npm run validate.
3. Recompute generated target path list.
4. Run content drift check against generated files.
5. If inside Git repository, check `git status --porcelain -- <generated paths>`.
6. If any generated target path is dirty or untracked, fail.
```

## 19. Error Handling

Exit codes:

| Code | Meaning |
| --- | --- |
| 0 | success |
| 1 | validation or drift failure |
| 2 | source parse/schema failure |
| 3 | generated output collision |
| 4 | runtime state invalid |
| 5 | filesystem write failure |
| 9 | unexpected internal error |

Error shape printed to stderr:

```ts
export interface ToolError {
  code: string;
  message: string;
  path?: string;
  hint?: string;
}
```

Rules:

- Missing canonical source is validation error.
- Invalid JSON reports path and parser message.
- Headerless or unowned output collision is generation error.
- Invalid `.wonder/state.json` aborts with repair hint.
- Secret-like values in runtime integration config are rejected.
- Remote checks require explicit user consent.
- Write failure reports target path and whether temp file remains.
- Generator continues independent outputs where possible, then exits non-zero.

## 20. Implementation Phases

Implementation order:

1. Add `package.json`, `package-lock.json`, `tsconfig.json`.
2. Add `tools/shared/schema/*` Zod schemas.
3. Add `tools/shared/platform/names.ts` and `paths.ts`.
4. Add required `packages/*/manifest.json`.
5. Add required `packages/*/capabilities/*/{capability.json,instruction.md}`.
6. Add adapter configs and templates.
7. Implement `loadSource(root)`.
8. Implement source validator.
9. Implement `surfaceName()` and output path computation.
10. Implement template rendering.
11. Implement source hash and content hash.
12. Implement write-output with duplicate target collision checks.
13. Implement generated validator and drift mode.
14. Implement runtime schema and state merge utility.
15. Implement run record utility.
16. Implement report file utility.
17. Add npm scripts.
18. Add `.githooks/pre-commit`.
19. Run `npm run typecheck`.
20. Run `npm run generate`.
21. Run `npm run validate`.
22. Run `npm run drift`.

1차 milestone 완료 조건:

- All required package/capability source files exist.
- Claude, Codex, Antigravity outputs are generated from same source graph.
- `npm run validate` passes.
- `npm run drift` passes.
- Pre-commit hook does not stage files.

## 21. Platform Contract Decisions

Current internal open decision count: zero.

Confirmed decisions:

- Claude uses plugin marketplace, plugin manifest, and plugin skills.
- Codex uses repo-local skills, plugin marketplace, plugin manifest, and plugin skills.
- Codex does not generate `agents/openai.yaml` in 1차 구현.
- Antigravity uses official plugin/skill contract.
- Antigravity does not generate separate workflow markdown files.
- JSON Schema export is not generated in 1차 구현.
- Runtime OKF-light `index.md` is not auto-generated.
- Generated JSON files do not contain comments or embedded Wonder metadata.
