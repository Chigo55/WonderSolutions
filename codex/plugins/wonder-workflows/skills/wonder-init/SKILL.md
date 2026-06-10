---
name: wonder-init
description: Initializes wonder-workflows for a project — provisions the ws-state.codex.json registry, reverse-engineers ADRs, generates project-specific rules, and produces HTML reports. Run once per project before using $wonder-pipeline. Codex projection of /wsf-init; use when the user asks for wsf-init or $wonder-init.
---

> Generated from `plugins/wonder-workflows/commands/wsf-init.md` by `npm run sync:codex` — do not edit by hand.

## Codex Execution Notes

- Runtime state root is `.codex/wonder/`. Treat `.claude/` as a read-only fallback; never write it unless the user explicitly asks.
- **Role provisioning (once per project):** copy this skill's bundled `agents/*.toml` into the project's `.codex/agents/` (keep existing files); copy bundled `references/meta-rules/*.md` into `.codex/wonder/meta-rules/`.
- Delegate stages with `spawn_agent` using those roles; collect results with `wait_agent`, then `close_agent`. `[agents] max_depth` defaults to 1, so perform any nested delegation (e.g. modifier → developer) from this thread.
- Where `${CLAUDE_PLUGIN_ROOT}` appears, it means this plugin's install root.

# $wonder-init

Initializes wonder-workflows on a new project through three mandatory steps executed in order for each active layer.

## 0. Parse flags

Read arguments for `--layers` (comma-separated list of active layers, e.g. `--layers core-logic,security`).
If no flags are provided, auto-detect the project structure and ask the user which active layers to initialize (defaulting to `security`).

## 1. Provision the State Registry (`ws-state.codex.json`)

Before any layer work, provision the platform-isolated feature registry at the **project root**. This file belongs to the current platform only — never read or write another platform's `ws-state.<platform>.json`; each platform owns exactly one registry.

### 1.1 Read the existing file

- **Absent** → build a fresh registry from the scan below (§1.2) and write it.
- **Valid JSON** → merge: keep every `enabled` flag the user has set; refresh each plugin's `version` and `features` from the scan; add newly detected plugins with their default flag; remove entries whose components are no longer detected (missing-component fallback — never crash on a stale entry).
- **Invalid JSON** (parse failure) → rename the corrupt file to `ws-state.codex.json.bak` (replacing any older `.bak`), then build a fresh registry from the scan and write it. Tell the user the backup path.

### 1.2 Self-registration scan

Detect which WonderSolutions components are available in the current session:

| Plugin | Detection signal | Registered `features` |
|---|---|---|
| `wonder-workflows` (self) | always present | agents: `orchestrator` `analyzer` `researcher` `planner` `developer` `inspector` `modifier` `ruler` · commands: `wsf-run` `wsf-init` `wsf-review` `wsf-rules` · rules: `structure.md` `security.md` `workflow.md` |
| `wonder-utilities` | `$wonder-template` command or `templater` agent available in this session | agents: `templater` · commands: `wsu-template` · skills: `cave-man` `grill-me` `hand-off` `write-a-skill` · templates: `index.json` `index.schema.json` · requests: `create_request.md` `modify_request.md` · rules: `templates.md` |
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
  "project": "{project name} (Codex)",
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

After writing, report one line: `ws-state.codex.json provisioned — wonder-utilities: {detected|absent} · wonder-plugins: {detected|absent}`.

## 2–4. For each active layer (sequentially)

Process layers one at a time. For each layer:

### Step 1 — ADR Reverse-Engineering

Invoke **ruler** in **enact mode (adr-extract step)** for the layer.

Ruler will:
1. Explore project source files for this layer
2. Infer 3–7 architectural decisions
3. Present the ADR summary to the user for confirmation
4. Write `.codex/wonder/adr/{layer}.md`

After ruler confirms the ADR file (`.codex/wonder/adr/{layer}.md`) is written, proceed to Step 2.

### Step 2 — Rule Generation

Invoke **ruler** in **enact mode (generate step)** for the layer.

