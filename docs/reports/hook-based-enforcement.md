# Hook-Based Pipeline Enforcement in wonder-harness

**Date:** 2026-06-06  
**Version:** 0.5.x  
**Scope:** `wh-create`, `wh-modify`, `wh-init` commands

---

## 1. The Problem: LLM Instructions Are Not Guarantees

wonder-harness pipelines (`wh-create`, `wh-modify`) are defined as sequential agent chains:

```
planner → templater → developer → ruler
```

When this pipeline is expressed only as instruction text inside a command file, the LLM *should* follow it — but nothing *forces* it to. In practice, two failure modes appear:

| Failure Mode | What Happens | Consequence |
|---|---|---|
| **Stage skipping** | developer writes code before templater explores templates | Templates go unused; no consistency enforcement |
| **Cross-command bypass** | `wh-create` runs before `wh-init` has generated project rules | developer has no rule context; ruler validates against meta-rules only |

Both failures are silent. The pipeline appears to complete, but the quality gates that give it meaning have been bypassed.

---

## 2. The Solution: Hooks as Physical Gates

Claude Code hooks intercept tool calls at the OS level — before the LLM can act on them. A `PreToolUse` hook that returns `permissionDecision: "deny"` makes it **physically impossible** for the model to write a file, regardless of its instructions.

This shifts enforcement from:

> "Claude, please follow this order." *(advice)*

To:

> "The file system will reject your write until the prerequisite state exists." *(constraint)*

The key insight is that **every meaningful pipeline action eventually produces a file write**. Templater writes `index.json`. Developer writes Java/HTML/JS files. Ruler writes its validation report. Each write is an interception point.

---

## 3. Architecture

### 3.1 State Machine (`wh-state.json`)

All pipeline state is persisted in `.claude/.wh-state.json` at the project root. The schema:

```json
{
  "version": 1,
  "current": {
    "command": "wh-create",
    "domain": "eqEquipment"
  },
  "wh-create": {
    "planner":   "done | null",
    "templater": "done | null",
    "developer": "done | null",
    "ruler":     "done | null"
  },
  "wh-modify": { ... },
  "adr":     { "backend": "<ISO-timestamp> | null", ... },
  "rules":   { "backend": "<ISO-timestamp> | null", ... },
  "reports": { "backend": "<filename> | null", ... }
}
```

State transitions are written by agents via `write-state.js`:

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/write-state.js" "<cwd>" "wh-create.planner" "done"
```

State is read by enforce hooks via `lib/state.js:readState()`.

### 3.2 Hook Scripts

Three enforce scripts share a single `PreToolUse` registration on `Write|Edit`:

```
PreToolUse(Write|Edit)
  ├── enforce-init.js      ← wh-init step ordering + cross-command gate
  ├── enforce-create.js    ← wh-create stage ordering + template exploration
  └── enforce-modify.js    ← wh-modify stage ordering + template exploration
```

Each script exits immediately if `state.current.command` does not match its own command — ensuring zero interference between commands.

### 3.3 Enforcement Logic per Script

#### `enforce-init.js`

Runs for all `Write|Edit` calls regardless of active command.

| File Written | Prerequisite Check |
|---|---|
| `.claude/rules/{layer}.md` | `state.adr.{layer}` must be non-null |
| `.claude/reports/wh-init-{layer}-*.html` | `state.rules.{layer}` must be non-null |
| Any non-`.claude/` file | At least one `state.rules.{layer}` must be non-null (cross-command gate) |

#### `enforce-create.js`

Only active when `state.current.command === "wh-create"`.

| File Written | Prerequisite Check |
|---|---|
| `.claude/templates/**` | `wh-create.planner === "done"` |
| Non-`.claude/` code file | `wh-create.templater === "done"` |
| Non-`.claude/` code file (template match) | `wh-create.templater === "done"` **AND** template index read this session |
| `.claude/reports/wh-create-*` | `wh-create.developer === "done"` |

#### `enforce-modify.js`

Identical to `enforce-create.js`, scoped to `state.current.command === "wh-modify"` and `.claude/reports/wh-modify-*` paths.

---

## 4. Pipeline Flow

```
/wh-create eqEquipment
│
├── Step 0 (command): write-state → current.command=wh-create, reset wh-create pipeline
│
├── [planner agent]
│   ├── Reads request, produces plan
│   ├── Determines domain name → write-state current.domain=eqEquipment
│   └── ✓ write-state → wh-create.planner=done
│                            │
│           ┌────────────────┘ hook gate unlocked
│           ▼
├── [templater agent]
│   ├── Reads index.json, explores/creates templates
│   ├── Writes .claude/templates/index.json  ← enforce-create ALLOWS (planner=done)
│   └── ✓ write-state → wh-create.templater=done
│                            │
│           ┌────────────────┘ hook gate unlocked
│           ▼
├── [developer agent]
│   ├── Reads index.json (→ session marker set by mark-template-read.js)
│   ├── Writes src/**/*.java, resources/**/*.html  ← enforce-create ALLOWS (templater=done + marker)
│   └── ✓ write-state → wh-create.developer=done
│                            │
│           ┌────────────────┘ hook gate unlocked
│           ▼
└── [ruler agent]
    ├── Validates deliverables against rules
    ├── Writes .claude/reports/wh-create-eqEquipment-*.md  ← enforce-create ALLOWS (developer=done)
    └── ✓ write-state → wh-create.ruler=done
