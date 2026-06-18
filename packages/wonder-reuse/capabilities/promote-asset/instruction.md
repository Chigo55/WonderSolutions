# Promote Asset

Turn existing content or repeated output into a reusable asset.

## Procedure

scope

- Resolve the target asset kind and reuse context.
- Find source content from a user request, source run id, or project file.
- Ask for source content when it is missing.
- Ask for target kind when it is missing.

analyze

- Read the source content.
- Identify repeated structure and context-specific values.
- Note whether the source came from an existing run.

abstract

- Convert context-specific values into variables.
- Keep useful fixed structure.
- Avoid a draft that is too specific to one use case unless requested.
- Avoid a draft that is too abstract to provide useful structure.

propose

- Write `.wonder/runs/<run-id>/source.md`.
- Write `.wonder/runs/<run-id>/proposed-asset.json`.
- Write `.wonder/runs/<run-id>/proposed-body.md`.
- Record `createdFromRunId` only when source content came from an existing run.
- Summarize variables, fixed content, assumptions, and ambiguities in `.wonder/runs/<run-id>/abstraction.md`.

confirm

- Ask before saving unless the user explicitly requested immediate save.
- If the user declines the draft, keep the run record and do not save the asset.

save

- Create `.wonder/reuse/<kind>/<asset-id>/`.
- Write `asset.json` and `body.md`.
- Refresh `.wonder/reuse/index.json`.
- Require confirmation before overwriting an existing asset id.

report

- Write `.wonder/runs/<run-id>/report.md`.
- Record the final saved asset path in `.wonder/runs/<run-id>/artifacts.json` when saved.
- Summarize target kind, asset id, variables abstracted, fixed structure retained, final path, and confirmation status.

Do not render final output for immediate use.
Do not manage existing assets unrelated to the promotion.
Do not save a draft without confirmation unless explicitly requested.
Do not overwrite existing assets without confirmation.
Do not maintain a latest report file.
Do not modify other plugin config files.
