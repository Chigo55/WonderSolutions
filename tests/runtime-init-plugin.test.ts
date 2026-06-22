import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { RuntimeAbortError } from "../tools/shared/runtime/result.ts";
import { initPlugin } from "../tools/shared/runtime/init-plugin.ts";

const repoRoot = process.cwd();
const generatedAt = "2026-06-22T00:00:00.000Z";

async function withTempRoot(body: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "runtime-init-plugin-"));
  try {
    await body(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("initPlugin", () => {
  it("seeds build init files and creates state on first init", async () => {
    await withTempRoot(async (root) => {
      const result = await initPlugin({
        projectRoot: root,
        packageId: "wonder-build",
        platform: "claude",
        capabilities: [
          { id: "init", kind: "operation" },
          { id: "create", kind: "workflow" },
        ],
        generatedAt,
      });

      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.ok(result.paths.created.includes(".wonder/state.json"));
      assert.ok(result.paths.created.includes(".wonder/config/build.json"));
      assert.equal(result.data.state.plugins["wonder-build"]?.platforms.claude.initialized, true);
      assert.equal(existsSync(join(root, ".wonder/config/build.json")), true);
    });
  });

  it("merges a second package and reports state as updated, preserving prior sections", async () => {
    await withTempRoot(async (root) => {
      await initPlugin({
        projectRoot: root,
        packageId: "wonder-build",
        platform: "claude",
        capabilities: [{ id: "init", kind: "operation" }],
        generatedAt,
      });

      const result = await initPlugin({
        projectRoot: root,
        packageId: "wonder-reuse",
        platform: "claude",
        capabilities: [{ id: "init", kind: "operation" }],
        generatedAt,
      });

      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.ok(result.paths.updated.includes(".wonder/state.json"));
      assert.ok(result.data.state.plugins["wonder-build"], "prior plugin section preserved");
      assert.ok(result.data.state.plugins["wonder-reuse"]);

      const onDisk = JSON.parse(await readFile(join(root, ".wonder/state.json"), "utf8"));
      assert.ok(onDisk.plugins["wonder-build"]);
      assert.ok(onDisk.plugins["wonder-reuse"]);
    });
  });

  it("fails wonder-extend init without a catalog root", async () => {
    await withTempRoot(async (root) => {
      const result = await initPlugin({
        projectRoot: root,
        packageId: "wonder-extend",
        platform: "claude",
        capabilities: [{ id: "init", kind: "operation" }],
        generatedAt,
      });

      assert.equal(result.ok, false);
      assert.equal(result.ok === false && result.error.code, "runtime-missing-catalog");
    });
  });

  it("seeds wonder-extend init with the bundled catalog", async () => {
    await withTempRoot(async (root) => {
      const result = await initPlugin({
        projectRoot: root,
        packageId: "wonder-extend",
        platform: "claude",
        capabilities: [{ id: "init", kind: "operation" }],
        generatedAt,
        catalogRoot: join(repoRoot, "packages/wonder-extend/catalog"),
      });

      assert.equal(result.ok, true);
      assert.equal(existsSync(join(root, ".wonder/extend/companions.json")), true);
      const capabilities = JSON.parse(await readFile(join(root, ".wonder/extend/capabilities.json"), "utf8"));
      assert.equal(capabilities.generatedAt, generatedAt);
    });
  });
});
