# wonder-govern.define-standards

## Purpose

`wonder-govern.define-standards` creates and maintains project-specific standards.

It can write or update `.wonder/standards/` Markdown files. It may analyze the project to infer conventions, but it must distinguish observed conventions from proposed standards.

## User-Facing Behavior

The user asks to define, update, organize, or refine project rules.

`wonder-govern.define-standards` may directly create or modify standards files.

Deletion of standards or rules is allowed only when explicitly requested by the user.

When proposed standards conflict with existing standards, it must report the conflict and ask for user confirmation before applying the conflicting change.

## Inputs

Required input:

- User request.
- Current project context.
- Existing `.wonder/standards/` files when present.

Optional input:

- Existing repository documents.
- Observed code, test, documentation, or architecture conventions.
- `.wonder/config/govern.json`.
- Related findings or reports from previous runs.

## Lifecycle

`wonder-govern.define-standards` uses this lifecycle:

```text
scope
observe
propose
apply
report
```

`scope` determines which standards domains are in scope.

`observe` inspects current project conventions.

`propose` separates observed conventions from proposed standards.

`apply` writes non-conflicting accepted standards to `.wonder/standards/`.

`report` summarizes changes, conflicts, and recommended next steps.

## Runtime State

`wonder-govern.define-standards` reads:

```text
.wonder/state.json
.wonder/config/govern.json
.wonder/standards/
```

It writes:

```text
.wonder/standards/
.wonder/runs/<run-id>/
```

It does not write `.wonder/reports/govern-latest.json`. That report belongs to `wonder-govern.check-policy`.

## Run Records

One user request creates one run:

```text
.wonder/runs/<run-id>/
  run.json
  request.md
  observed-conventions.md
  proposed-standards.md
  changes.md
  report.md
  artifacts.json
```

`observed-conventions.md` records current project patterns discovered during analysis.

`proposed-standards.md` records the standards proposed for adoption.

`changes.md` records standards files changed, rules added, rules updated, and conflicts requiring user confirmation.

## Reports

The user-facing report includes:

- Standards files created or modified.
- Observed conventions used as evidence.
- Proposed standards accepted.
- Conflicts that need user decision.
- Recommended next step to run `wonder-govern.check-policy`.

`define-standards` recommends running `check-policy` after standards changes, but does not automatically run it unless the user requested that behavior or config explicitly opts in.

## Capability Discovery

`define-standards` is the owner of `.wonder/standards/`.

Other plugins may read standards, but should not directly modify them.

`define-standards` does not require other Wonder plugins.

## Validation

Standards files use Markdown.

Default standards files:

```text
.wonder/standards/coding.md
.wonder/standards/architecture.md
.wonder/standards/security.md
.wonder/standards/docs.md
```

Additional standards files are allowed and should use kebab-case Markdown names.

Each machine-referenceable rule uses this id format:

```text
GOV-<DOMAIN>-<NUMBER>
```

Examples:

```text
GOV-CODING-001
GOV-ARCH-001
GOV-SEC-001
GOV-DOCS-001
GOV-TEST-001
```

Each rule has a default severity:

```text
critical
high
medium
low
info
```

Rule severity means the usual impact if the rule is violated. Violation confidence is not part of a rule; confidence belongs only to specific policy check results.

Example rule format:

```md
## GOV-CODING-001: Prefer Project-Local Patterns

Use existing local patterns before introducing new abstractions.

Rationale: Keeps generated changes consistent with the repository.
Severity: medium
```

## Failure Handling

If project conventions are unclear, `define-standards` may propose cautious starter standards and mark assumptions in the report.

If a proposed rule conflicts with an existing rule, it must not automatically merge or delete either rule. It records the conflict and asks for user confirmation.

If a requested standards deletion is ambiguous, ask before deleting.

If standards files cannot be written, report the failure and avoid partial destructive edits.

## Non-Goals

`wonder-govern.define-standards` does not:

- Check whether the project currently complies with standards.
- Update `govern-latest.json`.
- Automatically run `check-policy` by default.
- Modify other Wonder plugin config files.
- Delete standards without explicit user request.
- Treat observed conventions as standards without distinguishing them.
