# Detect Capabilities

Determine which external capabilities are currently available to the project.

## Procedure

scope

- Determine the providers or capability groups to check.
- Read `.wonder/extend/companions.json`.
- Read `.wonder/extend/integrations.json`.
- Read `.wonder/config/extend.json` when it exists.
- Treat invalid integration state as a blocker to reliable availability claims.

plan-detection

- Build a local detection plan from configured integrations, enabled companions, environment variable presence, command availability, and platform registry state.
- Build remote checks only when explicit user consent exists.
- Write `.wonder/runs/<run-id>/detection-plan.md`.
- Record skipped remote checks when consent is absent.

detect-local

- Inspect configured integrations without exposing secret values.
- Inspect enabled companions as local evidence only.
- Record environment variable names or presence only, never values.
- Inspect command availability only when safe and useful.
- Mark unverifiable capabilities unavailable or low confidence.

optionally-detect-remote

- Perform remote checks only with explicit user consent.
- Record `remoteChecked: false` when remote checks are skipped.
- Do not use remote marketplace or service results without recording consent.

write-status

- Write `.wonder/extend/capabilities.json`.
- Write `.wonder/runs/<run-id>/detection-results.json`.
- Write `.wonder/runs/<run-id>/artifacts.json`.
- Use capability ids shaped as `provider.resource.action`.
- Record availability, source, confidence, evidence, remote check status, and check timestamp.

report

- Write `.wonder/runs/<run-id>/report.md`.
- Summarize available and unavailable capabilities, confidence, evidence, skipped checks, and required user action.
- Explain that write capabilities still require explicit user consent.

Do not install external tools.
Do not configure integrations.
Do not recommend companion choices.
Do not store secret values.
Do not perform remote checks without explicit user consent.
Do not create `.wonder/reports/extend-latest.json`.
