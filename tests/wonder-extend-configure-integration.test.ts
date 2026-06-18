import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  validateCapabilityManifestForDirectory,
  validateInstructionBody,
} from "../tools/shared/schema/capability.ts";
import {
  configureIntegrationArtifactsSchema,
  integrationChangesSchema,
  extendIntegrationCatalogSchema,
  extendIntegrationsSnapshotSchema,
} from "../tools/shared/schema/extend.ts";
import {
  applyIntegrationChange,
  assertIntegrationMetadataHasNoSecrets,
  createConfigureIntegrationRunScaffold,
  requiresConfigureIntegrationRunRecord,
} from "../tools/shared/runtime/extend-run.ts";

const root = process.cwd();

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(root, path), "utf8"));
}

describe("wonder-extend.configure-integration source", () => {
  it("defines metadata and platform-neutral instruction", async () => {
    const manifest = validateCapabilityManifestForDirectory(
      await readJson("packages/wonder-extend/capabilities/configure-integration/capability.json"),
      "configure-integration",
    );
    const instruction = validateInstructionBody(
      await readFile(
        join(root, "packages/wonder-extend/capabilities/configure-integration/instruction.md"),
        "utf8",
      ),
    );

    assert.deepEqual(manifest, {
      schemaVersion: 1,
      id: "configure-integration",
      title: "Configure Integration",
      kind: "workflow",
      description: "Record non-secret external integration metadata.",
      requires: ["read", "write", "ask-user", "report", "manage-state"],
    });
    assert.match(instruction, /scope[\s\S]*validate-reference[\s\S]*change[\s\S]*report/);
    assert.match(instruction, /integration-changes\.json/);
    assert.match(instruction, /Do not write `?\.wonder\/extend\/capabilities\.json`?/i);
    assert.match(instruction, /Do not store secret values/i);
  });

  it("defines integration catalog entries as integrations, not companions", async () => {
    const catalog = extendIntegrationCatalogSchema.parse(
      await readJson("packages/wonder-extend/catalog/integrations.json"),
    );

    assert.equal(catalog.schemaVersion, 1);
    assert.throws(
      () =>
        extendIntegrationCatalogSchema.parse({
          schemaVersion: 1,
          integrations: [
            {
              id: "bad-companion",
              displayName: "Bad Companion",
              sourceType: "companion",
            },
          ],
        }),
      /Invalid literal value/,
    );
  });
});

describe("wonder-extend.configure-integration metadata", () => {
  it("adds and updates non-secret integration metadata while preserving unrelated entries", () => {
    const catalog = extendIntegrationCatalogSchema.parse({
      schemaVersion: 1,
      integrations: [{ id: "github", displayName: "GitHub", sourceType: "integration" }],
    });
    const existingSnapshot = extendIntegrationsSnapshotSchema.parse({
      schemaVersion: 1,
      integrations: {
        linear: {
          enabled: true,
          auth: { type: "env", envVar: "LINEAR_API_KEY" },
          metadata: { provider: "linear" },
        },
      },
    });

    const result = applyIntegrationChange({
      catalog,
      existingSnapshot,
      action: "add",
      integrationId: "github",
      auth: { type: "env", envVar: "GITHUB_TOKEN" },
      metadata: { provider: "github", apiBaseUrl: "https://api.github.com" },
    });

    assert.deepEqual(result.changes, {
      added: ["github"],
      updated: [],
      disabled: [],
      removed: [],
    });
    assert.deepEqual(result.snapshot.integrations.github, {
      enabled: true,
      auth: { type: "env", envVar: "GITHUB_TOKEN" },
      metadata: { provider: "github", apiBaseUrl: "https://api.github.com" },
    });
    assert.equal(result.snapshot.integrations.linear?.enabled, true);
  });

  it("rejects secret fields and unknown integrations without confirmation", () => {
    const catalog = extendIntegrationCatalogSchema.parse({
      schemaVersion: 1,
      integrations: [{ id: "github", displayName: "GitHub", sourceType: "integration" }],
    });

    assert.throws(
      () => assertIntegrationMetadataHasNoSecrets({ token: "secret-value" }),
      /integration metadata must not contain secret values/,
    );
    assert.throws(
      () =>
        applyIntegrationChange({
          catalog,
          existingSnapshot: { schemaVersion: 1, integrations: {} },
          action: "add",
          integrationId: "custom-crm",
          metadata: { provider: "custom" },
        }),
      /unknown integration requires confirmation/,
    );
  });

  it("disables and removes integrations without affecting capability availability", () => {
    const existingSnapshot = extendIntegrationsSnapshotSchema.parse({
      schemaVersion: 1,
      integrations: {
        github: {
          enabled: true,
          auth: { type: "env", envVar: "GITHUB_TOKEN" },
          metadata: { provider: "github" },
        },
        linear: {
          enabled: true,
          metadata: { provider: "linear" },
        },
      },
    });

    const disabled = applyIntegrationChange({
      existingSnapshot,
      action: "disable",
      integrationId: "github",
      customIntegrationConfirmed: true,
    });
    const removed = applyIntegrationChange({
      existingSnapshot: disabled.snapshot,
      action: "remove",
      integrationId: "linear",
      customIntegrationConfirmed: true,
    });

    assert.equal(disabled.snapshot.integrations.github?.enabled, false);
    assert.deepEqual(disabled.changes.disabled, ["github"]);
    assert.equal(removed.snapshot.integrations.linear, undefined);
    assert.deepEqual(removed.changes.removed, ["linear"]);
  });
});

describe("wonder-extend.configure-integration run records", () => {
  it("creates the required run directory scaffold for integration changes only", async () => {
    assert.equal(requiresConfigureIntegrationRunRecord("inspect"), false);
    assert.equal(requiresConfigureIntegrationRunRecord("add"), true);

    const projectRoot = await mkdtemp(join(tmpdir(), "wonder-extend-configure-"));

    try {
      const runId = "20260618-210000-wonder-extend-configure-integration-test";
      const result = await createConfigureIntegrationRunScaffold({
        projectRoot,
        runId,
        platform: "codex",
        userRequest: "Configure GitHub using an environment variable.",
        startedAt: "2026-06-18T12:00:00.000Z",
        operation: "add",
      });

      assert.deepEqual(result.files.sort(), [
        ".wonder/runs/20260618-210000-wonder-extend-configure-integration-test/artifacts.json",
        ".wonder/runs/20260618-210000-wonder-extend-configure-integration-test/integration-changes.json",
        ".wonder/runs/20260618-210000-wonder-extend-configure-integration-test/report.md",
        ".wonder/runs/20260618-210000-wonder-extend-configure-integration-test/request.md",
        ".wonder/runs/20260618-210000-wonder-extend-configure-integration-test/run.json",
      ]);

      const changes = integrationChangesSchema.parse(
        JSON.parse(await readFile(join(projectRoot, ".wonder/runs", runId, "integration-changes.json"), "utf8")),
      );
      const artifacts = configureIntegrationArtifactsSchema.parse(
        JSON.parse(await readFile(join(projectRoot, ".wonder/runs", runId, "artifacts.json"), "utf8")),
      );

      assert.deepEqual(changes, { added: [], updated: [], disabled: [], removed: [] });
      assert.deepEqual(artifacts, { updatedPaths: [] });
      assert.equal(existsSync(join(projectRoot, ".wonder", "extend", "capabilities.json")), false);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
