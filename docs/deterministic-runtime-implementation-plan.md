# Deterministic Runtime — Implementation Plan

> Derived from `docs/deterministic-runtime.md` (the contract). Subordinate to
> `docs/system-design.md`. This plan describes **how** to build the deterministic
> runtime layer and its two public invocation surfaces (MCP + CLI) on top of the
> code that already exists in `tools/`.

## Status

Implemented (P0–P5): the operation registry (`tools/shared/runtime/operations.ts`)
and both public surfaces — CLI (`tools/runtime/`, `npm run runtime`) and MCP
(`tools/mcp/`, `npm run mcp`) — are in place, with the markdown scaffold engine,
state/run/reuse/extend stores, `initPlugin`, and source-listing operations. All
16 §7 operations are registered and covered by tests, including a CLI↔facade and
an MCP-over-in-memory-transport equivalence check.

Post-review hardening (2026-06-22): run scaffold creation now preserves existing
run files and reports them as existing, `updateRunRecord` rejects unknown patch
fields at the public registry boundary, `renderReuseOutput` can write run
`output.md` and explicit target files through the runtime operation, and
`wonder-extend` init uses caller-provided `generatedAt` instead of reading the
clock internally.

## 0. Summary

The runtime *logic* already exists as scattered library functions under
`tools/shared/runtime/`. What does **not** exist is the spec's headline: the
**Public Invocation Contract** (Section 2) — a single shared runtime
implementation exposed through **two equivalent surfaces** (MCP tools + a
repository CLI), plus several named operations and the Markdown scaffold engine.

The plan converges the existing helpers behind one **runtime facade** that
emits a uniform result, fills the missing operations, builds the scaffold
engine, and then layers the CLI and MCP surfaces on top so both call the same
code.

## 1. Current state assessment (grounded)

### Already implemented — reuse, do not rewrite

| Spec area | Existing code |
| --- | --- |
| Source load + Zod schemas | `tools/generate/src/load-source.ts`, `tools/shared/schema/*` |
| `generate` / `validate` / `drift` | `tools/generate/cli.ts`, `tools/validate/cli.ts`, `tools/validate/src/*` |
| State typed-merge (pure) | `runtime/init-plugin-state.ts` → `initPluginState()` |
| Per-package init seeding | `runtime/reuse-init.ts`, `runtime/govern-init.ts`, `runtime/extend-init.ts` |
| Run scaffolds (dir + JSON) | `runtime/build-run.ts`, `govern-run.ts`, `reuse-run.ts`, `extend-run.ts` → `create*RunScaffold()` |
| Reuse index build (pure-ish) | `buildReuseIndex()` inside `reuse-init.ts` |
| Reuse render (pure) | `renderReuseTemplate()` in `reuse-run.ts` |
| Integration change (pure) | `applyIntegrationChange()` in `extend-run.ts` |
| Capability detection (pure) | `detectCapabilitiesFromConfiguredIntegrations()` in `extend-run.ts` |
| Runtime validation | `tools/validate/src/validate-runtime.ts` → `validateRuntime()` |

### Missing or incomplete — the work

| # | Gap | Spec ref |
| --- | --- | --- |
| G1 | **No public invocation surfaces.** No MCP server, no runtime CLI. Operations are only reachable as internal functions called by tests. | §2 |
| G2 | **No unified runtime facade / operation set.** The 18 operations of §7 have no single home; signatures and return shapes are per-package and inconsistent. | §7 |
| G3 | **Missing operations:** `updateRunRecord`, `updateLatestReport`, standalone `refreshReuseIndex`, `readState`, unified `initPlugin` (state.json persistence + config seeding), `listPackages` / `listCapabilities` / `getCapabilitySpec`. | §7 |
| G4 | **No Markdown scaffold engine.** Strict-scaffold files are written as empty strings (`["plan.md", ""]`). No fixed headings, no repair-mode "add missing sections / preserve unknown". | §5 |
| G5 | **No `.wonder/reports/` schema or writer** (`build-latest.json`, `govern-latest.json`). | §4, §6 |
| G6 | **No `build-init` helper.** `.wonder/config/build.json` has no dedicated creator (reuse/govern/extend do; build does not). | §6 (`wonder-build` `init`) |
| G7 | **No uniform result/preservation contract.** Only `ensure*InitFiles` reports created/existing; scaffolds return `files: string[]`. §8 wants created/existing/updated/skipped everywhere, plus invalid-JSON-aborts-with-repair-hint. | §8 |
| G8 | **No typed config update operation.** Config is create-if-absent only; "apply explicit typed update, preserve by default" is unbuilt. | §4 |

