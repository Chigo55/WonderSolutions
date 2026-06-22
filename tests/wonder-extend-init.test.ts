import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  validateCapabilityManifestForDirectory,
  validateInstructionBody,
} from "../tools/shared/schema/capability.ts";
import { validatePackageManifestForDirectory } from "../tools/shared/schema/package.ts";
import {
  extendCapabilitiesSnapshotSchema,
  extendCompanionsSnapshotSchema,
  extendIntegrationsSnapshotSchema,
} from "../tools/shared/schema/extend.ts";
import { initPluginState } from "../tools/shared/runtime/init-plugin-state.ts";
import {
  DEFAULT_EXTEND_CONFIG,
  ensureExtendInitFiles,
  hasSecretLikeValue,
} from "../tools/shared/runtime/extend-init.ts";

const root = process.cwd();
const generatedAt = "2026-06-22T00:00:00.000Z";

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(root, path), "utf8"));
}

describe("wonder-extend package source", () => {
  it("defines the canonical wonder-extend package manifest", async () => {
    const manifest = validatePackageManifestForDirectory(
      await readJson("packages/wonder-extend/manifest.json"),
      "wonder-extend",
      ["init", "discover-companions", "configure-integration", "detect-capabilities"],
    );

    assert.deepEqual(manifest, {
      schemaVersion: 1,
      id: "wonder-extend",
      displayName: "Wonder Extend",
      version: "0.2.0",
      userJob: "Extend",
      description: "Discover companion tools and external capabilities.",
      capabilityOrder: ["init", "discover-companions", "configure-integration", "detect-capabilities"],
    });
  });

  it("defines wonder-extend.init metadata and platform-neutral instruction", async () => {
    const manifest = validateCapabilityManifestForDirectory(
      await readJson("packages/wonder-extend/capabilities/init/capability.json"),
      "init",
    );
    const instruction = validateInstructionBody(
      await readFile(join(root, "packages/wonder-extend/capabilities/init/instruction.md"), "utf8"),
    );

    assert.deepEqual(manifest, {
      schemaVersion: 1,
      id: "init",
      title: "Initialize Extend",
      kind: "operation",
      description: "Prepare project-local runtime state for Wonder Extend capabilities.",
      requires: ["read", "write", "manage-state", "report"],
    });
    assert.match(instruction, /scope[\s\S]*prepare[\s\S]*seed[\s\S]*register[\s\S]*report/);
    assert.match(instruction, /companions\.json/);
    assert.match(instruction, /integrations\.json/);
    assert.match(instruction, /capabilities\.json/);
    assert.match(instruction, /Do not create `?\.wonder\/reports\/extend-latest\.json`?/i);
  });
});

describe("wonder-extend init runtime files", () => {
  it("creates inactive snapshots from product catalogs and preserves existing runtime choices", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "wonder-extend-init-"));
    const catalogRoot = join(projectRoot, "packages", "wonder-extend", "catalog");

    try {
      await mkdir(catalogRoot, { recursive: true });
      await writeFile(
        join(catalogRoot, "companions.json"),
        JSON.stringify({
          schemaVersion: 1,
          companions: [
            {
              id: "local-helper",
              displayName: "Local Helper",
              sourceType: "companion",
              purpose: "Strengthen local coding workflows.",
              platforms: ["codex"],
            },
          ],
        }),
        "utf8",
      );
      await writeFile(
        join(catalogRoot, "integrations.json"),
        JSON.stringify({ schemaVersion: 1, integrations: [{ id: "local-api", displayName: "Local API" }] }),
        "utf8",
      );
      await mkdir(join(projectRoot, ".wonder", "extend"), { recursive: true });
      await writeFile(
        join(projectRoot, ".wonder", "extend", "integrations.json"),
        JSON.stringify({
          schemaVersion: 1,
          integrations: {
            existing: {
              enabled: true,
              metadata: { provider: "existing" },
            },
          },
        }),
        "utf8",
      );

      const result = await ensureExtendInitFiles(projectRoot, catalogRoot, generatedAt);

      assert.deepEqual(DEFAULT_EXTEND_CONFIG, {
        schemaVersion: 1,
        allowRemoteChecksByDefault: false,
      });
      const companions = extendCompanionsSnapshotSchema.parse(
        JSON.parse(await readFile(join(projectRoot, ".wonder", "extend", "companions.json"), "utf8")),
      );
      const integrations = extendIntegrationsSnapshotSchema.parse(
        JSON.parse(await readFile(join(projectRoot, ".wonder", "extend", "integrations.json"), "utf8")),
      );
      const capabilities = extendCapabilitiesSnapshotSchema.parse(
        JSON.parse(await readFile(join(projectRoot, ".wonder", "extend", "capabilities.json"), "utf8")),
      );

      assert.deepEqual(companions.companions, [
        { id: "local-helper", enabled: false, source: "catalog" },
      ]);
      assert.deepEqual(integrations.integrations, {
        existing: {
          enabled: true,
          metadata: { provider: "existing" },
        },
      });
      assert.deepEqual(capabilities.capabilities, {});
      assert.equal(capabilities.generatedAt, generatedAt);
      assert.equal(existsSync(join(projectRoot, ".wonder", "reports", "extend-latest.json")), false);
      assert.ok(result.createdPaths.includes(".wonder/config/extend.json"));
      assert.ok(result.existingPaths.includes(".wonder/extend/integrations.json"));
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it("rejects secret-like catalog values before snapshot creation", () => {
    assert.equal(hasSecretLikeValue({ token: "abc123" }), true);
    assert.equal(hasSecretLikeValue({ displayName: "Local Helper" }), false);
  });
});

describe("wonder-extend init state merge", () => {
  it("registers extend capability surfaces and only marks the current platform initialized", () => {
    const state = initPluginState({
      state: { schemaVersion: 1, plugins: {} },
      packageId: "wonder-extend",
      platform: "codex",
      capabilities: [
        { id: "init", kind: "operation" },
        { id: "discover-companions", kind: "workflow" },
        { id: "configure-integration", kind: "workflow" },
        { id: "detect-capabilities", kind: "workflow" },
      ],
    });

    assert.deepEqual(state.plugins["wonder-extend"]?.capabilities["detect-capabilities"]?.surfaces, {
      claude: "/wonder-extend:detect-capabilities",
      codex: "$wonder-extend-detect-capabilities",
      antigravity: "wonder-extend.detect-capabilities",
    });
    assert.equal(state.plugins["wonder-extend"]?.platforms.claude.initialized, false);
    assert.equal(state.plugins["wonder-extend"]?.platforms.codex.initialized, true);
    assert.equal(state.plugins["wonder-extend"]?.platforms.antigravity.initialized, false);
  });
});