Ruler will:
1. Load the meta-rule from `.codex/wonder/meta-rules/structure.md` (for custom structural layers) or `.codex/wonder/meta-rules/{layer}.md` (for `security`).
2. Load `.codex/wonder/adr/{layer}.md` (required — ruler will abort if absent)
3. Draft the project-specific rule, cross-referencing ADR constraints
4. Present extracted conventions and any ADR conflicts to the user
5. Write `.codex/wonder/rules/{layer}.md`

After ruler confirms the rule file (`.codex/wonder/rules/{layer}.md`) is written, proceed to Step 3.

### Step 3 — HTML Report

Generate a self-contained HTML report for this layer. The report filename must follow the pattern `wsf-init-{layer}-YYYYMMDD-HHMMSS.html` where the timestamp is UTC.

Write the report to `.codex/wonder/reports$wonder-init-{layer}-YYYYMMDD-HHMMSS.html`.

The report is a user-facing document and **must be written entirely in Korean** — all section headings, table headers, labels, descriptions, and narrative text. The report must contain these sections (inline CSS only, no external resources):

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>wsf-init 보고서 — {layer} — {project name}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 960px; margin: 2rem auto; color: #1a1a1a; }
    h1 { border-bottom: 2px solid #333; }
    h2 { margin-top: 2rem; color: #444; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #ccc; padding: 0.5rem 0.75rem; text-align: left; vertical-align: top; }
    th { background: #f5f5f5; font-weight: 600; }
    pre { background: #f8f8f8; padding: 1rem; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; }
    .conflict { background: #fff3cd; border-left: 4px solid #f0ad4e; padding: 0.5rem 1rem; margin: 0.5rem 0; }
    .footer { margin-top: 3rem; color: #888; font-size: 0.85rem; border-top: 1px solid #eee; padding-top: 1rem; }
  </style>
</head>
<body>
  <h1>wsf-init 보고서 — {Layer} 레이어</h1>
  <p><strong>프로젝트:</strong> {project name} &nbsp;|&nbsp; <strong>생성일시:</strong> {UTC datetime}</p>
  <h2>ADR 요약</h2>
  <table>
    <thead><tr><th>ID</th><th>제목</th><th>결정 사항</th><th>결과</th></tr></thead>
    <tbody><!-- ADR 항목당 한 행 --></tbody>
  </table>
  <h2>생성된 규칙</h2>
  <pre>{full content of .codex/wonder/rules/{layer}.md}</pre>
  <h2>ADR ↔ 규칙 매핑</h2>
  <table>
    <thead><tr><th>ADR</th><th>영향받은 규칙 섹션</th></tr></thead>
    <tbody><!-- 상호 참조로부터 채워짐 --></tbody>
  </table>
  <h2>해결된 충돌</h2>
  <div class="conflict">
    <strong>{ADR-N}:</strong> {meta-rule default} → {ADR consequence}로 재정의됨 — 해결: {resolution}
  </div>
  <div class="footer">wonder-workflows wsf-init으로 생성됨 &nbsp;|&nbsp; 플러그인 루트: {CLAUDE_PLUGIN_ROOT}</div>
</body>
</html>
```

## 5. Result Report

After all active layers are processed, output:

```
wsf-init complete.

Generated:
  ✓ ws-state.codex.json — state registry (wonder-utilities: {detected|absent} · wonder-plugins: {detected|absent})
  ✓ {layer-name-1} — .codex/wonder/adr/{layer-name-1}.md, .codex/wonder/rules/{layer-name-1}.md, .codex/wonder/reports$wonder-init-{layer-name-1}-YYYYMMDD-HHMMSS.html
  ✓ {layer-name-2} — ...
  ...

Skipped:
  — {layer-name-3} (already existed, user chose skip)
  ...

Next step: Run $wonder-pipeline to start a development task.
Open .codex/wonder/reports/ to review the initialization reports.
```

## Overwrite Policy

Before Step 1 for each layer, check whether `.codex/wonder/adr/{layer}.md` or `.codex/wonder/rules/{layer}.md` already exists.

- If either exists, ask:
  > "`.codex/wonder/adr/{layer}.md` and/or `.codex/wonder/rules/{layer}.md` already exist. Overwrite or skip? (overwrite / skip)"
  - `skip` → proceed to the next layer.
  - `overwrite` → continue with Step 1, which will overwrite both artifacts for this layer.