## 2. Goals and non-goals

**Goals**
- One **shared runtime implementation** (`tools/shared/runtime/`) that owns every
  deterministic operation in §7 and returns a uniform `RuntimeResult`.
- Two **equivalent** public surfaces calling that implementation: MCP tools and a
  repository CLI (the CLI is a public contract, not an escape hatch — §2).
- Honor all preservation/determinism rules in §8.

**Non-goals** (per §9 and CLAUDE.md)
- Platform-specific MCP install details, adapter prompt wording, code-editing
  behavior, semantic content of plans/reports, remote protocols, secret storage.
- Changing the generate/validate/drift determinism guarantees.

## 3. Target architecture

```text
  MCP tools (tools/mcp/server.ts)         CLI (tools/runtime/cli.ts)
                \                              /
                 \                            /
                  v                          v
        Runtime facade — tools/shared/runtime/operations/*
        (the 18 §7 operations, each returns RuntimeResult)
                          |
        +-----------------+------------------+
        |        existing helpers            |   new helpers
        |  initPluginState, ensure*Init,     |   readState/writeState,
        |  create*RunScaffold, renderReuse,  |   updateRunRecord,
        |  applyIntegrationChange, detect*,  |   updateLatestReport,
        |  buildReuseIndex, validateRuntime  |   markdown scaffold engine
        +------------------------------------+
                          |
                   filesystem (.wonder/**, generated outputs)
```

### Cross-cutting contracts (built first, Phase 0)

- **`RuntimeResult`** — every operation returns
  `{ ok: true, data?, paths: { created[], existing[], updated[], skipped[] }, warnings[] }`
  or a structured `RuntimeError { code, message, path?, hint }`. Satisfies §8
  "report created, existing, updated, and skipped paths" and the repair-hint rule.
- **IO helpers** (`runtime/io/`):
  - `writeJsonFile` — 2-space indent + trailing newline (§8).
  - `readJsonOrAbort` — invalid existing JSON aborts with a repair hint unless
    `repair: true` (§8).
  - `normalizeMarkdown(level)` — LF + trailing newline for `strict scaffold` /
    `light normalization`; untouched for `preserve content`.
- **Operation registry** — a typed map `OPERATIONS[name] = { input: ZodSchema, run }`
  so both surfaces derive their schemas/dispatch from one source (prevents MCP and
  CLI drifting apart; §2 "both must map to these operation contracts").

## 4. Phased plan

Each phase is independently shippable and `npm run check && npm test`-green.

### Phase 0 — Contracts & IO foundation
*No behavior change to existing callers.*
- Add `RuntimeResult` / `RuntimeError` types (`runtime/result.ts`).
- Add `runtime/io/` (`write-json.ts`, `read-json.ts`, `normalize-markdown.ts`),
  refactoring the duplicated `pathExists` / `jsonWithTrailingNewline` helpers that
  currently live in every `*-run.ts` and `*-init.ts` into one place.
- Add report schemas to `schema/run.ts`: `buildLatestReportSchema`,
  `governLatestReportSchema` (typed summary pointer per §4).
- **Tests:** io round-trips, invalid-JSON abort vs repair, markdown normalization
  per level.

### Phase 1 — Markdown scaffold engine (G4)
- `runtime/markdown/registry.ts` — ordered section definitions for every
  `strict scaffold` file in §5 (`plan.md`, `inspect.md`, `report.md`, `changes.md`,
  `observed-conventions.md`, `proposed-standards.md`, `abstraction.md`,
  `recommendation-context.md`, `detection-plan.md`, and `.wonder/standards/*.md`).
  Section content per §6 (e.g. `plan.md`: Scope / Steps / Validation / Risks).
- `runtime/markdown/scaffold.ts`:
  - `createScaffold(file)` — emit fixed headings + known markers.
  - `repairScaffold(file, existing)` — implement §5 regeneration policy: missing →
    create; existing → preserve; repair+empty → replace; repair+known scaffold →
    add missing sections only; unknown content → preserve; destructive rewrite →
    requires `confirmDestructive: true`.
- Replace the empty-string Markdown placeholders in all `create*RunScaffold`
  functions with `createScaffold(...)`.
- **Tests:** every regeneration-policy row in §5; section-order stability;
  preserve-unknown; destructive-confirmation gate.

### Phase 2 — Complete the operation set (G2, G3, G6, G8)
Build the facade module `runtime/operations/` — one file per operation, each
returning `RuntimeResult`, reusing existing helpers. New work:
- `readState` / `writeState` — read+validate `.wonder/state.json`; typed merge to
  disk **preserving unknown plugin sections** (§4). `initPluginState` stays the
  pure merge; these add the disk round-trip.
