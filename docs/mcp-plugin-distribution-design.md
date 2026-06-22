# MCP Plugin Distribution — Design

> Subordinate to `docs/system-design.md` and `docs/deterministic-runtime.md`.
> Describes **how the deterministic runtime MCP server reaches an installed
> plugin in a target project**. Design only — no implementation yet.
>
> Chosen approach (user decision, 2026-06-22): **bundle a compiled server into
> each plugin and run it with `node ${CLAUDE_PLUGIN_ROOT}/...`** (Option 3),
> declared via the plugin's `mcpServers`.

## 1. Problem statement (verified)

The deterministic runtime exposes two surfaces in *this generator repo*
(`tools/mcp/` via `npm run mcp`, `tools/runtime/` via `npm run runtime`). But:

- The **generated plugins contain only skills** (`SKILL.md`). They do **not**
  declare or bundle any MCP server. Confirmed: no `mcp` / `mcpServers` string
  appears anywhere under `.claude-plugin/`, `plugins/`, `.agents/`, or
  `adapters/`; the Claude adapter (`adapters/claude/adapter.json`) emits only
  `marketplace`, `plugin-manifest`, and `plugin-skill` outputs.
- Therefore, when the plugins are installed in another project, the platform has
  **no MCP server to register** → "MCP not recognized." This is a missing
  feature, not a regression.

Consequence for the spec contract: `docs/deterministic-runtime.md` §2 assumes
"prefer MCP, else CLI fallback," but in a target project **neither surface is
currently distributed**. The skills have nothing deterministic to call.

## 2. How Claude Code plugins declare MCP servers (confirmed)

- A plugin registers stdio MCP servers via an `mcpServers` map, placed **either**
  in `.claude-plugin/plugin.json` (inline) **or** a `.mcp.json` at the plugin
  root. Auto-registered on install; tools surface as
  `mcp__plugin_<plugin>_<server>__<tool>`.
- Entry shape: `{ command, args, env?, cwd? }`.
- Bundled scripts are referenced with **`${CLAUDE_PLUGIN_ROOT}`** (resolves to the
  installed plugin directory). No separate marketplace entry needed.
- **MCP-via-plugin is Claude-specific.** Codex and Antigravity have no analogous
  per-plugin MCP bundling, so they must use the CLI fallback (§7 below).

## 3. Goals / non-goals

**Goals**
- An installed Claude plugin auto-registers a `wonder-runtime` MCP server with no
  manual user setup.
- The server runs against the **target project's** `.wonder/` state (project-local
  operations), not this generator repo.
- Generation stays deterministic and drift-gated; source remains the only
  hand-edited layer.

**Non-goals**
- Re-implementing runtime logic (reuse the existing registry verbatim).
- Publishing to npm (Option 2, explicitly not chosen).
- Making source-bound operations (`generate`/`validate`/`drift`/`list*`) work in a
  target project — those require `packages/` and stay repo-only (see §6).

## 4. Two concerns, kept separate

```
(A) DECLARATION  — generator emits an mcpServers declaration into each plugin
(B) DISTRIBUTION — a compiled, self-contained server.js is bundled into the plugin
                   and run via: node ${CLAUDE_PLUGIN_ROOT}/mcp/server.js
```

Both must land in the plugin package so the plugin is self-contained and installs
standalone.

## 5. Part A — Declaration (generator changes)

### 5.1 New adapter output kind: `mcp-config` (Claude only)

Emit a dedicated `.mcp.json` rather than inlining into `plugin.json`, so the
JSON shapes stay one-concern-per-file and the Claude-only asymmetry is explicit
(mirrors how `repo-skill` is Codex-only today).

Target path (add to `outputPathFor()` in `tools/shared/platform/paths.ts`):
```
plugins/claude/<pkg>/.mcp.json
```

