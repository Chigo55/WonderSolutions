import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { OPERATION_NAMES, executeOperation } from "../tools/shared/runtime/operations.ts";

const repoRoot = process.cwd();
const generatedAt = "2026-06-22T00:00:00.000Z";

const SPEC_OPERATIONS = [
  "listPackages",
  "listCapabilities",
  "getCapabilitySpec",
  "initPlugin",
  "readState",
  "validateState",
  "createRunScaffold",
  "updateRunRecord",
  "updateLatestReport",
  "refreshReuseIndex",
  "renderReuseOutput",
  "applyIntegrationChange",
  "detectCapabilities",
  "generate",
  "validate",
  "drift",
];

async function withTempRoot(body: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "runtime-operations-"));
  try {
    await body(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("operation registry", () => {
  it("registers exactly the section 7 operation set", () => {
    assert.deepEqual([...OPERATION_NAMES].sort(), [...SPEC_OPERATIONS].sort());
  });

  it("fails an unknown operation", async () => {
    const result = await executeOperation("doesNotExist", {});
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.error.code, "runtime-unknown-operation");
  });

  it("fails invalid input without throwing", async () => {
    const result = await executeOperation("listPackages", { sourceRoot: 123 });
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.error.code, "runtime-invalid-input");
  });
});

describe("operation registry — source operations", () => {
  it("lists packages through the registry", async () => {
    const result = await executeOperation("listPackages", { sourceRoot: repoRoot });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const data = result.data as Array<{ id: string }>;
    assert.equal(data.length, 4);
  });

  it("reports no drift for the committed repo", async () => {
    const result = await executeOperation("drift", { root: repoRoot });
    assert.equal(result.ok, true);
    assert.equal(result.ok === true && (result.data as { drift: boolean }).drift, false);
  });

  it("computes generate output in dry-run without writing", async () => {
    const result = await executeOperation("generate", { sourceRoot: repoRoot, dryRun: true });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const data = result.data as { generated: number; written: string[]; skipped: string[] };
    assert.ok(data.generated > 0);
    assert.deepEqual(data.written, []);
  });
});

describe("operation registry — project-local lifecycle", () => {
  it("inits, reads state, scaffolds a run, and updates the record", async () => {
    await withTempRoot(async (root) => {
      const init = await executeOperation("initPlugin", {
        projectRoot: root,
        packageId: "wonder-build",
        platform: "claude",
        generatedAt,
        sourceRoot: repoRoot,
      });
      assert.equal(init.ok, true);
      assert.equal(existsSync(join(root, ".wonder/state.json")), true);

      const state = await executeOperation("readState", { projectRoot: root });
      assert.equal(state.ok, true);
      assert.ok(state.ok && (state.data as { plugins: Record<string, unknown> }).plugins["wonder-build"]);

      const runId = "20260622-000000-wonder-build-create";
      const scaffold = await executeOperation("createRunScaffold", {
        projectRoot: root,
        packageId: "wonder-build",
        capabilityId: "create",
        platform: "claude",
        userRequest: "Create something.",
        startedAt: generatedAt,
        runId,
      });
      assert.equal(scaffold.ok, true);
      assert.equal(scaffold.ok && scaffold.paths.created.includes(`.wonder/runs/${runId}/plan.md`), true);

      const update = await executeOperation("updateRunRecord", {
        projectRoot: root,
        runId,
        patch: { status: "succeeded", finishedAt: "2026-06-22T00:05:00.000Z" },
      });
      assert.equal(update.ok, true);
      assert.equal(update.ok && (update.data as { status: string }).status, "succeeded");
    });
  });

  it("preserves existing run scaffold files and reports them as existing", async () => {
    await withTempRoot(async (root) => {
      const runId = "20260622-010000-wonder-build-create";
      const input = {
        projectRoot: root,
        packageId: "wonder-build",
        capabilityId: "create",
        platform: "claude",
        startedAt: generatedAt,
        runId,
      };

      const first = await executeOperation("createRunScaffold", {
        ...input,
        userRequest: "First request.",
      });
      assert.equal(first.ok, true);

      const second = await executeOperation("createRunScaffold", {
        ...input,
        userRequest: "Second request.",
      });
      assert.equal(second.ok, true);
      if (!second.ok) return;
      assert.equal(second.paths.created.length, 0);
      assert.ok(second.paths.existing.includes(`.wonder/runs/${runId}/request.md`));
      assert.equal(await readFile(join(root, ".wonder/runs", runId, "request.md"), "utf8"), "First request.\n");
    });
  });

  it("rejects unknown run-record patch fields", async () => {
    await withTempRoot(async (root) => {
      const runId = "20260622-020000-wonder-build-create";
      await executeOperation("createRunScaffold", {
        projectRoot: root,
        packageId: "wonder-build",
        capabilityId: "create",
        platform: "claude",
        userRequest: "Create something.",
        startedAt: generatedAt,
        runId,
      });

      const result = await executeOperation("updateRunRecord", {
        projectRoot: root,
        runId,
        patch: { unknownField: "should fail" },
      });
      assert.equal(result.ok, false);
      assert.equal(result.ok === false && result.error.code, "runtime-invalid-input");
    });
  });

  it("renders a reuse template with variable warnings", async () => {
    const result = await executeOperation("renderReuseOutput", {
      body: "Hello {{name}} and {{missing}}",
      variables: { name: "World" },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal((result.data as { output: string }).output, "Hello World and ");
    assert.equal(result.warnings.length, 1);
  });

  it("renders reuse output into the run output file when a run id is supplied", async () => {
    await withTempRoot(async (root) => {
      const runId = "20260622-030000-wonder-reuse-generate-output";
      await executeOperation("createRunScaffold", {
        projectRoot: root,
        packageId: "wonder-reuse",
        capabilityId: "generate-output",
        platform: "claude",
        userRequest: "Generate a report.",
        startedAt: generatedAt,
        runId,
        operation: "generate",
      });

      const result = await executeOperation("renderReuseOutput", {
        projectRoot: root,
        runId,
        body: "Hello {{name}}",
        variables: { name: "Wonder" },
      });
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.ok(result.paths.updated.includes(`.wonder/runs/${runId}/output.md`));
      assert.deepEqual((result.data as { writtenPaths: string[] }).writtenPaths, [
        `.wonder/runs/${runId}/output.md`,
      ]);
      assert.equal(await readFile(join(root, ".wonder/runs", runId, "output.md"), "utf8"), "Hello Wonder");
    });
  });
});
