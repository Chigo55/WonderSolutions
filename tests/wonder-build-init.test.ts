import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  validateCapabilityManifestForDirectory,
  validateInstructionBody,
} from "../tools/shared/schema/capability.ts";
import { validatePackageManifestForDirectory } from "../tools/shared/schema/package.ts";
import type { WonderState } from "../tools/shared/schema/runtime.ts";
import { initPluginState } from "../tools/shared/runtime/init-plugin-state.ts";

const root = process.cwd();

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(root, path), "utf8"));
}

describe("wonder-build package source", () => {
  it("defines the canonical wonder-build package manifest", async () => {
    const manifest = validatePackageManifestForDirectory(
      await readJson("packages/wonder-build/manifest.json"),
      "wonder-build",
      ["init", "create", "modify", "review"],
    );

    assert.deepEqual(manifest, {
      schemaVersion: 1,
      id: "wonder-build",
      displayName: "Wonder Build",
      version: "0.1.0",
      userJob: "Build",
      description: "Structure task creation, modification, and review.",
      capabilityOrder: ["init", "create", "modify", "review"],
    });
  });

  it("defines wonder-build.init metadata and platform-neutral instruction", async () => {
    const manifest = validateCapabilityManifestForDirectory(
      await readJson("packages/wonder-build/capabilities/init/capability.json"),
      "init",
    );
    const instruction = validateInstructionBody(
      await readFile(join(root, "packages/wonder-build/capabilities/init/instruction.md"), "utf8"),
    );

    assert.deepEqual(manifest, {
      schemaVersion: 1,
      id: "init",
      title: "Initialize Build",
      kind: "operation",
      description: "Prepare project-local runtime state for Wonder Build capabilities.",
      requires: ["read", "write", "manage-state", "report"],
    });
    assert.match(instruction, /scope[\s\S]*prepare[\s\S]*register[\s\S]*report/);
    assert.match(instruction, /\.wonder\/config\/build\.json/);
    assert.match(instruction, /Do not create `?\.wonder\/reports\/build-latest\.json`?/i);
  });
});

describe("wonder-build init state merge", () => {
  const buildCapabilities = [
    { id: "init", kind: "operation" },
    { id: "create", kind: "workflow" },
    { id: "modify", kind: "workflow" },
    { id: "review", kind: "workflow" },
  ] as const;

  it("registers all build capability surfaces and marks only the current platform initialized", () => {
    const state = initPluginState({
      state: { schemaVersion: 1, plugins: {} },
      packageId: "wonder-build",
      platform: "codex",
      capabilities: buildCapabilities,
    });

    assert.equal(state.plugins["wonder-build"]?.initialized, true);
    const createCapability = state.plugins["wonder-build"]?.capabilities.create;
    assert.ok(createCapability);
    assert.deepEqual(createCapability.surfaces, {
      claude: "/wonder-build:create",
      codex: "$wonder-build-create",
      antigravity: "wonder-build.create",
    });
    assert.equal(state.plugins["wonder-build"]?.platforms.claude.initialized, false);
    assert.equal(state.plugins["wonder-build"]?.platforms.codex.initialized, true);
    assert.equal(state.plugins["wonder-build"]?.platforms.antigravity.initialized, false);
  });

  it("preserves other plugin sections and previous initialized platforms", () => {
    const existing: WonderState = {
      schemaVersion: 1,
      plugins: {
        "wonder-reuse": {
          initialized: true,
          capabilities: {},
          platforms: {
            claude: { initialized: true },
            codex: { initialized: false },
            antigravity: { initialized: false },
          },
        },
        "wonder-build": {
          initialized: true,
          capabilities: {},
          platforms: {
            claude: { initialized: true },
            codex: { initialized: false },
            antigravity: { initialized: false },
          },
        },
      },
    };

    const state = initPluginState({
      state: existing,
      packageId: "wonder-build",
      platform: "codex",
      capabilities: buildCapabilities,
    });

    assert.deepEqual(state.plugins["wonder-reuse"], existing.plugins["wonder-reuse"]);
    assert.equal(state.plugins["wonder-build"]?.platforms.claude.initialized, true);
    assert.equal(state.plugins["wonder-build"]?.platforms.codex.initialized, true);
    assert.equal(state.plugins["wonder-build"]?.platforms.antigravity.initialized, false);
  });
});