Generated content (computed in `compute-output.ts`, analogous to
`pluginManifestJson`), **static and timestamp-free**:
```json
{
  "mcpServers": {
    "wonder-runtime": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/mcp/server.js"],
      "env": { "WONDER_TARGET_MODE": "1" }
    }
  }
}
```
- `cwd` is intentionally omitted; the server resolves the project root from the
  platform-provided working directory / `CLAUDE_PROJECT_DIR` (decision D3).
- One server name (`wonder-runtime`) per plugin. With 4 plugins installed, each
  registers its own copy under a distinct `mcp__plugin_<pkg>_wonder-runtime__*`
  prefix. Acceptable; de-dup is a later optimization (§9, open Q2).

### 5.2 Touch points (each enforced in code — see CLAUDE.md invariants)

| File | Change |
| --- | --- |
| `tools/shared/schema/adapter.ts` | add `"mcp-config"` to `outputKindSchema` |
| `tools/shared/platform/paths.ts` | `outputPathFor` → `plugins/claude/<pkg>/.mcp.json`; throw for codex/antigravity |
| `tools/generate/src/compute-output.ts` | `renderOutputBody` + `sourceFilesFor` branches for `mcp-config`; body from a new `mcpConfigJson(packageSource)` |
| `adapters/claude/adapter.json` | new `outputs[]` entry (kind `mcp-config`, scope `package`, path template, `textKind: json`, `header: none`) |
| `adapters/claude/templates/mcp.json.hbs` | passthrough `{{{content}}}` (like `plugin.json.hbs`) |

Determinism: content depends only on `package.id` (static) → byte-identical across
runs, so the drift gate holds. The `.mcp.json` is machine-owned like every other
generated file.

### 5.3 Invariant check
- `FORBIDDEN_INSTRUCTION_TERMS` is unaffected — the `${CLAUDE_PLUGIN_ROOT}` and
  `node` strings live in an **adapter-level** output, never in platform-neutral
  `instruction.md`.
- `mcp-config` is Claude-only; the Codex/Antigravity adapters do not gain this
  output (§7).

## 6. Part B — Distribution (bundled compiled server)

### 6.1 Why a build step is needed
The repo is tsx/ESM no-build. A target machine cannot be assumed to have `tsx` or
this repo's `node_modules`. So the server must ship as a **self-contained bundle**
including its deps (`@modelcontextprotocol/sdk`, `zod`).

### 6.2 Build
- Add `esbuild` (devDependency) and `npm run build:mcp`:
  - entry `tools/mcp/cli.ts` → bundle → `plugins/claude/<pkg>/mcp/server.js`
  - `--bundle --platform=node --format=esm --target=node20`
- The bundle is **committed** (machine-owned), one copy per Claude plugin so each
  installs standalone (accept duplication; see open Q2 for a shared-plugin
  alternative).

### 6.3 Target mode (the critical behavior change)
A target project has **no `packages/`**, so:
- **Source-bound operations are inert there.** When `WONDER_TARGET_MODE=1`, the
  server should register only the **project-local** operations:
  `initPlugin`, `readState`, `validateState`, `createRunScaffold`,
  `updateRunRecord`, `updateLatestReport`, `refreshReuseIndex`,
  `renderReuseOutput`, `applyIntegrationChange`, `detectCapabilities`.
  (Excluded in target mode: `listPackages`, `listCapabilities`,
  `getCapabilitySpec`, `generate`, `validate`, `drift`.)
- **`initPlugin` needs capability registrations**, which it currently derives from
  `sourceRoot` (canonical source). In a target project that source is absent, so
  we must **bundle a static capability registry** generated from
  `REQUIRED_PACKAGES` + manifests, e.g. `plugins/claude/<pkg>/mcp/capabilities.json`,
  and have the target-mode entry inject it (so `initPlugin` works without
  `sourceRoot`). This is a new generated data artifact.
- Likewise `initPlugin` for `wonder-extend` needs the companion/integration
  **catalog**; bundle it alongside (or point `catalogRoot` at the bundled copy).

