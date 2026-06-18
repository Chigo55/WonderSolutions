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
  buildArtifactsSchema,
  buildLatestReportForCompletion,
  buildLatestReportForFailure,
  buildLatestReportSchema,
  runRecordSchema,
} from "../tools/shared/schema/run.ts";
import { createBuildRunScaffold } from "../tools/shared/runtime/build-run.ts";

const root = process.cwd();

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(root, path), "utf8"));
}

describe("wonder-build.create source", () => {
  it("defines wonder-build.create metadata and platform-neutral instruction", async () => {
    const manifest = validateCapabilityManifestForDirectory(
      await readJson("packages/wonder-build/capabilities/create/capability.json"),
      "create",
    );
    const instruction = validateInstructionBody(
      await readFile(join(root, "packages/wonder-build/capabilities/create/instruction.md"), "utf8"),
    );

    assert.deepEqual(manifest, {
      schemaVersion: 1,
      id: "create",
      title: "Create Artifact",
      kind: "workflow",
      description: "Create a new primary project artifact or capability from a user request.",
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
    assert.match(instruction, /\.wonder\/runs\/<run-id>\//);
    assert.match(instruction, /\.wonder\/reports\/build-latest\.json/);
    assert.match(instruction, /validationCommands[\s\S]*test[\s\S]*typecheck[\s\S]*lint[\s\S]*build/);
    assert.match(instruction, /Do not write `?\.wonder\/config\/govern\.json`?/i);
    assert.match(instruction, /Do not write `?\.wonder\/reports\/govern-latest\.json`?/i);
  });
});

describe("wonder-build.create run records", () => {
  it("creates the required run directory scaffold", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "wonder-build-create-"));

    try {
      const runId = "20260618-120000-wonder-build-create-test";
      const result = await createBuildRunScaffold({
        projectRoot,
        runId,
        capabilityId: "create",
        platform: "codex",
        userRequest: "Create a reusable task document.",
        startedAt: "2026-06-18T03:00:00.000Z",
      });

      assert.equal(result.runId, runId);
      assert.deepEqual(result.files.sort(), [
        ".wonder/runs/20260618-120000-wonder-build-create-test/artifacts.json",
        ".wonder/runs/20260618-120000-wonder-build-create-test/inspect.md",
        ".wonder/runs/20260618-120000-wonder-build-create-test/plan.md",
        ".wonder/runs/20260618-120000-wonder-build-create-test/report.md",
        ".wonder/runs/20260618-120000-wonder-build-create-test/request.md",
        ".wonder/runs/20260618-120000-wonder-build-create-test/run.json",
      ]);

      const runRecord = runRecordSchema.parse(
        JSON.parse(await readFile(join(projectRoot, ".wonder/runs", runId, "run.json"), "utf8")),
      );
      assert.deepEqual(runRecord, {
        schemaVersion: 1,
        runId,
        packageId: "wonder-build",
        capabilityId: "create",
        platform: "codex",
        status: "running",
        startedAt: "2026-06-18T03:00:00.000Z",
      });

      const artifacts = buildArtifactsSchema.parse(
        JSON.parse(await readFile(join(projectRoot, ".wonder/runs", runId, "artifacts.json"), "utf8")),
      );
      assert.deepEqual(artifacts, {
        created: [],
        modified: [],
        validated: [],
        reuseAssetsUsed: [],
        companionCapabilitiesUsed: [],
      });
      assert.equal(
        await readFile(join(projectRoot, ".wonder/runs", runId, "request.md"), "utf8"),
        "Create a reusable task document.\n",
      );
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});

describe("wonder-build.create latest report", () => {
  it("marks a successful create run as last completed and last run", () => {
    const report = buildLatestReportSchema.parse(
      buildLatestReportForCompletion({
        runId: "20260618-120000-wonder-build-create-test",
        capabilityId: "create",
        summary: "Created the requested artifact and verified available checks.",
        finishedAt: "2026-06-18T03:10:00.000Z",
      }),
    );

    assert.deepEqual(report, {
      schemaVersion: 1,
      lastCompletedRunId: "20260618-120000-wonder-build-create-test",
      lastRunId: "20260618-120000-wonder-build-create-test",
      capability: "wonder-build.create",
      status: "completed",
      summary: "Created the requested artifact and verified available checks.",
      finishedAt: "2026-06-18T03:10:00.000Z",
    });
  });

  it("preserves the previous completed run when recording a failure", () => {
    const previous = buildLatestReportSchema.parse({
      schemaVersion: 1,
      lastCompletedRunId: "20260618-110000-wonder-build-create-ok",
      lastRunId: "20260618-110000-wonder-build-create-ok",
      capability: "wonder-build.create",
      status: "completed",
      summary: "Created an earlier artifact.",
      finishedAt: "2026-06-18T02:10:00.000Z",
    });

    const report = buildLatestReportSchema.parse(
      buildLatestReportForFailure(previous, {
        runId: "20260618-120000-wonder-build-create-failed",
        capabilityId: "create",
        summary: "Validation failed.",
        finishedAt: "2026-06-18T03:10:00.000Z",
      }),
    );

    assert.equal(report.lastCompletedRunId, "20260618-110000-wonder-build-create-ok");
    assert.equal(report.lastRunId, "20260618-120000-wonder-build-create-failed");
    assert.equal(report.status, "failed");
  });
});
