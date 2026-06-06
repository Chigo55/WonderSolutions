# planner — Planning Document

## Overview

Stage 1 of the pipeline. Reads the request document and decomposes the domain into a concrete module plan: which files to create/modify, in what order, with what dependencies.

## Current Behavior

- Reads the request document (create or modify).
- Applies the domain naming formula: module code (2-char) + camelCase feature = `{module}{Feature}`.
- Produces a 7-file decomposition:
  - Backend 5: `{Entity}Controller`, `{Entity}Service`, `{Entity}Mapper`, `{Entity}DTO`, `{Entity}Form`
  - Frontend 2: `{domainName}.js`, `{domainName}.html`
- Identifies dependencies between files (e.g., Controller depends on Service).
- Determines implementation order to avoid forward references.
- Operates in `create`, `modify`, or `review` mode; modify mode scopes output to changed files only.
- YAGNI principle: no features beyond what is explicitly requested.

## Inputs / Outputs

| | Detail |
|-|--------|
| **Input** | `.claude/requests/{create|modify}_request.md` |
| **Output** | Module plan document (file list, naming, dependencies, implementation order) |

## Dependencies

- Request document must contain all required sections.
- Reads existing code (Grep/Glob) to detect naming conflicts in modify mode.
- No template or rule dependency at this stage.

## Improvement Direction

- Detect similar existing modules and suggest partial reuse (e.g., shared DTO fields).
- Output the plan as a structured JSON artifact for downstream agents to parse reliably.
- Validate the domain naming formula against existing module codes to avoid collisions.
- In modify mode, produce an explicit "unchanged files" list so downstream agents skip them.