### 6.4 New runtime surface seam
Add a thin `tools/mcp/target-server.ts` (or a flag in `createRuntimeMcpServer`)
that:
1. reads `WONDER_TARGET_MODE`,
2. filters `listOperations()` to the project-local subset,
3. resolves the project root (D3) and injects bundled capability/catalog data.

The registry and `executeOperation` are reused unchanged — only the *exposed set*
and *data source* differ.

## 7. Platform asymmetry (Codex / Antigravity)

- **Claude** → MCP via §5/§6.
- **Codex / Antigravity** → no plugin-MCP; they must use the **CLI fallback**
  (§2 of the spec). That fallback also requires the runtime to be present in the
  target. Options for a later sub-track:
  - bundle a compiled CLI (`tools/runtime/cli.ts`) the same way, and have the
    Codex/Antigravity skill bodies invoke it; or
  - publish the runtime to npm and call via `npx` (Option 2 — deferred).
- For this design we scope **Claude MCP only**; the cross-platform fallback is
  tracked as open Q3 so the spec's "equivalent surfaces" guarantee is eventually
  honored on all three platforms.

## 8. Testing plan
- **Generation**: a `generate` test asserts the new `.mcp.json` content per Claude
  package, plus a drift check (byte-stable).
- **Build smoke**: after `build:mcp`, spawn `node plugins/claude/wonder-build/mcp/server.js`
  with `WONDER_TARGET_MODE=1`, drive it over stdio with the MCP `Client`, and
  assert `listTools` returns exactly the project-local subset and a
  `createRunScaffold` call writes into a temp project's `.wonder/`.
- **Target-mode unit**: the operation-filter and bundled-capability injection,
  tested without a transport (like the existing `tools/mcp/tools.ts` adapter test).

## 9. Open decisions (resolve before implementing)

- **Q1 — declaration file**: dedicated `.mcp.json` (recommended, this design) vs
  inline `mcpServers` in `plugin.json`. Inline avoids a new output kind but mixes
  concerns and complicates the Claude-only branch in `pluginManifestJson`.
- **Q2 — one bundle per plugin vs one shared `wonder-runtime` plugin** that the
  others depend on. Per-plugin = self-contained but 4× the bundled bytes; shared =
  one server but needs a plugin-dependency mechanism (uncertain it exists).
- **Q3 — Codex/Antigravity fallback**: bundle a compiled CLI vs npm `npx`
  (Option 2). Needed for full §2 parity.
- **Q4 — bundle in the drift gate?** esbuild output can vary by version, so a
  byte-drift check on `server.js` may be brittle. Proposal: exclude the bundle
  from `drift`, gate it instead by an existence + smoke test, and pin the esbuild
  version. Needs confirmation.
- **Q5 — project-root resolution (D3)**: rely on `CLAUDE_PROJECT_DIR` / process
  cwd. Confirm the platform sets a stable working directory for plugin MCP
  servers.

## 10. Phased rollout (when approved)

1. **Target mode**: add `WONDER_TARGET_MODE` filtering + bundled-capability
   injection seam in `tools/mcp/` (no generator change yet; unit-tested).
2. **Build**: add `esbuild` + `npm run build:mcp`; produce `server.js` +
   `capabilities.json` per Claude plugin; smoke test.
3. **Declaration**: add the `mcp-config` output kind end-to-end (schema → paths →
   compute-output → adapter.json → template); regenerate; drift-green.
4. **Verify**: install the regenerated plugin into a scratch project and confirm
   `/mcp` shows `wonder-runtime` and a tool call mutates that project's `.wonder/`.
5. **Cross-platform fallback** (Q3): compiled CLI or npm, for Codex/Antigravity.

## 11. Invariants & determinism summary
- New generated files (`.mcp.json`, bundled `server.js`, `capabilities.json`) are
  **machine-owned** — never hand-edited; produced from source + build.
- `.mcp.json` is fully deterministic (static content) and stays in the drift gate.
- The bundle's determinism is version-sensitive → handled out-of-gate (Q4).
- No timestamps or nondeterministic data enter any generated declaration.
