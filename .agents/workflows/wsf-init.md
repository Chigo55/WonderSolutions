---
name: "wsf-init"
description: "Initializes wonder-workflows for a project — reverse-engineers ADRs, generates project-specific rules, and produces HTML reports. Run once per project before using /wsf-run."
---

# /wsf-init

Initializes wonder-workflows on a new project through three mandatory steps executed in order for each active layer.

## 0. Parse flags

Read arguments for `--layers` (comma-separated list of active layers, e.g. `--layers core-logic,security`).
If no flags are provided, auto-detect the project structure and ask the user which active layers to initialize (defaulting to `security`).

## 1–3. For each active layer (sequentially)

Process layers one at a time. For each layer:

### Step 1 — ADR Reverse-Engineering

Invoke **ruler** in **enact mode (adr-extract step)** for the layer.

Ruler will:
1. Explore project source files for this layer
2. Infer 3–7 architectural decisions
3. Present the ADR summary to the user for confirmation
4. Write `.claude/adr/{layer}.md`

After ruler confirms the ADR file (`.claude/adr/{layer}.md`) is written, proceed to Step 2.

### Step 2 — Rule Generation

Invoke **ruler** in **enact mode (generate step)** for the layer.

Ruler will:
1. Load the meta-rule from `${CLAUDE_PLUGIN_ROOT}/rules/structure.md` (for custom structural layers) or `${CLAUDE_PLUGIN_ROOT}/rules/{layer}.md` (for `security`).
2. Load `.claude/adr/{layer}.md` (required — ruler will abort if absent)
3. Draft the project-specific rule, cross-referencing ADR constraints
4. Present extracted conventions and any ADR conflicts to the user
5. Write `.claude/rules/{layer}.md`

After ruler confirms the rule file (`.claude/rules/{layer}.md`) is written, proceed to Step 3.

### Step 3 — HTML Report

Generate a self-contained HTML report for this layer. The report filename must follow the pattern `wsf-init-{layer}-YYYYMMDD-HHMMSS.html` where the timestamp is UTC.

Write the report to `.claude/reports/wsf-init-{layer}-YYYYMMDD-HHMMSS.html`.

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
  <pre>{full content of .claude/rules/{layer}.md}</pre>
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

## 4. Result Report

After all active layers are processed, output:

```
wsf-init complete.

Generated:
  ✓ {layer-name-1} — .claude/adr/{layer-name-1}.md, .claude/rules/{layer-name-1}.md, .claude/reports/wsf-init-{layer-name-1}-YYYYMMDD-HHMMSS.html
  ✓ {layer-name-2} — ...
  ...

Skipped:
  — {layer-name-3} (already existed, user chose skip)
  ...

Next step: Run /wsf-run to start a development task.
Open .claude/reports/ to review the initialization reports.
```

## Overwrite Policy

Before Step 1 for each layer, check whether `.claude/adr/{layer}.md` or `.claude/rules/{layer}.md` already exists.

- If either exists, ask:
  > "`.claude/adr/{layer}.md` and/or `.claude/rules/{layer}.md` already exist. Overwrite or skip? (overwrite / skip)"
  - `skip` → proceed to the next layer.
  - `overwrite` → continue with Step 1, which will overwrite both artifacts for this layer.
