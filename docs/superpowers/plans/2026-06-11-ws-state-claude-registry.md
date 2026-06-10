# ws-state.claude.json Registry (Claude-side §7) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Claude-platform half of `docs/system-design.md` §7 — a platform-isolated feature registry `ws-state.claude.json` provisioned at init-time by `/wsf-init`, bound read-only by `/wsf-run` + orchestrator, with the §7.3 self-healing policy.

**Architecture:** Pure declarative implementation — all behavior lives in the wonder-workflows command/agent markdown (no runtime JS, consistent with the 2026-06-09 hooks-removal decision). `/wsf-init` gains a self-registration scan that writes/merges the registry; `/wsf-run` loads it as read-only binding context and delegates the forced-core-override correction; the orchestrator conditions extension behavior (template promotion, companion tooling) on the registry flags. The file lives at the **target project root** (not this repo).

**Tech Stack:** Claude Code plugin markdown/JSON. Verification via `npm run validate` (claude plugin validate) + grep gates.

**Spec:** `docs/system-design.md` §6.2, §7 (esp. §7.1–§7.4), §8.2 item 4.

**Out of scope:** Codex/Antigravity registries (`ws-state.codex.json` 등), `sync:codex` adapter, Q5/Q6 adapter fixes, master template `ws-state.template.json` build tooling (single-platform scope makes the embedded fresh-registry template sufficient — YAGNI).

---

### Task 0: Commit the spec + this plan (docs)

**Files:**
- Add: `docs/system-design.md` (currently untracked)
- Add: `docs/superpowers/plans/2026-06-11-ws-state-claude-registry.md`

- [ ] **Step 1: Commit**

```bash
git add docs/system-design.md docs/superpowers/plans/2026-06-11-ws-state-claude-registry.md
git commit -m "docs: add unified system design spec and ws-state.claude.json implementation plan"
```

---

### Task 1: `/wsf-init` — registry provisioning step

**Files:**
- Modify: `plugins/wonder-workflows/commands/wsf-init.md`

- [ ] **Step 1: Update front-matter description**

Replace:

```
description: Initializes wonder-workflows for a project — reverse-engineers ADRs, generates project-specific rules, and produces HTML reports. Run once per project before using /wsf-run.
```

With:

```
description: Initializes wonder-workflows for a project — provisions the ws-state.claude.json registry, reverse-engineers ADRs, generates project-specific rules, and produces HTML reports. Run once per project before using /wsf-run.
```

- [ ] **Step 2: Insert the provisioning section after `## 0. Parse flags`**

Insert this new section between the end of `## 0. Parse flags` and `## 1–3. For each active layer (sequentially)`:

````markdown
## 1. Provision the State Registry (`ws-state.claude.json`)

Before any layer work, provision the platform-isolated feature registry at the **project root**. This file is the Claude-only registry — never read or write another platform's file (`ws-state.codex.json`, `ws-state.antigravity.json`); each platform owns exactly one registry.

### 1.1 Read the existing file

- **Absent** → build a fresh registry from the scan below (§1.2) and write it.
- **Valid JSON** → merge: keep every `enabled` flag the user has set; refresh each plugin's `version` and `features` from the scan; add newly detected plugins with their default flag; remove entries whose components are no longer detected (missing-component fallback — never crash on a stale entry).
- **Invalid JSON** (parse failure) → rename the corrupt file to `ws-state.claude.json.bak` (replacing any older `.bak`), then build a fresh registry from the scan and write it. Tell the user the backup path.

### 1.2 Self-registration scan

Detect which WonderSolutions components are available in the current session:

| Plugin | Detection signal | Registered `features` |
|---|---|---|
| `wonder-workflows` (self) | always present | agents: `orchestrator` `analyzer` `researcher` `planner` `developer` `inspector` `modifier` `ruler` · commands: `wsf-run` `wsf-init` `wsf-review` `wsf-rules` · rules: `structure.md` `security.md` `workflow.md` |
| `wonder-utilities` | `/wsu-template` command or `templater` agent available in this session | agents: `templater` · commands: `wsu-template` · skills: `cave-man` `grill-me` `hand-off` `write-a-skill` · templates: `index.json` `index.schema.json` · requests: `create_request.md` `modify_request.md` · rules: `templates.md` |
| `wonder-plugins` | any companion component available (superpowers skills · context7 MCP tools · claude-md-management commands · code-simplifier agent) | `companion-plugins` subtree — list **every detected companion** with its own nested `version`/`enabled`/`features` (Transitive Dependency Disclosure Principle). Omit companions that are not present. |

