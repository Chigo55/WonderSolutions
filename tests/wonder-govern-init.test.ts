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
  DEFAULT_GOVERN_CONFIG,
  GOVERN_STARTER_STANDARDS,
  ensureGovernInitFiles,
  isKebabMarkdownName,
} from "../tools/shared/runtime/govern-init.ts";
import { initPluginState } from "../tools/shared/runtime/init-plugin-state.ts";

const root = process.cwd();

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(root, path), "utf8"));
}

describe("wonder-govern package source", () => {
  it("defines the canonical wonder-govern package manifest", async () => {
    const manifest = validatePackageManifestForDirectory(
      await readJson("packages/wonder-govern/manifest.json"),
      "wonder-govern",
      ["init", "define-standards", "check-policy"],
    );

    assert.deepEqual(manifest, {
      schemaVersion: 1,
      id: "wonder-govern",
      displayName: "Wonder Govern",
      version: "0.1.0",
      userJob: "Govern",
      description: "Manage project standards and policy checks.",
      capabilityOrder: ["init", "define-standards", "check-policy"],
    });
  });

  it("defines wonder-govern.init metadata and platform-neutral instruction", async () => {
    const manifest = validateCapabilityManifestForDirectory(
      await readJson("packages/wonder-govern/capabilities/init/capability.json"),
      "init",
    );
    const instruction = validateInstructionBody(
      await readFile(join(root, "packages/wonder-govern/capabilities/init/instruction.md"), "utf8"),
    );

    assert.deepEqual(manifest, {
      schemaVersion: 1,
      id: "init",
      title: "Initialize Govern",
      kind: "operation",
      description: "Prepare project-local runtime state for Wonder Govern capabilities.",
      requires: ["read", "write", "manage-state", "report"],
    });
    assert.match(instruction, /scope[\s\S]*prepare[\s\S]*register[\s\S]*report/);
    assert.match(instruction, /\.wonder\/config\/govern\.json/);
    assert.match(instruction, /\.wonder\/standards\/coding\.md/);
    assert.match(instruction, /must not overwrite existing user content/i);
    assert.match(instruction, /Do not create `?\.wonder\/reports\/govern-latest\.json`?/i);
  });
});

describe("wonder-govern init runtime files", () => {
  it("defines conservative config and kebab-case starter standards", () => {
    assert.deepEqual(DEFAULT_GOVERN_CONFIG, {
      schemaVersion: 1,
      autoRunPolicyCheckAfterStandardsChange: false,
    });
    assert.deepEqual(
      GOVERN_STARTER_STANDARDS.map((standard) => standard.path),
      [
        ".wonder/standards/coding.md",
        ".wonder/standards/architecture.md",
        ".wonder/standards/security.md",
        ".wonder/standards/docs.md",
      ],
    );
    assert.equal(GOVERN_STARTER_STANDARDS.every((standard) => isKebabMarkdownName(standard.fileName)), true);
  });

  it("creates missing govern files and preserves existing starter standards", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "wonder-govern-init-"));

    try {
      await mkdir(join(projectRoot, ".wonder", "standards"), { recursive: true });
      await writeFile(join(projectRoot, ".wonder", "standards", "coding.md"), "custom coding\n", "utf8");

      const result = await ensureGovernInitFiles(projectRoot);

      assert.equal(
        await readFile(join(projectRoot, ".wonder", "standards", "coding.md"), "utf8"),
        "custom coding\n",
      );
      assert.equal(
        JSON.parse(await readFile(join(projectRoot, ".wonder", "config", "govern.json"), "utf8"))
          .autoRunPolicyCheckAfterStandardsChange,
        false,
      );
      assert.equal(existsSync(join(projectRoot, ".wonder", "reports", "govern-latest.json")), false);
      assert.ok(result.createdPaths.includes(".wonder/config/govern.json"));
      assert.ok(result.existingPaths.includes(".wonder/standards/coding.md"));
      assert.ok(result.createdPaths.includes(".wonder/standards/security.md"));
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});

describe("wonder-govern init state merge", () => {
  it("registers govern capability surfaces and only marks the current platform initialized", () => {
    const state = initPluginState({
      state: { schemaVersion: 1, plugins: {} },
      packageId: "wonder-govern",
      platform: "antigravity",
      capabilities: [
        { id: "init", kind: "operation" },
        { id: "define-standards", kind: "workflow" },
        { id: "check-policy", kind: "workflow" },
      ],
    });

    assert.deepEqual(state.plugins["wonder-govern"]?.capabilities["define-standards"]?.surfaces, {
      claude: "/wonder-govern:define-standards",
      codex: "$wonder-govern-define-standards",
      antigravity: "wonder-govern.define-standards",
    });
    assert.equal(state.plugins["wonder-govern"]?.platforms.claude.initialized, false);
    assert.equal(state.plugins["wonder-govern"]?.platforms.codex.initialized, false);
    assert.equal(state.plugins["wonder-govern"]?.platforms.antigravity.initialized, true);
  });
});
