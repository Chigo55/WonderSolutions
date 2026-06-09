<p align="center">
  <h1 align="center">WonderSolutions</h1>
  <p align="center">
    <strong>Stack-agnostic 6-stage development pipeline marketplace for Claude Code</strong><br>
    A 3-plugin marketplace: wonder-workflows (pipeline), wonder-utilities (skills &amp; templates), and wonder-plugins (optional companion toolset).
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/Claude_Code-plugin-blue?style=flat-square" alt="Claude Code Plugin">
    <img src="https://img.shields.io/badge/version-0.1.0-orange?style=flat-square" alt="Version 0.1.0">
    <img src="https://img.shields.io/badge/Node.js-18+-green?style=flat-square" alt="Node.js 18+">
    <img src="https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square" alt="MIT License">
  </p>
</p>

---

## Overview

**WonderSolutions** is a Claude Code plugin marketplace providing a stack-agnostic, evolutionary 6-stage development orchestration pipeline alongside a skill and template utility layer.

- **Pipeline** (wonder-workflows): analyzer → researcher → planner → developer → inspector → modifier
- **Orchestration**: the `orchestrator` agent coordinates stage-to-stage flow
- **Rule management**: the `ruler` agent (wonder-workflows) handles ADR extraction, generation, amendment, and audit
- **Template catalog**: the `templater` agent (wonder-utilities) manages the hybrid local/global template catalog; `/wsu-template` handles promote · add · edit · delete
- **Stage enforcement hooks**: block `Write`/`Edit` calls that fall outside the active pipeline stage

---

## Plugins

### wonder-workflows

The core 6-stage pipeline plugin.

- **Commands**: `/wsf-run` · `/wsf-init` · `/wsf-review` · `/wsf-rules`
- **Agents**: orchestrator · analyzer · researcher · planner · developer · inspector · modifier · ruler (rule modes: adr-extract · generate · amend · audit)
- **Hooks**: `enforce-init.js` (blocks writes until `/wsf-init` completes) · `enforce-stage.js` (blocks off-stage writes) · `init-requests.js` (SessionStart, copies request seeds)
- **State file**: `.claude/.ws-state.json`
- **Init reports**: `.claude/reports/wsf-init-{layer}-{timestamp}.html`

### wonder-utilities

Skills and template catalog plugin.

- **Command**: `/wsu-template` — template catalog management (promote · add · edit · delete)
- **Agent**: templater (template modes only)
- **Skills**: cave-man · grill-me · hand-off · write-a-skill
- **Template catalog**: hybrid local (`.claude/templates/`) + global (`${CLAUDE_PLUGIN_ROOT}/templates/`) catalog

### wonder-plugins (optional)

A dependency-aggregator plugin with no commands, agents, hooks, or skills of its own. Install it to pull the full companion toolset as transitive dependencies:

| Plugin | Role |
|--------|------|
| `superpowers` | brainstorming · TDD · debugging workflow skills |
| `context7` | library/framework live docs (MCP) — optional enhancement for the researcher |
| `claude-md-management` | CLAUDE.md audit and improvement |
| `code-simplifier` | code simplification and cleanup |

> wonder-workflows and wonder-utilities do **not** hard-depend on these. Install wonder-plugins only if you want the full companion set.

---

## Installation

### From the marketplace

```shell
# Add the WonderSolutions marketplace
/plugin marketplace add Chigo55/wonder-solutions

# Install individual plugins as needed
/plugin install wonder-solutions@wonder-workflows
/plugin install wonder-solutions@wonder-utilities

# Or install wonder-plugins to also pull the companion toolset
/plugin install wonder-solutions@wonder-plugins
```

### Local development load

```bash
git clone https://github.com/Chigo55/wonder-solutions.git
claude --plugin-dir ./wonder-solutions/plugins/wonder-workflows
claude --plugin-dir ./wonder-solutions/plugins/wonder-utilities
```

---

## Commands

| Command | Plugin | Description |
|---------|--------|-------------|
| `/wsf-init` | wonder-workflows | Project initialization — layer ADR reverse-engineering + state record + HTML reports |
| `/wsf-run` | wonder-workflows | Single entry point for the 6-stage pipeline |
| `/wsf-review` | wonder-workflows | Standalone code review via the inspector agent |
| `/wsf-rules` | wonder-workflows | Rule amendment (amend) or audit (audit) via the ruler agent |
| `/wsu-template` | wonder-utilities | Template catalog management — promote · add · edit · delete |

---

## Agents

| Agent | Plugin | Role | Stage |
|-------|--------|------|-------|
| `orchestrator` | wonder-workflows | Pipeline coordination | — |
| `analyzer` | wonder-workflows | Request analysis · scope definition | Stage 1 |
| `researcher` | wonder-workflows | Library · pattern · precedent research | Stage 2 |
| `planner` | wonder-workflows | Implementation planning | Stage 3 |
| `developer` | wonder-workflows | Code implementation | Stage 4 |
| `inspector` | wonder-workflows | Output inspection | Stage 5 |
| `modifier` | wonder-workflows | Feedback-driven modification | Stage 6 |
| `ruler` | wonder-workflows | Rule management (ADR modes) | — |
| `templater` | wonder-utilities | Template catalog management (template modes) | — |

---

## Repository Structure

This repository is a **3-plugin marketplace**.

```
wonder-solutions/  (marketplace repository)
  .claude-plugin/
    marketplace.json             ← marketplace catalog (WonderSolutions)
  plugins/
    wonder-workflows/            ← pipeline plugin (v0.1.0)
      .claude-plugin/plugin.json
      commands/                  ← wsf-init · wsf-run · wsf-review · wsf-rules
      agents/                    ← orchestrator · analyzer · researcher · planner · developer · inspector · modifier · ruler
      hooks/                     ← enforce-init · enforce-stage · init-requests
      rules/                     ← structure · security · workflow
      requests/                  ← request form seeds
    wonder-utilities/            ← skills & templates plugin (v0.1.0)
      .claude-plugin/plugin.json
      commands/                  ← wsu-template
      agents/                    ← templater
      rules/                     ← templates
      templates/                 ← global template catalog (index.json + scaffolds/)
      skills/                    ← cave-man · grill-me · hand-off · write-a-skill
    wonder-plugins/              ← optional companion aggregator (v0.1.0)
      .claude-plugin/plugin.json ← declares superpowers · context7 · claude-md-management · code-simplifier as deps
  package.json                   ← monorepo root
  CLAUDE.md
```

---

## Validation & Testing

```bash
# Validate all plugin structures
npm run validate

# Run unit tests
npm run test
```

---

## License

MIT — [InHo Jeong](https://github.com/Chigo55)
