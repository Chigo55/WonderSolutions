# wh-init Redesign — Design Spec

**Date:** 2026-06-05  
**Status:** Approved for implementation  
**Scope:** wonder-harness plugin — `/wh-init` command, ruler agent, hook enforcement

---

## 1. Problem Statement

The current `/wh-init` generates project-specific rules by exploring source code guided by meta-rule Exploration Guides. It works, but has two gaps:

1. **No "why" context.** The ruler sees what conventions exist but not the architectural decisions behind them. Rules generated without ADR context may conflict with existing design constraints or codify accidental patterns.
2. **No enforcement.** Init is advisory — nothing stops a developer from running `/wh-create` on a project that has never been initialized, producing rules-unaware output.

---

## 2. Goals

- Add ADR reverse-engineering as a mandatory pre-step to rule generation, so rules reflect both observable conventions and inferred architectural intent.
- Make init completion a hard gate on `/wh-create` and `/wh-modify` via hook enforcement.
- Enforce step ordering within `/wh-init` itself (hook-level, not just command-level).
- Produce a human-readable HTML report per layer, versioned by timestamp.

---

## 3. Decisions Made

| Topic | Decision |
|---|---|
| Hook enforcement scope | **C** — internal step ordering AND cross-command gate |
| ADR storage | **C** — permanently stored in `.claude/adr/`, reusable for future rule updates |
| HTML report versioning | **B+C** — timestamp-versioned per layer |
| State tracking approach | **B** — `.claude/.wh-state.json` as single source of truth |

---

## 4. New Init Flow

```
/wh-init [--backend] [--frontend] [--security] [--templates]
          (no flags = all four layers)

  Step 0  ──  Copy request seeds  (runs ONCE, before any layer loop)
              init-requests.js copies create_request.md + modify_request.md
              to .claude/requests/ (skip if already exists)
              → writes state: requests_copied = true

  For each selected layer, sequentially:

    Step 1  ──  ADR reverse-engineering  [NEW]
                ruler (adr-extract mode) explores project source
                → writes .claude/adr/{layer}.md
                → writes state: adr.{layer} = ISO-timestamp

    Step 2  ──  Rule generation  [ENHANCED]
                ruler (generate mode) reads meta-rule + .claude/adr/{layer}.md
                → writes .claude/rules/{layer}.md
                → writes state: rules.{layer} = ISO-timestamp

    Step 3  ──  HTML report  [NEW]
                ruler produces HTML summary
                → writes .claude/reports/wh-init-{layer}-YYYYMMDD-HHMMSS.html
                → writes state: reports.{layer} = filename
```

Steps must execute in order. A hook blocks Step 2 if Step 1 is not recorded in state for that layer, and blocks Step 3 if Step 2 is not recorded.

---

## 5. State File Schema

**Path:** `.claude/.wh-state.json`

```json
{
  "version": 1,
  "requests_copied": true,
  "adr": {
    "backend":   "2026-06-05T10:00:00Z",
    "frontend":  null,
    "security":  null,
    "templates": null
  },
  "rules": {
    "backend":   "2026-06-05T10:05:00Z",
    "frontend":  null,
    "security":  null,
    "templates": null
  },
  "reports": {
    "backend":   "wh-init-backend-20260605-100500.html",
    "frontend":  null,
    "security":  null,
    "templates": null
  }
}
```

**Invariants:**
- `rules.{layer}` must not be set before `adr.{layer}` is set.
- `reports.{layer}` must not be set before `rules.{layer}` is set.
- The state file is the hook's single source of truth. Artifact existence (`.claude/adr/*.md`, `.claude/rules/*.md`) is checked as a secondary guard when the state file is absent or corrupt.

---

## 6. Hook Enforcement Design

### 6a. Cross-command gate — block wh-create / wh-modify before init

**Hook:** `PreToolUse` on `Write|Edit`  
**Script:** `hooks/scripts/enforce-init.js`  
**Logic:**

```
if file_path is NOT under .claude/ AND NOT under plugin root:
  read .claude/.wh-state.json
  if state file missing entirely:
    deny: "wonder-harness has not been initialized. Run /wh-init first."
  if state.rules has NO layer with a non-null value:
    deny: "No layer has been fully initialized. Run /wh-init [--layer] first."
  → allow (partial init is permitted; ruler's validate mode will flag missing layers)
```

