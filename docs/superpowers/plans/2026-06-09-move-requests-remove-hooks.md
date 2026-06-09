# Move requests to wonder-utilities + remove hooks — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Relocate the request-form seeds to wonder-utilities and delete the entire wonder-workflows `hooks/` subsystem, converting the 6-stage pipeline to a fully stateless, convention-driven model.

**Architecture:** No `.claude/.ws-state.json`, no PreToolUse enforcement, no SessionStart copier. The orchestrator tracks stages in-conversation; generated artifacts (ADR/rules/reports/runs) are the source of truth. Request forms are provisioned manually (reference copies ship in wonder-utilities). The two plugins stay independent — workflows references utilities only via a soft doc pointer, never a file path.

**Tech Stack:** Claude Code plugin markdown/JSON. No runtime code remains after the hooks deletion. Verification via `npm run validate` (claude plugin validate) + grep gates.

**Spec:** `docs/superpowers/specs/2026-06-09-move-requests-remove-hooks-design.md`

**Commit strategy:** All refactor edits (Tasks 1–9) land in ONE `refactor:` commit (Task 11). Version bumps land in a SEPARATE `chore:` commit (Task 12). This matches the CLAUDE.md commit-order rule.

**Out of scope (do NOT change):** the README header version badge (line 9), `package.json` `version` (monorepo root stays `0.1.0`), `wonder-plugins` version, and the `wsf-review.md` command (no hook/state refs).

---

### Task 1: Move the two request seeds to wonder-utilities

**Files:**
- Move: `plugins/wonder-workflows/requests/create_request.md` → `plugins/wonder-utilities/requests/create_request.md`
- Move: `plugins/wonder-workflows/requests/modify_request.md` → `plugins/wonder-utilities/requests/modify_request.md`

- [ ] **Step 1: Create the destination dir and move both files with git (preserves history)**

```bash
cd /d/01_personal/04_project/02_wonder-solutions
mkdir -p plugins/wonder-utilities/requests
git mv plugins/wonder-workflows/requests/create_request.md plugins/wonder-utilities/requests/create_request.md
git mv plugins/wonder-workflows/requests/modify_request.md plugins/wonder-utilities/requests/modify_request.md
```

- [ ] **Step 2: Verify the move and that the source dir is empty/gone**

```bash
ls plugins/wonder-utilities/requests/
ls plugins/wonder-workflows/requests/ 2>/dev/null || echo "source dir gone (expected)"
git status --short
```

Expected: both `.md` files listed under `wonder-utilities/requests/`; source dir gone; `git status` shows two renames (`R`).

---

### Task 2: Delete the entire hooks/ folder

**Files:**
- Delete: `plugins/wonder-workflows/hooks/` (12 files — see spec §B)

- [ ] **Step 1: Remove the directory with git**

```bash
cd /d/01_personal/04_project/02_wonder-solutions
git rm -r plugins/wonder-workflows/hooks
```

- [ ] **Step 2: Verify it is gone**

```bash
ls plugins/wonder-workflows/hooks 2>/dev/null || echo "hooks/ deleted (expected)"
git status --short | grep hooks
```

Expected: `hooks/ deleted (expected)`; `git status` shows 12 deletions (`D`) under `hooks/`.

---

### Task 3: Make orchestrator.md stateless

**Files:**
- Modify: `plugins/wonder-workflows/agents/orchestrator.md`

- [ ] **Step 1: Replace the stage-state block with in-conversation tracking**

Replace:

````
For each stage, update state BEFORE invoking the agent:

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/write-state.js" "<cwd>" "current.stage" "<stage-name>"
```

Then invoke the specialist agent (use the Agent tool with the agent name). Pass the previous stage's output as context.
````

With:

```
For each stage, track the current stage yourself in this conversation, then invoke the specialist agent (use the Agent tool with the agent name). Pass the previous stage's output as context.
```

- [ ] **Step 2: Drop the now-meaningless "State value" column from the stage table**

Replace:

```
| # | Stage | Agent | State value |
|---|-------|-------|------------|
| 1 | Analysis | analyzer | `analyzer` |
| 2 | Research | researcher | `researcher` |
| 3 | Planning | planner | `planner` |
| 4 | Implementation | developer | `developer` |
| 5 | Inspection | inspector | `inspector` |
| 6 | Modification | modifier | `modifier` |
```

With:

```
| # | Stage | Agent |
|---|-------|-------|
| 1 | Analysis | analyzer |
| 2 | Research | researcher |
| 3 | Planning | planner |
| 4 | Implementation | developer |
| 5 | Inspection | inspector |
| 6 | Modification | modifier |
```

- [ ] **Step 3: Remove the state updates in the close branch**

Replace:

```
- If **modify**: update stage to `modifier`, invoke modifier agent.
- If **close**: update `current.stage` to `null`, update `current.command` to `null`. Present final summary.
```

With:

```
- If **modify**: invoke the modifier agent.
- If **close**: present the final summary.
```

- [ ] **Step 4: Remove the trailing "Reset state" line**

Replace (note the leading blank line):

```

