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
import { reuseIndexSchema } from "../tools/shared/schema/reuse.ts";
import { initPluginState } from "../tools/shared/runtime/init-plugin-state.ts";
import {
  DEFAULT_REUSE_CONFIG,
  REUSE_STARTER_ASSETS,
  ensureReuseInitFiles,
} from "../tools/shared/runtime/reuse-init.ts";

const root = process.cwd();

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(root, path), "utf8"));
}

describe("wonder-reuse package source", () => {
  it("defines the canonical wonder-reuse package manifest", async () => {
    const manifest = validatePackageManifestForDirectory(
      await readJson("packages/wonder-reuse/manifest.json"),
      "wonder-reuse",
      ["init", "manage-assets", "generate-output", "promote-asset"],
    );

    assert.deepEqual(manifest, {
      schemaVersion: 1,
      id: "wonder-reuse",
      displayName: "Wonder Reuse",
      version: "0.1.0",
      userJob: "Reuse",
      description: "Manage reusable assets and generated output.",
      capabilityOrder: ["init", "manage-assets", "generate-output", "promote-asset"],
    });
  });

  it("defines wonder-reuse.init metadata and platform-neutral instruction", async () => {
    const manifest = validateCapabilityManifestForDirectory(
      await readJson("packages/wonder-reuse/capabilities/init/capability.json"),
      "init",
    );
    const instruction = validateInstructionBody(
      await readFile(join(root, "packages/wonder-reuse/capabilities/init/instruction.md"), "utf8"),
    );

    assert.deepEqual(manifest, {
      schemaVersion: 1,
      id: "init",
      title: "Initialize Reuse",
      kind: "operation",
      description: "Prepare project-local runtime state for Wonder Reuse capabilities.",
      requires: ["read", "write", "manage-state", "report"],
    });
    assert.match(instruction, /scope[\s\S]*prepare[\s\S]*seed[\s\S]*index[\s\S]*register[\s\S]*report/);
    assert.match(instruction, /\.wonder\/config\/reuse\.json/);
    assert.match(instruction, /\.wonder\/reuse\/index\.json/);
    assert.match(instruction, /\.wonder\/reuse\/requests\/basic-task/);
    assert.match(instruction, /does not maintain a latest report/i);
  });
});

describe("wonder-reuse init runtime files", () => {
  it("defines conservative config and starter assets", () => {
    assert.deepEqual(DEFAULT_REUSE_CONFIG, {
      schemaVersion: 1,
      autoRefreshIndex: true,
    });
    assert.deepEqual(
      REUSE_STARTER_ASSETS.map((asset) => asset.path),
      [".wonder/reuse/requests/basic-task", ".wonder/reuse/templates/basic-report"],
    );
  });

  it("creates starter assets, refreshes index, and preserves existing content", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "wonder-reuse-init-"));

    try {
      const existingAssetDir = join(projectRoot, ".wonder", "reuse", "requests", "basic-task");
      await mkdir(existingAssetDir, { recursive: true });
      await writeFile(join(existingAssetDir, "body.md"), "custom request body\n", "utf8");

      const result = await ensureReuseInitFiles(projectRoot, "2026-06-18T08:00:00.000Z");

      assert.equal(await readFile(join(existingAssetDir, "body.md"), "utf8"), "custom request body\n");
      assert.equal(
        JSON.parse(await readFile(join(projectRoot, ".wonder", "config", "reuse.json"), "utf8"))
          .autoRefreshIndex,
        true,
      );
      const index = reuseIndexSchema.parse(
        JSON.parse(await readFile(join(projectRoot, ".wonder", "reuse", "index.json"), "utf8")),
      );
      assert.deepEqual(
        index.assets.map((asset) => `${asset.kind}:${asset.id}`).sort(),
        ["request:basic-task", "template:basic-report"],
      );
      assert.equal(index.generatedAt, "2026-06-18T08:00:00.000Z");
      assert.equal(existsSync(join(projectRoot, ".wonder", "reports", "reuse-latest.json")), false);
      assert.ok(result.existingPaths.includes(".wonder/reuse/requests/basic-task/body.md"));
      assert.ok(result.createdPaths.includes(".wonder/reuse/templates/basic-report/asset.json"));
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});

describe("wonder-reuse init state merge", () => {
  it("registers reuse capability surfaces and only marks the current platform initialized", () => {
    const state = initPluginState({
      state: { schemaVersion: 1, plugins: {} },
      packageId: "wonder-reuse",
      platform: "claude",
      capabilities: [
        { id: "init", kind: "operation" },
        { id: "manage-assets", kind: "workflow" },
        { id: "generate-output", kind: "workflow" },
        { id: "promote-asset", kind: "workflow" },
      ],
    });

    assert.deepEqual(state.plugins["wonder-reuse"]?.capabilities["generate-output"]?.surfaces, {
      claude: "/wonder-reuse:generate-output",
      codex: "$wonder-reuse-generate-output",
      antigravity: "wonder-reuse.generate-output",
    });
    assert.equal(state.plugins["wonder-reuse"]?.platforms.claude.initialized, true);
    assert.equal(state.plugins["wonder-reuse"]?.platforms.codex.initialized, false);
    assert.equal(state.plugins["wonder-reuse"]?.platforms.antigravity.initialized, false);
  });
});
