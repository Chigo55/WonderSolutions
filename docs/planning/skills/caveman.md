# caveman skill — Planning Document

## Overview

Communication compression skill that reduces token usage by ~75% by stripping filler words, using fragments, and omitting pleasantries.
Useful for long sessions where context window conservation matters.

## Current Behavior

- Invoked via `/caveman` or referenced as a skill.
- Instructs the model to use ultra-terse output: no apologies, no "certainly", no multi-sentence explanations.
- Fragments and abbreviations are acceptable.
- Code output is unaffected (code must still be complete and correct).
- Effect lasts for the duration of the session or until explicitly disabled.

## Inputs / Outputs

| | Detail |
|-|--------|
| **Input** | User invocation (no arguments required) |
| **Output** | Modified response style for all subsequent model outputs |

## Dependencies

- No file or state dependency.
- Works in any session regardless of other active skills.

## Improvement Direction

- Configurable compression levels: `--light` (remove filler), `--medium` (fragments OK), `--max` (single-word answers where possible).
- Toggle off command (`/caveman off`) instead of relying on session restart.
- Document token savings empirically with before/after examples in the SKILL.md.