```

### What Happens When a Stage Is Skipped

If developer attempts to write code before templater has completed:

```
PreToolUse(Write) fired for: src/main/java/io/boot/wonder/web/eq/EqEquipmentController.java

enforce-create.js checks:
  state.current.command === "wh-create"  ✓
  isClaudeInternal(filePath) === false   → code file gate
  state["wh-create"].templater === null  → PREREQUISITE NOT MET

Response:
  permissionDecision: "deny"
  permissionDecisionReason: "[wh-create] Templater has not completed.
    Run the templater agent before writing code files."
```

The write is rejected at the OS hook layer. The LLM cannot proceed.

---

## 5. Command Initialization (Always-From-Scratch)

Commands reset their pipeline state at invocation, not at completion. This means:

- Re-running `/wh-create` always starts from planner, regardless of prior partial progress.
- Partial state from an interrupted run cannot silently unlock later stages.

Reset sequence in `wh-create.md` Step 0:

```bash
node write-state.js "<cwd>" "current.command"    "wh-create"
node write-state.js "<cwd>" "wh-create.planner"   null
node write-state.js "<cwd>" "wh-create.templater" null
node write-state.js "<cwd>" "wh-create.developer" null
node write-state.js "<cwd>" "wh-create.ruler"     null
```

---

## 6. Agent Responsibility: State Signals

Each agent signals its completion via `write-state.js` at the end of its work. This is declared in each agent's instruction file under **Pipeline State Signal**, ensuring the agent — the entity that knows when its own work is done — is responsible for the signal.

| Agent | Reads state | Writes state |
|---|---|---|
| planner | — | `current.domain`, `{command}.planner=done` |
| templater | `current.command` | `{command}.templater=done` |
| developer | `current.command` | `{command}.developer=done` |
| ruler | `current.command` | `{command}.ruler=done`, writes report file |

---

## 7. Template Exploration Gate (Absorbed)

The former `enforce-template.js` (standalone hook) has been absorbed into `enforce-create.js` and `enforce-modify.js`. The gate now fires only within the code-write path, after the templater-done prerequisite passes:

```
developer writes code file
  → templater=done? YES
    → template index match? YES + session marker absent?
      → DENY: "Read index.json first"
    → template index match? NO
      → ALLOW
  → templater=done? NO
    → DENY: "Run templater first" (stage gate fires before template gate)
```

Absorbing the template gate eliminates the need for a separate hook registration and ensures the message is stage-aware.

---

## 8. Scope Boundaries

| What IS enforced | What is NOT enforced |
|---|---|
| Stage ordering within wh-create / wh-modify | Content quality of each stage's output |
| Template exploration before code writes | Whether the correct template was chosen |
| wh-init prerequisite before code writes | Whether rules were correctly applied |
| Ruler report write order | Correctness of ruler findings |
| wh-modify isolation from wh-create hooks | Parallel multi-domain work |

Hooks enforce *ordering* and *presence*, not *correctness*. Quality validation remains the ruler agent's responsibility.

---

## 9. Design Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| Enforcement mechanism | `PreToolUse` hook deny | Physical gate; cannot be bypassed by LLM instructions |
| State persistence | `.wh-state.json` + explicit flags | Reuses proven wh-init pattern; survives session restarts |
| State write responsibility | Each agent calls `write-state.js` | Agent knows its own completion boundary |
| Command restart behavior | Always-from-scratch | Prevents stale partial state from silently unlocking stages |
| Command isolation | `state.current.command` check | Each enforce script exits immediately for other commands |
| Hook consolidation | Three separate scripts (enforce-init, enforce-create, enforce-modify) | One script per command; clear ownership; no cross-command logic leakage |
| Template gate | Absorbed into enforce-create/modify | Eliminates separate hook; enables stage-aware error messages |