**Partial init policy:** If only `--backend` has been run, the gate passes — ruler's validate step (end of wh-create / wh-modify pipeline) already flags missing rules files per layer and recommends running `wh-init --{layer}`. The cross-command gate's job is only to prevent completely uninitialized usage, not to enforce all-four-layers completeness.

### 6b. Within-init step ordering — block out-of-order writes

**Same hook, `enforce-init.js`, additional logic:**

```
if file_path matches .claude/rules/{layer}.md:
  if state.adr.{layer} is null:
    deny: "ADR for {layer} must be completed before generating rules.
           Complete Step 1 (adr-extract) first."

if file_path matches .claude/reports/wh-init-{layer}-*.html:
  if state.rules.{layer} is null:
    deny: "Rules for {layer} must be generated before producing the report.
           Complete Step 2 (generate) first."
```

### 6c. State writer utility

**Script:** `hooks/scripts/write-state.js`  
Shared module used by init-requests.js and called by the command (via a lightweight Node script invoked after each ruler step completes). Handles atomic read-modify-write of the state file.

---

## 7. ruler Agent Changes

### New sub-mode: `adr-extract`

Invoked by `wh-init` as Step 1 for each layer.

**Inputs:**
- Layer name (`backend` / `frontend` / `security` / `templates`)
- Project source files (via Glob + Grep exploration)

**Process:**
1. Explore project code for the layer using the same Exploration Guide as generate mode.
2. For each significant pattern found, infer:
   - **Context** — what problem this pattern solves
   - **Decision** — what architectural choice was made
   - **Rationale** — why this choice (inferred from code structure, naming, comments)
   - **Consequences** — what constraints this decision imposes on future code
3. Group inferences into 3–7 ADR entries. Discard noise (e.g., patterns that appear in only one file).
4. Present summary to user for correction.
5. Write `.claude/adr/{layer}.md`.

**ADR document format:**
```markdown
# ADR: {Layer} — {Project Name}
Generated: {ISO date}

## ADR-{N}: {Short Title}
**Context:** ...
**Decision:** ...
**Rationale:** ...
**Consequences:** ...
```

### Enhanced `generate` mode

Step 2 now reads `.claude/adr/{layer}.md` before drafting the rule.

**Additional inputs vs. current:**
- `.claude/adr/{layer}.md` — ADR for this layer (required; abort if missing)

**Process change:**
- After loading the meta-rule (Step 1), load the ADR.
- During Step 3 (Draft), cross-reference each rule constraint against ADR consequences. Flag conflicts.
- In the user confirmation (Step 4), surface any ADR-rule conflicts for resolution.

---

## 8. HTML Report Structure

**Path:** `.claude/reports/wh-init-{layer}-YYYYMMDD-HHMMSS.html`

Sections (in order):

1. **Header** — layer name, project name, generation timestamp
2. **ADR Summary** — table of all extracted ADRs with Context / Decision / Rationale columns
3. **Rule Snapshot** — the full generated `.claude/rules/{layer}.md` rendered as formatted HTML
4. **ADR ↔ Rule Mapping** — which ADR entries influenced which rule sections
5. **Conflicts** — any ADR consequences that conflicted with meta-rule defaults, and how they were resolved
6. **Footer** — wonder-harness version, plugin root path

The report is self-contained HTML (inline CSS, no external resources) so it can be opened directly from the filesystem.

---

## 9. Files Changed

| File | Change |
|---|---|
| `commands/wh-init.md` | Full rewrite — 4-step flow, state recording calls, HTML report step |
| `agents/ruler.md` | Add `adr-extract` sub-mode; enhance `generate` mode to consume ADR |
| `hooks/hooks.json` | Add `enforce-init.js` to `PreToolUse Write\|Edit` |
| `hooks/scripts/enforce-init.js` | New — cross-command gate + within-init step ordering |
| `hooks/scripts/write-state.js` | New — atomic state read-modify-write utility |
| `hooks/scripts/init-requests.js` | Add state write: `requests_copied = true` |

---

## 10. Out of Scope

- ADR manual authoring (users editing `.claude/adr/*.md` by hand)
- Configurable required layers (`.claude/.wh-config.json`) — future work
- Re-running only the ADR step without re-running rules
- CI/CD integration for HTML report archiving
