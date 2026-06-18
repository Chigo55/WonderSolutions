import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  validateCapabilityManifestForDirectory,
  validateInstructionBody,
} from "../tools/shared/schema/capability.ts";
import {
  buildLatestReportForCompletion,
  buildLatestReportSchema,
  buildModifyArtifactsSchema,
  modifyScopeGuardSchema,
  runRecordSchema,
} from "../tools/shared/schema/run.ts";
import { createBuildRunScaffold } from "../tools/shared/runtime/build-run.ts";

const root = process.cwd();

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(root, path), "utf8"));
}

describe("wonder-build.modify source", () => {
  it("defines wonder-build.modify metadata and platform-neutral instruction", async () => {
    const manifest = validateCapabilityManifestForDirectory(
      await readJson("packages/wonder-build/capabilities/modify/capability.json"),
      "modify",
    );
    const instruction = validateInstructionBody(
      await readFile(join(root, "packages/wonder-build/capabilities/modify/instruction.md"), "utf8"),
    );

    assert.deepEqual(manifest, {
      schemaVersion: 1,
      id: "modify",
      title: "Modify Artifact",
      kind: "workflow",
      description: "Modify an existing project artifact or behavior while preserving unrelated user work.",
      requires: [
        "read",
        "search",
        "write",
        "edit",
        "run-command",
        "ask-user",
        "report",
        "manage-state",
      ],
    });
    assert.match(instruction, /understand[\s\S]*plan[\s\S]*implement[\s\S]*inspect[\s\S]*report/);
    assert.match(instruction, /preserve unrelated user work/i);
    assert.match(instruction, /scope guard/i);
    assert.match(instruction, /\.wonder\/runs\/<run-id>\//);
    assert.match(instruction, /\.wonder\/reports\/build-latest\.json/);
    assert.match(instruction, /Do not write `?\.wonder\/config\/reuse\.json`?/i);
    assert.match(instruction, /Do not write `?\.wonder\/reports\/govern-latest\.json`?/i);
  });
});

describe("wonder-build.modify runtime records", () => {
  it("creates a modify run scaffold with modify-specific artifacts", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "wonder-build-modify-"));

    try {
      const runId = "20260618-130000-wonder-build-modify-test";
      await createBuildRunScaffold({
        projectRoot,
        runId,
        capabilityId: "modify",
        platform: "claude",
        userRequest: "Change the existing task document.",
        startedAt: "2026-06-18T04:00:00.000Z",
      });

      const runRecord = runRecordSchema.parse(
        JSON.parse(await readFile(join(projectRoot, ".wonder/runs", runId, "run.json"), "utf8")),
      );
      assert.equal(runRecord.capabilityId, "modify");

      const artifacts = buildModifyArtifactsSchema.parse(
        JSON.parse(await readFile(join(projectRoot, ".wonder/runs", runId, "artifacts.json"), "utf8")),
      );
      assert.deepEqual(artifacts, {
        modified: [],
        created: [],
        deleted: [],
        validation: [],
        preservedUnrelatedChanges: [],
      });
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it("validates the modify scope guard contract", () => {
    const guard = modifyScopeGuardSchema.parse({
      targetDescription: "Existing task document",
      allowedPaths: ["docs/tasks.md"],
      observedRelatedPaths: ["docs/tasks.md", "docs/index.md"],
      unrelatedDirtyPaths: ["README.md"],
    });

    assert.equal(guard.targetDescription, "Existing task document");
  });
});

describe("wonder-build.modify latest report", () => {
  it("marks a successful modify run as the latest build report", () => {
    const report = buildLatestReportSchema.parse(
      buildLatestReportForCompletion({
        runId: "20260618-130000-wonder-build-modify-test",
        capabilityId: "modify",
        summary: "Modified the requested artifact and verified available checks.",
        finishedAt: "2026-06-18T04:10:00.000Z",
      }),
    );

    assert.equal(report.capability, "wonder-build.modify");
    assert.equal(report.lastCompletedRunId, "20260618-130000-wonder-build-modify-test");
    assert.equal(report.status, "completed");
  });
});
