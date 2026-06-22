import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RuntimeAbortError } from "../tools/shared/runtime/result.ts";
import {
  assertScaffoldRewriteAllowed,
  createScaffold,
  repairScaffold,
} from "../tools/shared/runtime/markdown/scaffold.ts";
import { SCAFFOLDS } from "../tools/shared/runtime/markdown/registry.ts";

describe("createScaffold", () => {
  it("renders the H1 title and ordered section headings", () => {
    assert.equal(
      createScaffold("build-create-plan"),
      "# Plan\n\n## Scope\n\n## Steps\n\n## Validation\n\n## Risks\n",
    );
  });

  it("varies sections by capability context", () => {
    assert.match(createScaffold("build-modify-plan"), /## Allowed Paths/);
    assert.doesNotMatch(createScaffold("build-create-plan"), /## Allowed Paths/);
  });

  it("emits an optional known marker as an HTML comment", () => {
    assert.match(
      createScaffold("proposed-standards"),
      /## Proposed Rules\n\n<!-- Per rule: rule id, severity, rationale, applies-to, examples -->/,
    );
  });

  it("ends with exactly one trailing newline for every scaffold", () => {
    for (const id of Object.keys(SCAFFOLDS) as (keyof typeof SCAFFOLDS)[]) {
      const content = createScaffold(id);
      assert.equal(content.endsWith("\n"), true);
      assert.equal(content.endsWith("\n\n"), false, `scaffold ${id} has a double trailing newline`);
    }
  });
});

describe("repairScaffold", () => {
  it("replaces an empty file with the full scaffold", () => {
    const result = repairScaffold("build-create-plan", "");
    assert.equal(result.replacedEmpty, true);
    assert.equal(result.content, createScaffold("build-create-plan"));
    assert.deepEqual(result.addedSections, ["Scope", "Steps", "Validation", "Risks"]);
  });

  it("treats whitespace-only content as empty", () => {
    const result = repairScaffold("run-report", "   \n\t\n");
    assert.equal(result.replacedEmpty, true);
    assert.equal(result.content, createScaffold("run-report"));
  });

  it("preserves a complete scaffold and adds nothing", () => {
    const existing = createScaffold("run-report");
    const result = repairScaffold("run-report", existing);
    assert.equal(result.replacedEmpty, false);
    assert.deepEqual(result.addedSections, []);
    assert.equal(result.content, existing);
  });

  it("appends only missing sections and preserves unknown content", () => {
    const existing = "# Plan\n\n## Scope\n\nWe will do X.\n\n## Custom Section\n\nkeep me\n";
    const result = repairScaffold("build-create-plan", existing);

    assert.equal(result.replacedEmpty, false);
    assert.deepEqual(result.addedSections, ["Steps", "Validation", "Risks"]);
    assert.match(result.content, /## Scope\n\nWe will do X\./);
    assert.match(result.content, /## Custom Section\n\nkeep me/);
    assert.match(result.content, /## Steps/);
    assert.match(result.content, /## Validation/);
    assert.match(result.content, /## Risks/);
  });

  it("normalizes CRLF when preserving existing content", () => {
    const existing = createScaffold("run-report").replace(/\n/g, "\r\n");
    const result = repairScaffold("run-report", existing);
    assert.equal(result.content, createScaffold("run-report"));
    assert.doesNotMatch(result.content, /\r/);
  });
});

describe("assertScaffoldRewriteAllowed", () => {
  it("allows a confirmed destructive rewrite", () => {
    assert.equal(assertScaffoldRewriteAllowed({ confirmed: true }), true);
  });

  it("aborts an unconfirmed destructive rewrite with a repair hint", () => {
    assert.throws(
      () => assertScaffoldRewriteAllowed({ confirmed: false, path: ".wonder/runs/r/plan.md" }),
      (error: unknown) => {
        assert.ok(error instanceof RuntimeAbortError);
        assert.equal(error.detail.code, "runtime-destructive-rewrite");
        assert.equal(error.detail.path, ".wonder/runs/r/plan.md");
        return true;
      },
    );
  });
});
