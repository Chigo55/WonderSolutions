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
  promotedAssetArtifactsSchema,
  reuseAssetManifestSchema,
} from "../tools/shared/schema/reuse.ts";
import {
  assertPromotionSaveAllowed,
  createPromotedAssetDraft,
  createReuseRunScaffold,
} from "../tools/shared/runtime/reuse-run.ts";

const root = process.cwd();

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(root, path), "utf8"));
}

describe("wonder-reuse.promote-asset source", () => {
  it("defines metadata and platform-neutral instruction", async () => {
    const manifest = validateCapabilityManifestForDirectory(
      await readJson("packages/wonder-reuse/capabilities/promote-asset/capability.json"),
      "promote-asset",
    );
    const instruction = validateInstructionBody(
      await readFile(join(root, "packages/wonder-reuse/capabilities/promote-asset/instruction.md"), "utf8"),
    );

    assert.deepEqual(manifest, {
      schemaVersion: 1,
      id: "promote-asset",
      title: "Promote Asset",
      kind: "workflow",
      description: "Turn existing content or repeated output into a reusable asset.",
      requires: ["read", "search", "write", "edit", "ask-user", "report", "manage-state"],
    });
    assert.match(instruction, /scope[\s\S]*analyze[\s\S]*abstract[\s\S]*propose[\s\S]*confirm[\s\S]*save[\s\S]*report/);
    assert.match(instruction, /source\.md/);
    assert.match(instruction, /proposed-asset\.json/);
    assert.match(instruction, /proposed-body\.md/);
    assert.match(instruction, /createdFromRunId/);
    assert.match(instruction, /Do not save a draft without confirmation unless explicitly requested/i);
  });
});

describe("wonder-reuse.promote-asset draft validation", () => {
  it("creates a reusable asset draft with optional source run provenance", () => {
    const draft = createPromotedAssetDraft({
      sourceContent: "Review {{target}} and report risks.",
      kind: "template",
      id: "review-report",
      title: "Review Report",
      description: "Reusable review report template.",
      variables: { target: { description: "Reviewed target" } },
      tags: ["review"],
      sourceRunId: "20260618-120000-wonder-build-review",
    });

    assert.equal(draft.body, "Review {{target}} and report risks.\n");
    assert.equal(draft.asset.createdFromRunId, "20260618-120000-wonder-build-review");
    assert.equal(reuseAssetManifestSchema.parse(draft.asset).id, "review-report");
  });

  it("requires source content and target kind", () => {
    assert.throws(
      () =>
        createPromotedAssetDraft({
          sourceContent: "",
          kind: "template",
          id: "empty-source",
          title: "Empty Source",
          description: "Invalid empty source.",
          variables: {},
        }),
      /source content is required/,
    );
    assert.throws(
      () =>
        createPromotedAssetDraft({
          sourceContent: "Content",
          kind: "invalid",
          id: "bad-kind",
          title: "Bad Kind",
          description: "Invalid kind.",
          variables: {},
        }),
      /target kind is unsupported/,
    );
  });

  it("requires confirmation unless immediate save was explicitly requested", () => {
    assert.throws(
      () => assertPromotionSaveAllowed({ immediateSaveRequested: false, draftConfirmed: false }),
      /confirmation required before saving promoted asset/,
    );
    assert.equal(assertPromotionSaveAllowed({ immediateSaveRequested: true, draftConfirmed: false }), true);
    assert.equal(assertPromotionSaveAllowed({ immediateSaveRequested: false, draftConfirmed: true }), true);
  });
});

describe("wonder-reuse.promote-asset run records", () => {
  it("creates the required promote-asset run directory scaffold", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "wonder-reuse-promote-"));

    try {
      const runId = "20260618-190000-wonder-reuse-promote-asset-test";
      const result = await createReuseRunScaffold({
        projectRoot,
        runId,
        capabilityId: "promote-asset",
        platform: "codex",
        userRequest: "Promote this review text into a template.",
        startedAt: "2026-06-18T10:00:00.000Z",
        operation: "promote",
      });

      assert.deepEqual(result.files.sort(), [
        ".wonder/runs/20260618-190000-wonder-reuse-promote-asset-test/abstraction.md",
        ".wonder/runs/20260618-190000-wonder-reuse-promote-asset-test/artifacts.json",
        ".wonder/runs/20260618-190000-wonder-reuse-promote-asset-test/proposed-asset.json",
        ".wonder/runs/20260618-190000-wonder-reuse-promote-asset-test/proposed-body.md",
        ".wonder/runs/20260618-190000-wonder-reuse-promote-asset-test/report.md",
        ".wonder/runs/20260618-190000-wonder-reuse-promote-asset-test/request.md",
        ".wonder/runs/20260618-190000-wonder-reuse-promote-asset-test/run.json",
        ".wonder/runs/20260618-190000-wonder-reuse-promote-asset-test/source.md",
      ]);

      const artifacts = promotedAssetArtifactsSchema.parse(
        JSON.parse(await readFile(join(projectRoot, ".wonder/runs", runId, "artifacts.json"), "utf8")),
      );
      assert.deepEqual(artifacts, { savedAssetPath: null });
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