Reset state: command=null, run-id=null, stage=null.
```

With a single trailing newline (delete the sentence entirely so the file ends after the Final Summary code block).

- [ ] **Step 5: Verify no state/hook references remain in this file**

```bash
grep -nE "write-state|ws-state|current\.(stage|command)|State value|Reset state" plugins/wonder-workflows/agents/orchestrator.md || echo "clean"
```

Expected: `clean`.

---

### Task 4: Strip state + copier from wsf-init.md

**Files:**
- Modify: `plugins/wonder-workflows/commands/wsf-init.md`

- [ ] **Step 1: Update the front-matter description (drop "copies request seeds")**

Replace:

```
description: Initializes wonder-workflows for a project — copies request seeds, reverse-engineers ADRs, generates project-specific rules, and produces HTML reports. Run once per project before using /wsf-run.
```

With:

```
description: Initializes wonder-workflows for a project — reverse-engineers ADRs, generates project-specific rules, and produces HTML reports. Run once per project before using /wsf-run.
```

- [ ] **Step 2: Replace section 0 (remove the seed-copy block entirely)**

Replace:

```
## 0. Parse flags and copy request seeds

Read arguments for `--layers` (comma-separated list of active layers, e.g. `--layers core-logic,security`).
If no flags are provided, auto-detect the project structure and ask the user which active layers to initialize (defaulting to `security`).

Copy request seeds (runs once, before the layer loop):
- This is handled automatically by the `SessionStart` hook (`init-requests.js`).
- Verify `.claude/requests/create_request.md` exists.
- If missing, run: `node ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/init-requests.js` via the Bash tool with `{"cwd": "<project_cwd>"}` on stdin.
```

With:

```
## 0. Parse flags

Read arguments for `--layers` (comma-separated list of active layers, e.g. `--layers core-logic,security`).
If no flags are provided, auto-detect the project structure and ask the user which active layers to initialize (defaulting to `security`).
```

- [ ] **Step 3: Remove the Step 1 ADR state record**

Replace:

````
After ruler confirms the ADR file is written, record the timestamp in state:

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/write-state.js" "<cwd>" "adr.{layer}" "<ISO-timestamp>"
```

Replace `{layer}` with the actual layer name and `<ISO-timestamp>` with the current UTC time in ISO 8601 format (e.g. `2026-06-05T10:00:00Z`).
````

With:

```
After ruler confirms the ADR file (`.claude/adr/{layer}.md`) is written, proceed to Step 2.
```

- [ ] **Step 4: Remove the Step 2 rules state record**

Replace:

````
After ruler confirms the rule file is written, record the timestamp:

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/write-state.js" "<cwd>" "rules.{layer}" "<ISO-timestamp>"
```
````

With:

```
After ruler confirms the rule file (`.claude/rules/{layer}.md`) is written, proceed to Step 3.
```

- [ ] **Step 5: Remove the Step 3 report state record**

Replace (delete the whole block including the preceding blank line):

````

After writing the report file, record it in state:

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/write-state.js" "<cwd>" "reports.{layer}" "wsf-init-{layer}-YYYYMMDD-HHMMSS.html"
```
````

With a single blank line (so "## 4. Result Report" follows the HTML block directly).

- [ ] **Step 6: Fix the Overwrite Policy "reset state entries" wording**

Replace:

```
  - `overwrite` → continue with Step 1, which will overwrite both artifacts and reset state entries for this layer.
```

With:

```
  - `overwrite` → continue with Step 1, which will overwrite both artifacts for this layer.
```

- [ ] **Step 7: Verify clean**

```bash
grep -nE "write-state|init-requests|SessionStart|reset state" plugins/wonder-workflows/commands/wsf-init.md || echo "clean"
```

Expected: `clean`.

---

### Task 5: Strip state from wsf-run.md + add manual-provisioning guidance

**Files:**
- Modify: `plugins/wonder-workflows/commands/wsf-run.md`

