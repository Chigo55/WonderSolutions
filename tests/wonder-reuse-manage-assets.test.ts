import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { ZodError } from "zod";
import {
  validateCapabilityManifestForDirectory,
  validateInstructionBody,
} from "../tools/shared/schema/capability.ts";
import {
  reuseAssetChangesSchema,
  reuseAssetManifestSchema,
  reuseAssetPath,
} from "../tools/shared/schema/reuse.ts";
import {
  assertReuseDeletionAllowed,
  createReuseRunScaffold,
  requiresReuseRunRecord,
} from "../tools/shared/runtime/reuse-run.ts";

const root = process.cwd();

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(root, path), "utf8"));
}

describe("wonder-reuse.manage-assets source", () => {
  it("defines metadata and platform-neutral instruction", async () => {
    const manifest = validateCapabilityManifestForDirectory(
      await readJson("packages/wonder-reuse/capabilities/manage-assets/capability.json"),
      "manage-assets",
    );
    const instruction = validateInstructionBody(
      await readFile(join(root, "packages/wonder-reuse/capabilities/manage-assets/instruction.md"), "utf8"),
    );

    assert.deepEqual(manifest, {
      schemaVersion: 1,
      id: "manage-assets",
      title: "Manage Assets",
      kind: "workflow",
      description: "Create, update, organize, move, and explicitly delete reusable assets.",
      requires: ["read", "search", "write", "edit", "ask-user", "report", "manage-state"],
    });
    assert.match(instruction, /scope[\s\S]*inspect[\s\S]*change[\s\S]*index[\s\S]*report/);
    assert.match(instruction, /asset-changes\.json/);
    assert.match(instruction, /deletion is allowed only when explicitly requested/i);
    assert.match(instruction, /\.wonder\/reuse\/index\.json/);
    assert.match(instruction, /does not maintain a latest report/i);
  });
});

describe("wonder-reuse.manage-assets asset validation", () => {
  it("validates regular asset metadata and paths", () => {
    const asset = reuseAssetManifestSchema.parse({
      schemaVersion: 1,
      id: "basic-report",
      kind: "template",
      title: "Basic Report",
      description: "A reusable report template.",
      variables: {},
      tags: [],
      appliesTo: [],
      version: "0.1.0",
    });

    assert.equal(asset.id, "basic-report");
    assert.equal(reuseAssetPath("template", "basic-report"), ".wonder/reuse/templates/basic-report");
  });

  it("rejects invalid ids and missing variables", () => {
    assert.throws(
      () =>
        reuseAssetManifestSchema.parse({
          schemaVersion: 1,
          id: "Basic Report",
          kind: "template",
          title: "Basic Report",
          description: "Invalid id.",
          variables: {},
        }),
      ZodError,
    );
    assert.throws(
      () =>
        reuseAssetManifestSchema.parse({
          schemaVersion: 1,
          id: "basic-report",
          kind: "template",
          title: "Basic Report",
          description: "Missing variables.",
        }),
      ZodError,
    );
  });

  it("requires explicit deletion and referenced-asset confirmation", () => {
    assert.throws(
      () => assertReuseDeletionAllowed({ explicitDeleteRequested: false, referenced: false }),
      /explicit user request/,
    );
    assert.throws(
      () => assertReuseDeletionAllowed({ explicitDeleteRequested: true, referenced: true }),
      /referenced asset deletion requires explicit confirmation/,
    );
    assert.equal(
      assertReuseDeletionAllowed({
        explicitDeleteRequested: true,
        referenced: true,
        referencedDeletionConfirmed: true,
      }),
      true,
    );
  });
});

describe("wonder-reuse.manage-assets run records", () => {
  it("requires run records only for asset-changing operations", () => {
    assert.equal(requiresReuseRunRecord("list"), false);
    assert.equal(requiresReuseRunRecord("search"), false);
    assert.equal(requiresReuseRunRecord("inspect"), false);
    assert.equal(requiresReuseRunRecord("create"), true);
    assert.equal(requiresReuseRunRecord("update"), true);
    assert.equal(requiresReuseRunRecord("move"), true);
    assert.equal(requiresReuseRunRecord("delete"), true);
  });

  it("creates the required manage-assets run directory scaffold for changing operations", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "wonder-reuse-manage-"));

    try {
      const runId = "20260618-170000-wonder-reuse-manage-assets-test";
      const result = await createReuseRunScaffold({
        projectRoot,
        runId,
        capabilityId: "manage-assets",
        platform: "codex",
        userRequest: "Create a reusable report template.",
        startedAt: "2026-06-18T08:30:00.000Z",
        operation: "create",
      });

      assert.deepEqual(result.files.sort(), [
        ".wonder/runs/20260618-170000-wonder-reuse-manage-assets-test/artifacts.json",
        ".wonder/runs/20260618-170000-wonder-reuse-manage-assets-test/asset-changes.json",
        ".wonder/runs/20260618-170000-wonder-reuse-manage-assets-test/report.md",
        ".wonder/runs/20260618-170000-wonder-reuse-manage-assets-test/request.md",
        ".wonder/runs/20260618-170000-wonder-reuse-manage-assets-test/run.json",
      ]);

      const changes = reuseAssetChangesSchema.parse(
        JSON.parse(await readFile(join(projectRoot, ".wonder/runs", runId, "asset-changes.json"), "utf8")),
      );
      assert.deepEqual(changes, {
        created: [],
        updated: [],
        moved: [],
        deleted: [],
        deletionCandidates: [],
      });
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