Rules:

- **Versions** — read wonder-workflows' own version from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`. For other plugins use the installed version when the session exposes it; otherwise write `"unknown"`.
- **Default flags** — newly added plugins get `enabled: true`, except `wonder-plugins` which defaults to `enabled: false` (companion binding is opt-in).
- **Forced core override** — `plugins."wonder-workflows".enabled` is always written as `true`. If the existing file says `false`, correct it and tell the user.
- **Custom-entry restriction** — drop any entry that is not an official WonderSolutions plugin or a detected companion (no user-added custom features or external scripts), and report what was dropped.

### 1.3 Fresh registry shape

When building from scratch, follow this shape (omit the `wonder-utilities` / `wonder-plugins` blocks entirely when not detected):

```json
{
  "project": "{project name} (Claude)",
  "version": "1.0.0",
  "plugins": {
    "wonder-workflows": {
      "version": "{from plugin.json}",
      "enabled": true,
      "features": {
        "agents": ["orchestrator", "analyzer", "researcher", "planner", "developer", "inspector", "modifier", "ruler"],
        "commands": ["wsf-run", "wsf-init", "wsf-review", "wsf-rules"],
        "rules": ["structure.md", "security.md", "workflow.md"]
      }
    },
    "wonder-utilities": {
      "version": "{installed or unknown}",
      "enabled": true,
      "features": {
        "agents": ["templater"],
        "commands": ["wsu-template"],
        "skills": ["cave-man", "grill-me", "hand-off", "write-a-skill"],
        "templates": ["index.json", "index.schema.json"],
        "requests": ["create_request.md", "modify_request.md"],
        "rules": ["templates.md"]
      }
    },
    "wonder-plugins": {
      "version": "{installed or unknown}",
      "enabled": false,
      "features": {
        "companion-plugins": {
          "{detected companion name}": {
            "version": "{installed or unknown}",
            "enabled": true,
            "features": { "agents": ["..."], "commands": ["..."], "skills": ["..."] }
          }
        }
      }
    }
  }
}
```

After writing, report one line: `ws-state.claude.json provisioned — wonder-utilities: {detected|absent} · wonder-plugins: {detected|absent}`.
````

- [ ] **Step 3: Renumber the following sections**

- `## 1–3. For each active layer (sequentially)` → `## 2–4. For each active layer (sequentially)` (inner `### Step 1/2/3` headings unchanged)
- `## 4. Result Report` → `## 5. Result Report`

- [ ] **Step 4: Add the registry line to the Result Report output block**

In the `## 5. Result Report` output template, under `Generated:`, add as the first line:

```
  ✓ ws-state.claude.json — state registry (wonder-utilities: {detected|absent} · wonder-plugins: {detected|absent})
```

- [ ] **Step 5: Verify**

```bash
grep -nE "ws-state\.claude\.json|Forced core override|Self-registration" plugins/wonder-workflows/commands/wsf-init.md
```

Expected: matches in the new §1 section and the Result Report.

---

### Task 2: `/wsf-run` — core dynamic binding + self-healing

**Files:**
- Modify: `plugins/wonder-workflows/commands/wsf-run.md`

- [ ] **Step 1: Insert the registry-loading section and renumber dispatch**

Between `## 0. Determine input` and `## 1. Dispatch orchestrator`, insert:

````markdown
## 1. Load the State Registry (read-only binding)

Read `ws-state.claude.json` from the project root. It is **read-only context** — never block the pipeline on it.

- **Absent** → run with core defaults (the pipeline is self-reliant). Mention once that `/wsf-init` provisions the registry, then continue.
- **Valid JSON** → pass the registry to the orchestrator as extension-binding context. Only features with `enabled: true` are bound into the pipeline.
  - **Forced core override**: if `plugins."wonder-workflows".enabled` is `false`, treat it as `true` for this run and write the correction back to the file (the only registry write permitted during a run).
  - **Missing-component fallback**: if an `enabled: true` entry's components are not actually available in this session, ignore that entry for this run — the next `/wsf-init` will prune it. Never crash.
- **Invalid JSON** → rename the corrupt file to `ws-state.claude.json.bak` (replacing any older `.bak`), rebuild a fresh registry using the same self-registration scan as `/wsf-init` §1.2, write it, report the backup path, then continue with the regenerated registry.
````

And rename `## 1. Dispatch orchestrator` → `## 2. Dispatch orchestrator`.

- [ ] **Step 2: Pass the registry to the orchestrator**