- [ ] **Step 1: Update the no-argument branch to handle an absent file + point at the utilities reference copy**

Replace:

```
- **No argument**: read `.claude/requests/create_request.md`. Validate that `## Goal`, `## Scope`, `## Constraints`, `## Acceptance Criteria` are all present and non-empty. If any section is missing or blank, stop and report: "Please fill in the missing sections in `.claude/requests/create_request.md` before running `/wsf-run`."
```

With:

```
- **No argument**: read `.claude/requests/create_request.md`. If the file does not exist, stop and report: "`.claude/requests/create_request.md` not found. Create it first — a reference template ships in the wonder-utilities plugin under `requests/create_request.md`." If it exists, validate that `## Goal`, `## Scope`, `## Constraints`, `## Acceptance Criteria` are all present and non-empty. If any section is missing or blank, stop and report: "Please fill in the missing sections in `.claude/requests/create_request.md` before running `/wsf-run`."
```

- [ ] **Step 2: Remove the "Initialize pipeline state" section and renumber "Dispatch orchestrator"**

Replace:

````
## 1. Initialize pipeline state

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/write-state.js" "<cwd>" "current.command" "wsf-run"
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/write-state.js" "<cwd>" "current.run-id"  null
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/write-state.js" "<cwd>" "current.stage"   null
```

## 2. Dispatch orchestrator
````

With:

```
## 1. Dispatch orchestrator
```

- [ ] **Step 3: Drop "and state setup" from the orchestrator responsibility list**

Replace:

```
2. Run ID generation and state setup
```

With:

```
2. Run ID generation
```

- [ ] **Step 4: Remove the entire "Reset state on completion" section**

Replace (delete the whole section including the leading blank line):

````

## 3. Reset state on completion

After the orchestrator signals completion or the user closes the task, reset:

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/write-state.js" "<cwd>" "current.command" null
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/write-state.js" "<cwd>" "current.run-id"  null
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/write-state.js" "<cwd>" "current.stage"   null
```
````

With nothing (the file ends after section 2's content).

- [ ] **Step 5: Verify clean**

```bash
grep -nE "write-state|ws-state|Initialize pipeline state|Reset state" plugins/wonder-workflows/commands/wsf-run.md || echo "clean"
```

Expected: `clean`.

---

### Task 6: Strip state from wsf-rules.md

**Files:**
- Modify: `plugins/wonder-workflows/commands/wsf-rules.md`

- [ ] **Step 1: Remove the "Record state" step from Amend mode**

Replace:

````
5. On approval, ruler writes the updated `.claude/rules/{layer}.md` and appends amendment log to `.claude/adr/{layer}.md`.
6. Record state:

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/write-state.js" "<cwd>" "rules.{layer}" "<ISO-timestamp>"
```
````

With:

```
5. On approval, ruler writes the updated `.claude/rules/{layer}.md` and appends amendment log to `.claude/adr/{layer}.md`.
```

- [ ] **Step 2: Verify clean**

```bash
grep -nE "write-state|ws-state|Record state" plugins/wonder-workflows/commands/wsf-rules.md || echo "clean"
```

Expected: `clean`.

---

### Task 7: Scrub `.ws-state.json` / hook-enforcement references from meta-rules

**Files:**
- Modify: `plugins/wonder-workflows/rules/workflow.md`
- Modify: `plugins/wonder-workflows/rules/structure.md`
- Modify: `plugins/wonder-workflows/rules/security.md`

- [ ] **Step 1: workflow.md — rewrite the Enforcement section (hooks no longer enforce)**

Replace:

```
## Enforcement

- In `/wsf-run` command mode: hooks enforce stage ordering. Writing the wrong artifact type for the current stage is blocked.
- In prompt mode: this workflow is recommended but not enforced. The assistant should follow it proactively.
```

With:

```
## Enforcement

This workflow is enforced by convention, not by hooks. The orchestrator drives stage ordering and each agent follows its documented stage permissions. Writing artifacts out of stage order should be avoided — the orchestrator is responsible for keeping stages in sequence in both command and prompt modes.
```

- [ ] **Step 2: workflow.md — drop the `.ws-state.json` active-layer reference**

Replace:

```
- `.claude/rules/{layer}.md` (for each layer declared active in `.claude/.ws-state.json`) — structural and layer conventions
```

With:

```
- `.claude/rules/{layer}.md` (one file per active layer present in `.claude/rules/`) — structural and layer conventions
```

- [ ] **Step 3: structure.md — degenericize the Archetype A self-reference**

Replace:

