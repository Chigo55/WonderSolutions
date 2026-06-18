import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  validateCapabilityManifestForDirectory,
  validateInstructionBody,
} from "../tools/shared/schema/capability.ts";
import {
  renderReuseTemplate,
  assertReuseTargetWriteAllowed,
  createReuseRunScaffold,
  selectReuseAsset,
} from "../tools/shared/runtime/reuse-run.ts";
import {
  reuseGenerationArtifactsSchema,
  selectedReuseAssetSchema,
} from "../tools/shared/schema/reuse.ts";

const root = process.cwd();

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(root, path), "utf8"));
}

describe("wonder-reuse.generate-output source", () => {
  it("defines metadata and platform-neutral instruction", async () => {
    const manifest = validateCapabilityManifestForDirectory(
      await readJson("packages/wonder-reuse/capabilities/generate-output/capability.json"),
      "generate-output",
    );
    const instruction = validateInstructionBody(
      await readFile(join(root, "packages/wonder-reuse/capabilities/generate-output/instruction.md"), "utf8"),
    );

    assert.deepEqual(manifest, {
      schemaVersion: 1,
      id: "generate-output",
      title: "Generate Output",
      kind: "workflow",
      description: "Render a reusable asset into concrete output.",
      requires: ["read", "search", "write", "ask-user", "report", "manage-state"],
    });
    assert.match(instruction, /scope[\s\S]*select[\s\S]*resolve-variables[\s\S]*render[\s\S]*deliver[\s\S]*report/);
    assert.match(instruction, /selected-asset\.json/);
    assert.match(instruction, /variables\.json/);
    assert.match(instruction, /output\.md/);
    assert.match(instruction, /\{\{variableName\}\}/);
    assert.match(instruction, /Overwrite existing files only with explicit confirmation/i);
  });
});

describe("wonder-reuse.generate-output rendering", () => {
  it("renders variables with LF line endings", () => {
    const rendered = renderReuseTemplate("Hello {{name}}\r\nUse {{tool}}.\n", {
      name: "Wonder",
      tool: "reuse",
    });

    assert.equal(rendered.output, "Hello Wonder\nUse reuse.\n");
    assert.deepEqual(rendered.warnings, []);
  });

  it("blocks missing required variables and warns on unknown optional variables", () => {
    assert.throws(
      () =>
        renderReuseTemplate("Hello {{name}}", {}, {
          requiredVariables: ["name"],
        }),
      /missing required variables: name/,
    );

    const rendered = renderReuseTemplate("Hello {{name}} {{extra}}", { name: "Wonder" });
    assert.equal(rendered.output, "Hello Wonder ");
    assert.deepEqual(rendered.warnings, ["unknown variables in body: extra"]);
  });

  it("selects explicit assets and rejects ambiguous purpose matches", () => {
    const assets = [
      {
        id: "basic-report",
        kind: "template",
        title: "Basic Report",
        path: ".wonder/reuse/templates/basic-report",
        tags: ["report"],
        version: "0.1.0",
      },
      {
        id: "status-report",
        kind: "template",
        title: "Status Report",
        path: ".wonder/reuse/templates/status-report",
        tags: ["report"],
        version: "0.1.0",
      },
    ] as const;

    assert.equal(selectReuseAsset(assets, { assetId: "basic-report" }).id, "basic-report");
    assert.throws(() => selectReuseAsset(assets, { purpose: "report" }), /ambiguous asset match/);
  });

  it("allows only explicit safe target writes", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "wonder-reuse-output-"));

    try {
      assert.equal(
        await assertReuseTargetWriteAllowed({
          projectRoot,
          targetPath: "docs/report.md",
          explicitTargetPath: true,
        }),
        true,
      );
      await mkdir(join(projectRoot, "docs"), { recursive: true });
      await writeFile(join(projectRoot, "docs", "report.md"), "existing\n", "utf8");
      await assert.rejects(
        () =>
          assertReuseTargetWriteAllowed({
            projectRoot,
            targetPath: "docs/report.md",
            explicitTargetPath: true,
          }),
        /explicit overwrite confirmation/,
      );
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});

describe("wonder-reuse.generate-output run records", () => {
  it("creates the direct-call run scaffold", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "wonder-reuse-generate-"));

    try {
      const runId = "20260618-180000-wonder-reuse-generate-output-test";
      const result = await createReuseRunScaffold({
        projectRoot,
        runId,
        capabilityId: "generate-output",
        platform: "codex",
        userRequest: "Generate a status report.",
        startedAt: "2026-06-18T09:00:00.000Z",
        operation: "generate",
      });

      assert.deepEqual(result.files.sort(), [
        ".wonder/runs/20260618-180000-wonder-reuse-generate-output-test/artifacts.json",
        ".wonder/runs/20260618-180000-wonder-reuse-generate-output-test/output.md",
        ".wonder/runs/20260618-180000-wonder-reuse-generate-output-test/report.md",
        ".wonder/runs/20260618-180000-wonder-reuse-generate-output-test/request.md",
        ".wonder/runs/20260618-180000-wonder-reuse-generate-output-test/run.json",
        ".wonder/runs/20260618-180000-wonder-reuse-generate-output-test/selected-asset.json",
        ".wonder/runs/20260618-180000-wonder-reuse-generate-output-test/variables.json",
      ]);

      const selectedAsset = selectedReuseAssetSchema.parse(
        JSON.parse(await readFile(join(projectRoot, ".wonder/runs", runId, "selected-asset.json"), "utf8")),
      );
      const artifacts = reuseGenerationArtifactsSchema.parse(
        JSON.parse(await readFile(join(projectRoot, ".wonder/runs", runId, "artifacts.json"), "utf8")),
      );
      assert.deepEqual(selectedAsset, {});
      assert.deepEqual(artifacts, { writtenPaths: [] });
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