In the (now) `## 2. Dispatch orchestrator` section, replace:

```
Invoke the **orchestrator** agent, passing the task input (argument text or path to create_request.md).
```

With:

```
Invoke the **orchestrator** agent, passing the task input (argument text or path to create_request.md) and the extension-binding context from §1 (registry flags, or "no registry" for core defaults).
```

- [ ] **Step 3: Verify**

```bash
grep -nE "ws-state\.claude\.json|read-only|Forced core override" plugins/wonder-workflows/commands/wsf-run.md
```

Expected: matches in the new §1 section.

---

### Task 3: orchestrator — extension binding semantics

**Files:**
- Modify: `plugins/wonder-workflows/agents/orchestrator.md`

- [ ] **Step 1: Add the Extension Binding section after `## Input`**

Insert after the `## Input` section (before `## Clarifying Questions`):

````markdown
## Extension Binding (`ws-state.claude.json`)

`/wsf-run` passes extension-binding context loaded from the project-root `ws-state.claude.json`. Treat it as read-only feature flags:

- **wonder-utilities bound** (`enabled: true`, or no registry exists but its components are available in-session): the template-promotion flow is active — stage agents may consume wonder-utilities skills, and the Final Summary appends the Evolution Reminder when `[TEMPLATE CANDIDATE]` markers exist.
- **wonder-utilities not bound** (`enabled: false`, or components absent): suppress the Evolution Reminder and do not reference `/wsu-template`.
- **wonder-plugins bound** (`enabled: true`): stage agents may fuse the registered companion tooling into their stages (e.g. superpowers skills, context7 docs lookup, claude-md-management, code-simplifier) — but only companions listed `enabled: true` under `companion-plugins`.
- **wonder-plugins not bound**: run with built-in behavior only. The pipeline must complete fully without any companion (self-reliant fallback — never stall because an extension is missing).
- Never write to the registry during a run; the forced-core-override correction is handled by `/wsf-run` before dispatch.
````

- [ ] **Step 2: Make the Evolution Reminder conditional on the binding**

In `## Final Summary`, replace:

```
[If any [TEMPLATE CANDIDATE] markers were found in work-doc.md, append this reminder:]
```

With:

```
[If wonder-utilities is bound (see Extension Binding) AND any [TEMPLATE CANDIDATE] markers were found in work-doc.md, append this reminder:]
```

- [ ] **Step 3: Verify**

```bash
grep -nE "Extension Binding|ws-state\.claude\.json|wonder-utilities is bound" plugins/wonder-workflows/agents/orchestrator.md
```

Expected: matches in the new section and Final Summary.

---

### Task 4: Repo docs — CLAUDE.md + README.md

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

- [ ] **Step 1: CLAUDE.md — add a State Registry section**

Insert before `## Development Rules`:

````markdown
## State Registry (`ws-state.<platform>.json`)

- `/wsf-init` provisions a platform-isolated feature registry `ws-state.claude.json` at the **target project root** (design: `docs/system-design.md` §7). `/wsf-run` reads it as read-only extension-binding context.
- Self-healing policy (§7.3): invalid JSON → backup to `.bak` + regenerate; `wonder-workflows.enabled` is always forced `true`; entries whose components are missing are pruned, never crashed on.
- Each platform owns exactly one registry file (`ws-state.claude.json` · `ws-state.codex.json` · …) — never cross-read or cross-write between platforms. Codex/Antigravity registries are roadmap (§8.2).
````

- [ ] **Step 2: README.md — update the wsf-init command row and the wonder-workflows section**

In the `## Commands` table, replace the `/wsf-init` row description:

```
| `/wsf-init` | wonder-workflows | Project initialization — layer ADR reverse-engineering + HTML reports |
```

With:

```
| `/wsf-init` | wonder-workflows | Project initialization — ws-state.claude.json registry provisioning + layer ADR reverse-engineering + HTML reports |
```

In the `### wonder-workflows` section, after the `- **Init reports**: …` bullet, add:

```
- **State registry**: `ws-state.claude.json` (project root) — feature-flag registry provisioned by `/wsf-init`, bound read-only by `/wsf-run`
```

- [ ] **Step 3: Verify**

```bash
grep -nE "ws-state\.claude\.json" CLAUDE.md README.md
```

Expected: matches in both files.

---

### Task 5: Update spec status markers in `docs/system-design.md`

**Files:**
- Modify: `docs/system-design.md`

- [ ] **Step 1: §7 header callout — split status**

Replace:

```
> 🚧 **로드맵 (미구현):** 본 섹션의 `ws-state.<platform>.json` 레지스트리는 현재 코드베이스에 **존재하지 않습니다.** 확정된 목표 설계로서 기술하며, 실제 구현 시 **init타임 프로비저닝 단계**(예: `wsf-init`)로 생성·병합됩니다. 핵심은 **런타임 인터셉트가 아니라는 점**입니다 — 에이전트는 이 파일을 *읽기용 컨텍스트*로 참조할 뿐, 호스트의 도구 디스패치에 끼어들지 않습니다.
```

With:

```
> **구현 상태:** Claude는 ✅ 구현됨 — `/wsf-init`이 `ws-state.claude.json`을 init타임에 프로비저닝하고(자가등록·병합), `/wsf-run`·orchestrator가 읽기 전용 바인딩 + §7.3 자가치유를 수행합니다. Codex·Antigravity 레지스트리는 🚧 로드맵입니다. 핵심은 **런타임 인터셉트가 아니라는 점**입니다 — 에이전트는 이 파일을 *읽기용 컨텍스트*로 참조할 뿐, 호스트의 도구 디스패치에 끼어들지 않습니다.
```

- [ ] **Step 2: §8.1 — add the implemented bullet**

After the last §8.1 bullet (`* 추상 도구 정적 매핑 …`), add:

```
* `ws-state.claude.json` 레지스트리 (Claude) — `/wsf-init` init타임 프로비저닝(자가등록·병합), `/wsf-run`·orchestrator 읽기 전용 바인딩, §7.3 자가치유 정책.
```

- [ ] **Step 3: §8.2 item 4 — narrow remaining scope**

Replace:

```
4. **[§7] `ws-state.<platform>.json` 구현** — init타임 프로비저닝(`wsf-init`), 자가등록·피처플래그 토글·자가치유(§7.3) 구현.
```

With:

```
4. **[§7] `ws-state.<platform>.json` 구현** — Claude(`ws-state.claude.json`)는 ✅ 구현 완료. 잔여: Codex·Antigravity 레지스트리 프로비저닝 및 마스터 템플릿(`ws-state.template.json`) 기반 멀티플랫폼 빌드(§7.4).
```

---

### Task 6: Validate + feat commit

- [ ] **Step 1: Plugin validation**

```bash
npm run validate
```

Expected: all three `claude plugin validate` calls pass.

- [ ] **Step 2: Grep gate — no legacy state-file references reintroduced**

```bash
grep -rnE "\.ws-state\.json|write-state" plugins/ CLAUDE.md README.md && echo "FOUND — fix" || echo "clean"
```

Expected: `clean` (the new file is `ws-state.claude.json`, dot-less prefix, registry semantics — distinct from the deleted `.ws-state.json` pipeline state).

- [ ] **Step 3: Commit**

```bash
git add plugins/wonder-workflows/commands/wsf-init.md plugins/wonder-workflows/commands/wsf-run.md plugins/wonder-workflows/agents/orchestrator.md CLAUDE.md README.md docs/system-design.md
git commit -m "feat: provision ws-state.claude.json registry with read-only pipeline binding

- /wsf-init: self-registration scan, merge policy, §7.3 self-healing (bak backup,
  forced core override, missing-component pruning, custom-entry restriction)
- /wsf-run: load registry as read-only extension-binding context before dispatch
- orchestrator: bind template promotion + companion tooling on registry flags,
  self-reliant fallback when extensions are absent
- docs: CLAUDE.md/README state-registry sections; system-design.md status markers"
```

---

### Task 7: Version bump (wonder-workflows 0.2.0 → 0.3.0)

**Files:**
- Modify: `plugins/wonder-workflows/.claude-plugin/plugin.json` (`"version": "0.2.0"` → `"0.3.0"`)
- Modify: `.claude-plugin/marketplace.json` (wonder-workflows entry `"version": "0.2.0"` → `"0.3.0"`)
- Modify: `README.md` (structure tree `wonder-workflows/ … (v0.2.0)` → `(v0.3.0)`)

- [ ] **Step 1: Apply the three version edits**

- [ ] **Step 2: Verify consistency**

```bash
grep -n "0\.3\.0" plugins/wonder-workflows/.claude-plugin/plugin.json .claude-plugin/marketplace.json README.md
```

Expected: one match per file.

- [ ] **Step 3: Commit**

```bash
git add plugins/wonder-workflows/.claude-plugin/plugin.json .claude-plugin/marketplace.json README.md
git commit -m "chore: bump wonder-workflows to 0.3.0"
```