- `initPlugin(packageId, platform)` — orchestrate `ensure*InitFiles` + seed
  `.wonder/config/<domain>.json` (incl. **new `build-init`**, G6) + `writeState`.
- `updateRunRecord(runId, patch)` — typed status/output/validation/error update on
  `run.json` (create-once-then-typed, §4).
- `updateLatestReport(kind, summary)` — overwrite `.wonder/reports/<kind>-latest.json`.
- `refreshReuseIndex()` — extract `buildReuseIndex` from `reuse-init.ts` into a
  standalone operation (regenerate when missing/stale/forced).
- `renderReuseOutput(...)` — wrap `renderReuseTemplate` + write `output.md`
  (`preserve content`) behind `assertReuseTargetWriteAllowed`.
- `updateConfig(domain, patch)` — explicit typed update, preserve by default (G8).
  This remains outside the current §7 public operation set and should be promoted
  only if the specification adds it as a runtime operation.
- Thin wrappers: `listPackages`, `listCapabilities`, `getCapabilitySpec`
  (over `loadSource`), `readState`, `validateState` (over `validateRuntime`),
  `createRunScaffold` (dispatch to the right `create*RunScaffold`),
  `applyIntegrationChange`, `detectCapabilities`, `generate`, `validate`, `drift`.
- Register all 18 in the operation registry.
- **Tests:** each new operation; state merge preserves foreign plugin sections;
  run-record typed-update rejects unknown fields; config preserve-by-default.

### Phase 3 — CLI fallback surface (G1, §2)
- `tools/runtime/cli.ts` — `wonder-runtime <operation> [--json '<input>']`,
  dispatches through the registry, prints `RuntimeResult` as JSON, non-zero exit
  on `RuntimeError`.
- `package.json`: add `"runtime": "tsx tools/runtime/cli.ts"`.
- **Tests:** CLI ↔ facade equivalence — same input produces equivalent filesystem
  results and JSON output for a representative operation set.

### Phase 4 — MCP server surface (G1, §2)
- Add dependency: **`@modelcontextprotocol/sdk`** (official TS SDK) — *see Decision D1*.
- `tools/mcp/server.ts` — stdio server; register one MCP tool per registry entry;
  JSON-Schema derived from the registry's Zod input; each handler calls the **same**
  facade operation. No logic in the handler beyond input parse + call + serialize.
- **Tests:** invoke each tool handler directly (no transport spawn) and assert it is
  equivalent to calling the facade — proving §2 "both call the same shared runtime
  implementation."

### Phase 5 — Wiring, docs, gate
- Optionally fold `validate --runtime` into `npm run check`.
- Update `README.md` / `CLAUDE.md` runtime section and add a short
  `docs/deterministic-runtime.md` "Implemented by" pointer.
- A single equivalence test asserting the registry covers exactly the §7 operation
  set (guards against future drift between spec and code).

## 5. Test strategy
- `node:test` via `tsx` (existing convention); one test file per new module under
  `tests/`, mirroring the existing `wonder-*-*.test.ts` layout.
- Use a temp project root (scratchpad/`mkdtemp`) for filesystem operations.
- Coverage emphasis on preservation/repair edges (§5, §8) and **surface
  equivalence** (§2). Target ≥80% per house rules.

## 6. Key decisions (need confirmation)

- **D1 — MCP transport/dependency. DECIDED:** use the official
  `@modelcontextprotocol/sdk` (stdio) as a new runtime dependency. (Rejected
  alternative: hand-rolled JSON-RPC stdio loop to preserve the near-zero-dependency
  footprint.) Phase 4 uses the SDK's server + stdio transport; tool input schemas
  are derived from the operation registry's Zod schemas.
- **D2 — Timestamps & run-ids stay caller-provided** (operation inputs), matching
  the existing `startedAt`/`generatedAt` pattern and CLAUDE.md determinism (no
  `Date.now()` inside the runtime).
- **D3 — Backward compatibility.** Existing `create*RunScaffold` signatures are
  consumed by current tests; the facade wraps them rather than breaking them.
  Migrate tests to the facade incrementally.

## 7. Suggested sequencing / dependencies
```
Phase 0 ──> Phase 1 ──┐
        └─> Phase 2 ──┴─> Phase 3 ──> Phase 4 ──> Phase 5
```
Phases 1 and 2 can proceed in parallel after Phase 0. Phases 3 and 4 both depend on
the Phase 2 registry. Phase 5 is final wiring.