```
*wonder-workflows 자체 훅 서브시스템과 같은 CLI/라이브러리 레이어 생성 시의 룰 모델입니다.*
```

With:

```
*제로 의존성 CLI/라이브러리 레이어(예: stdin 기반 스크립트, 무의존 헬퍼) 생성 시의 룰 모델입니다.*
```

- [ ] **Step 4: structure.md — generalize the deleted-file dependency example**

Replace:

```
- 훅 엔트리(`hooks/scripts/*.js`) -> 가드 모듈(`lib/*-guard.js`) -> 상태 모듈(`lib/state.js`)의 하향식 단방향 의존성 구조를 가짐. 역방향 import는 금지됨.
```

With:

```
- 진입 스크립트(`bin/*.js` · `scripts/*.js`) -> 로직/가드 모듈(순수 함수) -> 상태·IO 모듈의 하향식 단방향 의존성 구조를 가짐. 역방향 import는 금지됨.
```

- [ ] **Step 5: structure.md — replace the deleted `.ws-state.json` data-store reference**

Replace:

```
- 데이터 저장소는 단일 로컬 JSON 파일(`.claude/.ws-state.json`)로 한정함.
```

With:

```
- 데이터 저장소는 단일 로컬 JSON 파일(예: `.claude/<tool>-state.json`)로 한정함.
```

- [ ] **Step 6: security.md — replace the deleted `writeState()` / `.ws-state.json` mandate**

Replace:

```
- 모든 데이터 상태 변화는 `.claude/.ws-state.json`에 국한하며, immutable spread 기법을 사용한 `writeState()` 헬퍼만을 통해서 작성해야 함. 직접적인 파일 스트림 쓰기는 금지됨.
```

With:

```
- 모든 데이터 상태 변화는 단일 로컬 상태 파일(예: `.claude/<tool>-state.json`)에 국한하며, immutable spread로 새 객체를 만든 뒤 임시 파일 생성 후 원자적 교체(`fs.renameSync`)로 작성해야 함. 직접적인 파일 스트림 쓰기는 금지됨.
```

- [ ] **Step 7: Verify no deleted-subsystem references remain in rules/**

```bash
grep -rnE "\.ws-state\.json|writeState|hooks enforce|hooks/scripts" plugins/wonder-workflows/rules/ || echo "clean"
```

Expected: `clean`. (Note: generic mentions of `훅`/`hook` as an archetype category are intentionally retained.)

---

### Task 8: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Remove `hooks/` + `requests/` from the wonder-workflows tree (rules/ becomes last)**

Replace:

```
  │     │     ├── hooks/             ← event hooks (hooks.json + scripts/ — init & pipeline-stage enforcement)
  │     │     ├── rules/             ← pipeline meta-rules (structure · security · workflow)
  │     │     └── requests/          ← request form seeds (create_request · modify_request)
```

With:

```
  │     │     └── rules/             ← pipeline meta-rules (structure · security · workflow)
```

- [ ] **Step 2: Add `requests/` to the wonder-utilities tree**

Replace:

```
  │     │     ├── templates/         ← template catalog (index.json + index.schema.json + scaffolds/)
  │     │     └── skills/            ← SKILL.md skills (cave-man · grill-me · hand-off · write-a-skill)
```

With:

```
  │     │     ├── templates/         ← template catalog (index.json + index.schema.json + scaffolds/)
  │     │     ├── requests/          ← request form seeds (create_request · modify_request)
  │     │     └── skills/            ← SKILL.md skills (cave-man · grill-me · hand-off · write-a-skill)
```

- [ ] **Step 3: Remove the `hooks/hooks.json` row from the Plugin Structure Rules table**

Replace:

```
| `hooks/hooks.json` | Authoritative hook declaration (scripts go in `hooks/scripts/`) — wonder-workflows only |
```

With nothing (delete the entire line).

- [ ] **Step 4: Re-home the `requests/` table row to wonder-utilities**

Replace:

```
| `requests/` | Request form seeds (copied to `.claude/requests/`) — wonder-workflows only |
```

With:

```
| `requests/` | Request form seeds (reference copies; provisioned manually) — wonder-utilities only |
```

- [ ] **Step 5: Remove the PreToolUse-enforcement Development Rules bullet**

Replace (delete the entire line):

```
- Hooks are non-blocking by default (suggestions, not blocks). **Exception**: the two PreToolUse enforcement hooks (`hooks/scripts/enforce-init.js`, `hooks/scripts/enforce-stage.js`) in wonder-workflows block `Write|Edit` calls via `permissionDecision: "deny"` — `enforce-init.js` when `/wsf-init` has not yet completed, and `enforce-stage.js` when the active pipeline stage forbids writing the target file. (The `SessionStart` hook `init-requests.js` is non-blocking — it only copies request seeds.)
```

With nothing. (Keep the preceding "Hooks must be lightweight JS…" line as forward guidance.)

- [ ] **Step 6: Verify clean**

```bash
grep -nE "hooks/|enforce-|init-requests|ws-state|copied to \`\.claude/requests" CLAUDE.md || echo "clean"
```

Expected: `clean` (the only remaining `hooks` mention is the wonder-plugins "no commands/agents/hooks/skills" line, which is correct — confirm that is the sole match if grep returns anything).

---

### Task 9: Update README.md (structure only — keep version annotations at v0.1.0 for Task 12)

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Remove the "Stage enforcement hooks" overview bullet**

Replace (delete the entire line):

```
- **Stage enforcement hooks**: block `Write`/`Edit` calls that fall outside the active pipeline stage
```

With nothing.

- [ ] **Step 2: Remove the Hooks + State file bullets from the wonder-workflows section**

Replace:

```
- **Hooks**: `enforce-init.js` (blocks writes until `/wsf-init` completes) · `enforce-stage.js` (blocks off-stage writes) · `init-requests.js` (SessionStart, copies request seeds)
- **State file**: `.claude/.ws-state.json`
- **Init reports**: `.claude/reports/wsf-init-{layer}-{timestamp}.html`
```

With:

```
- **Init reports**: `.claude/reports/wsf-init-{layer}-{timestamp}.html`
```

- [ ] **Step 3: Drop "+ state record" from the /wsf-init command-table row**

Replace:

```
| `/wsf-init` | wonder-workflows | Project initialization — layer ADR reverse-engineering + state record + HTML reports |
```

With:

```
| `/wsf-init` | wonder-workflows | Project initialization — layer ADR reverse-engineering + HTML reports |
```

- [ ] **Step 4: Remove `hooks/` + `requests/` from the wonder-workflows repo tree**

Replace:

```
      agents/                    ← orchestrator · analyzer · researcher · planner · developer · inspector · modifier · ruler
      hooks/                     ← enforce-init · enforce-stage · init-requests
      rules/                     ← structure · security · workflow
      requests/                  ← request form seeds
```

With:

```
      agents/                    ← orchestrator · analyzer · researcher · planner · developer · inspector · modifier · ruler
      rules/                     ← structure · security · workflow
```

- [ ] **Step 5: Add `requests/` to the wonder-utilities repo tree**

Replace:

```
      templates/                 ← global template catalog (index.json + scaffolds/)
      skills/                    ← cave-man · grill-me · hand-off · write-a-skill
```

With:

```
      templates/                 ← global template catalog (index.json + scaffolds/)
      requests/                  ← request form seeds
      skills/                    ← cave-man · grill-me · hand-off · write-a-skill
```

- [ ] **Step 6: Verify clean (no hook/state references; version annotations still v0.1.0)**

```bash
grep -nE "enforce-|init-requests|ws-state|State file|enforcement hooks" README.md || echo "clean"
grep -nE "\(v0\.1\.0\)" README.md
```

Expected: first grep prints `clean`; second still shows the three `(v0.1.0)` tree annotations (bumped in Task 12).

---

### Task 10: Full-repo verification gate

- [ ] **Step 1: Assert zero references to the deleted subsystem across wonder-workflows**

```bash
cd /d/01_personal/04_project/02_wonder-solutions
grep -rnE "write-state|\.ws-state|init-requests|enforce-init|enforce-stage|SessionStart|requests_copied" plugins/wonder-workflows/ && echo "FOUND — fix before commit" || echo "clean"
```

Expected: `clean`.

- [ ] **Step 2: Assert the moved seeds carry no stale pipeline/hook references**

```bash
grep -rnE "init-requests|write-state|\.ws-state" plugins/wonder-utilities/requests/ && echo "FOUND — fix" || echo "clean"
```

Expected: `clean`.

- [ ] **Step 3: Validate all three plugin structures**

```bash
npm run validate
```

Expected: all three plugins report valid (no errors). If `claude` CLI is unavailable in this environment, note it and rely on the grep gates + manual JSON lint instead.

- [ ] **Step 4: Run the test script (no tests remain after hooks deletion)**

```bash
npm test
```

Expected: `node --test` finds no test files and exits 0 (0 tests). If it exits non-zero on "no test files," note it — do NOT add placeholder tests; this is acceptable for a docs/manifest repo.

---

### Task 11: Commit the refactor

- [ ] **Step 1: Stage everything and review the diff summary**

```bash
cd /d/01_personal/04_project/02_wonder-solutions
git add -A
git status --short
```

Expected: 2 renames (request seeds), 12 deletions (hooks/), and modifications to orchestrator.md, wsf-init.md, wsf-run.md, wsf-rules.md, rules/{workflow,structure,security}.md, CLAUDE.md, README.md, and the new spec+plan docs.

- [ ] **Step 2: Commit**

```bash
git commit -m "refactor: move request seeds to wonder-utilities and remove hooks subsystem

- Relocate create_request.md/modify_request.md to wonder-utilities/requests/
- Delete the entire wonder-workflows/hooks/ folder (enforcement + state machine + copier)
- Make the pipeline stateless: strip all write-state.js calls from orchestrator + commands
- Provision request forms manually; keep plugins independent
- Scrub .ws-state.json / hook-enforcement references from meta-rules and docs"
```

- [ ] **Step 3: Confirm the commit**

```bash
git log --oneline -1
```

Expected: the refactor commit is HEAD.

---

### Task 12: Bump both plugin versions (separate chore commit)

**Files:**
- Modify: `plugins/wonder-workflows/.claude-plugin/plugin.json`
- Modify: `plugins/wonder-utilities/.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`
- Modify: `README.md` (the two bumped plugins' tree annotations)

- [ ] **Step 1: Bump wonder-workflows plugin.json**

In `plugins/wonder-workflows/.claude-plugin/plugin.json`, replace `"version": "0.1.0",` with `"version": "0.2.0",`.

- [ ] **Step 2: Bump wonder-utilities plugin.json**

In `plugins/wonder-utilities/.claude-plugin/plugin.json`, replace `"version": "0.1.0",` with `"version": "0.2.0",`.

- [ ] **Step 3: Bump the two entries in marketplace.json**

In `.claude-plugin/marketplace.json`, the `wonder-workflows` entry: replace its `"version": "0.1.0",` with `"version": "0.2.0",`. Then the `wonder-utilities` entry: replace its `"version": "0.1.0",` with `"version": "0.2.0",`. **Leave the `wonder-plugins` entry at `0.1.0`.** Because all three currently read `"version": "0.1.0",`, do these as targeted edits scoped to each entry (match on the surrounding `"name"` block), not a global replace.

- [ ] **Step 4: Bump the README tree annotations for the two plugins**

In `README.md`, replace `wonder-workflows/            ← pipeline plugin (v0.1.0)` with `wonder-workflows/            ← pipeline plugin (v0.2.0)`, and `wonder-utilities/            ← skills & templates plugin (v0.1.0)` with `wonder-utilities/            ← skills & templates plugin (v0.2.0)`. Leave the `wonder-plugins/ … (v0.1.0)` annotation and the header version badge unchanged.

- [ ] **Step 5: Verify the bumps are consistent**

```bash
grep -rn "0.2.0" plugins/wonder-workflows/.claude-plugin/plugin.json plugins/wonder-utilities/.claude-plugin/plugin.json .claude-plugin/marketplace.json README.md
grep -c "0.1.0" .claude-plugin/marketplace.json
```

Expected: `0.2.0` appears in both plugin.json files, twice in marketplace.json, and twice in README tree; marketplace.json still has exactly one `0.1.0` (wonder-plugins).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: bump wonder-workflows and wonder-utilities to 0.2.0"
git log --oneline -2
```

Expected: chore commit is HEAD, refactor commit directly below it.

---

## Self-Review

**Spec coverage:** §A→T1, §B→T2, §C(orchestrator/wsf-init/wsf-run/wsf-rules)→T3–6, §D→T7, §E(CLAUDE/README)→T8–9, §F→T12, Validation→T10. All sections covered.

**Placeholder scan:** No "TBD"/"TODO"/"handle edge cases" — every edit gives exact old→new strings.

**Consistency:** Version target `0.2.0` used uniformly; "manual provisioning" + "reference copy in wonder-utilities" wording consistent across wsf-run.md (T5) and CLAUDE.md (T8). Stage table column removal (T3) keeps agent names intact. Independence preserved — the only workflows→utilities mention is a soft doc string, never a file path.

**Known environment caveat:** `npm run validate` shells out to the `claude` CLI; if unavailable in the execution context, T10 falls back to grep gates + JSON lint.
