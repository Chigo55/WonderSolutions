# Design: Move requests to wonder-utilities + remove wonder-workflows hooks

**Date:** 2026-06-09
**Status:** Approved (pending written-spec review)
**Branch:** `split/wonder-solutions` (work directly, no isolation)

## Goal

Relocate the request-form seeds out of `wonder-workflows` into `wonder-utilities`, and
remove the `wonder-workflows/hooks/` subsystem entirely — converting the 6-stage pipeline
to a **fully stateless, convention-driven** model with no `.claude/.ws-state.json` and no
PreToolUse enforcement.

The two plugins remain **independent**: `wonder-workflows` must not reference any file
inside `wonder-utilities` (honors the CLAUDE.md rule "No references to files outside the
plugin").

## Decisions (resolved during brainstorming)

| Question | Decision |
|----------|----------|
| Copy mechanism for moved seeds | **Delete the copier entirely** — no auto-provisioning. |
| Where in utilities | **Standalone `wonder-utilities/requests/` directory** (not the template catalog). |
| Hook deletion scope | **Delete the entire `hooks/` folder** (reconfirmed twice). |
| How requests reach a project | **Manual** — user creates `.claude/requests/create_request.md`; a reference copy ships in the wonder-utilities `requests/` dir. |
| Post-hooks state/gating | **③ Fully stateless, no guards** — no `.ws-state.json`, no enforcement, no soft init-check. |
| Workflows → utilities dependency | **Not accepted** — independence preserved. The utilities pointer in docs is a soft reference only (workflows still functions if utilities is absent). |
| Meta-rules scrub depth | **Remove only direct references** to the deleted `.ws-state.json` / hook enforcement; keep generic archetype text. |

## Behavior changes (explicitly accepted)

- **No auto-provisioning of the request form.** Fresh projects no longer get
  `.claude/requests/create_request.md` automatically. The no-arg `/wsf-run` flow still
  reads it if present; otherwise it instructs the user to create one (reference copy in
  wonder-utilities).
- **No write enforcement.** The PreToolUse hooks that blocked writes until `/wsf-init`
  and blocked off-stage writes are gone. Stage ordering is now convention only — the
  orchestrator and stage agents follow their documented permissions, not a hard gate.
- **No persisted pipeline state.** `.claude/.ws-state.json` is no longer written or read.
  The orchestrator tracks the current stage in-conversation. The generated artifacts
  (ADR docs, `.claude/rules/*.md`, HTML reports, `.claude/runs/{run-id}/*`) are the
  source of truth for "what has been done."

## Change inventory

### A. Move seeds (2 files) → wonder-utilities
- `plugins/wonder-workflows/requests/create_request.md` → `plugins/wonder-utilities/requests/create_request.md`
- `plugins/wonder-workflows/requests/modify_request.md` → `plugins/wonder-utilities/requests/modify_request.md`
- Delete the now-empty `plugins/wonder-workflows/requests/` directory.

### B. Delete entire hooks/ folder (12 files)
```
plugins/wonder-workflows/hooks/hooks.json
plugins/wonder-workflows/hooks/scripts/enforce-init.js
plugins/wonder-workflows/hooks/scripts/enforce-stage.js
plugins/wonder-workflows/hooks/scripts/init-requests.js
plugins/wonder-workflows/hooks/scripts/write-state.js
plugins/wonder-workflows/hooks/scripts/lib/glob.js
plugins/wonder-workflows/hooks/scripts/lib/init-guard.js
plugins/wonder-workflows/hooks/scripts/lib/stage-guard.js
plugins/wonder-workflows/hooks/scripts/lib/state.js
plugins/wonder-workflows/hooks/scripts/lib/__tests__/init-guard.test.js
plugins/wonder-workflows/hooks/scripts/lib/__tests__/stage-guard.test.js
plugins/wonder-workflows/hooks/scripts/lib/__tests__/state.test.js
```

### C. Edit agents/commands (remove all write-state.js calls + copier refs)
> Line numbers are indicative (pre-edit) and will shift; match on content.

- **`agents/orchestrator.md`**
  - Remove the `write-state.js current.stage` block (~L32–36); replace with a note that
    the orchestrator tracks the current stage itself.
  - Remove the close-state update on `current.stage`/`current.command` (~L83).
  - Remove "Reset state: command=null, run-id=null, stage=null." (~L105).
  - Keep: request-doc read (~L15), `run-id` generation, `.claude/runs/{run-id}/` flow.
- **`commands/wsf-init.md`**
  - Remove the SessionStart-copier block (~L16–18: "handled automatically by the
    SessionStart hook" + verify/fallback `init-requests.js`); replace with a manual
    provisioning note (reference copy in wonder-utilities `requests/`).
  - Remove the 3 `write-state.js` calls (~L37 adr, ~L56 rules, ~L112 reports).
  - Update front-matter `description:` — drop "copies request seeds".
- **`commands/wsf-run.md`**
  - Remove the 6 `write-state.js` calls (~L16–18 set, ~L36–38 reset).
  - Keep the no-arg request-doc read/validation (~L11); if the file is absent, message
    the user to create it (reference copy in wonder-utilities).
- **`commands/wsf-rules.md`**
  - Remove the `write-state.js rules.{layer}` call (~L25).

### D. Scrub meta-rules (references only)
- **`rules/workflow.md`** — rewrite "## Enforcement" (~L25–28): hooks no longer enforce;
  stage ordering is proactive/convention only. Drop the `.claude/.ws-state.json`
  active-layer reference (~L33) — active layers are determined from `.claude/rules/*.md`.
- **`rules/structure.md`** — remove the `.ws-state.json` data-store reference and the
  hook-subsystem dependency description (~L64–80); keep the generic archetype framing.
- **`rules/security.md`** — remove the `.ws-state.json` / `writeState()` mandate (~L65).

### E. Docs
- **`CLAUDE.md`**
  - Remove `hooks/` from the wonder-workflows tree (~L36).
  - Move `requests/` from the wonder-workflows tree to the wonder-utilities tree (~L38).
  - Remove the `hooks/hooks.json` row from the Plugin Structure Rules table (~L63).
  - Change the `requests/` table row to "wonder-utilities only" (~L66).
  - Remove the PreToolUse-enforcement bullet under Development Rules (~L83).
- **`README.md`**
  - Remove the "Stage enforcement hooks" feature bullet (~L25).
  - Remove the "Hooks:" line (~L37) and "State file:" line (~L38).
  - Remove `hooks/` from the structure tree (~L132); move `requests/` to utilities (~L134).
  - Drop "+ state record" from the `/wsf-init` description (~L95).

### F. Versioning (both plugins change)
- Bump `plugins/wonder-workflows/.claude-plugin/plugin.json` `version`.
- Bump `plugins/wonder-utilities/.claude-plugin/plugin.json` `version`.
- Bump the matching entries in `.claude-plugin/marketplace.json`.
- Both currently `0.1.0` → `0.2.0` (minor; behavior change, not a fix).
- Commit order: `refactor:` change commit → separate `chore: bump version to 0.2.0` commit.

## Validation

- `npm run validate` — `claude plugin validate` for all three plugins must pass after the
  structural change.
- `npm test` (`node --test`) — the only tests were the deleted `hooks/lib/__tests__`;
  afterward `node --test` finds no test files and exits clean. (Acceptable; no test
  coverage remains for this repo, which is documentation/manifest-centric.)
- Manual grep gate: zero remaining references to `write-state`, `ws-state`,
  `init-requests`, `enforce-`, `SessionStart`, `PreToolUse`, `requests_copied` anywhere
  under `plugins/wonder-workflows/` after edits.

## Non-goals / out of scope

- Re-implementing state tracking or enforcement in any other form.
- Wiring the moved seeds into the `/wsu-template` catalog (kept as a plain directory).
- Refactoring unrelated pipeline behavior, agents, or the `.claude/runs/` artifact format.
- Creating any cross-plugin file reference or hard dependency between the two plugins.

## Risks

- **Discoverability of the request form drops** — without auto-copy, users must know to
  create `.claude/requests/create_request.md`. Mitigated by clear messaging in
  `wsf-run`/`wsf-init` pointing to the wonder-utilities reference copy.
- **Loss of enforcement guardrails** — agents could write out-of-stage artifacts with no
  hard block. Accepted: the orchestrator drives stages and the documented agent
  permissions are followed by convention.
