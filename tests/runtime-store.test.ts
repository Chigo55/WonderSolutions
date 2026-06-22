import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { RuntimeAbortError } from "../tools/shared/runtime/result.ts";
import { writeJsonFile } from "../tools/shared/runtime/io/json.ts";
import { readStateFile, writeStateFile } from "../tools/shared/runtime/state-store.ts";
import {
  readLatestReport,
  readRunRecord,
  updateRunRecord,
  writeLatestReport,
} from "../tools/shared/runtime/run-store.ts";
import { refreshReuseIndex } from "../tools/shared/runtime/reuse-index.ts";
import { initPluginState } from "../tools/shared/runtime/init-plugin-state.ts";
import { ensureReuseInitFiles } from "../tools/shared/runtime/reuse-init.ts";
import { createBuildRunScaffold } from "../tools/shared/runtime/build-run.ts";
import { buildLatestReportForCompletion } from "../tools/shared/schema/run.ts";

async function withTempRoot(prefix: string, body: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  try {
    await body(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("state store", () => {
  it("returns undefined when state is absent", async () => {
    await withTempRoot("runtime-state-", async (root) => {
      assert.equal(await readStateFile(root), undefined);
    });
  });

  it("round-trips a valid state", async () => {
    await withTempRoot("runtime-state-", async (root) => {
      const state = initPluginState({
        packageId: "wonder-build",
        platform: "claude",
        capabilities: [{ id: "init", kind: "operation" }],
      });
      await writeStateFile(root, state);
      assert.deepEqual(await readStateFile(root), state);
    });
  });

  it("aborts on schema-invalid state and tolerates it in repair mode", async () => {
    await withTempRoot("runtime-state-", async (root) => {
      await writeJsonFile(join(root, ".wonder/state.json"), { schemaVersion: 2 });
      await assert.rejects(readStateFile(root), (error: unknown) => {
        assert.ok(error instanceof RuntimeAbortError);
        assert.equal(error.detail.code, "runtime-invalid-state");
        return true;
      });
      assert.equal(await readStateFile(root, { repair: true }), undefined);
    });
  });
});

describe("run record store", () => {
  it("applies a typed update to an existing record", async () => {
    await withTempRoot("runtime-run-", async (root) => {
      const runId = "20260622-000000-wonder-build-create";
      await createBuildRunScaffold({
        projectRoot: root,
        runId,
        capabilityId: "create",
        platform: "claude",
        userRequest: "x",
        startedAt: "2026-06-22T00:00:00.000Z",
      });

      const updated = await updateRunRecord(root, runId, {
        status: "succeeded",
        finishedAt: "2026-06-22T00:05:00.000Z",
        outputs: { artifactCount: 2 },
      });

      assert.equal(updated.status, "succeeded");
      const reread = await readRunRecord(root, runId);
      assert.equal(reread?.finishedAt, "2026-06-22T00:05:00.000Z");
      assert.deepEqual(reread?.outputs, { artifactCount: 2 });
    });
  });

  it("aborts when updating a run with no record", async () => {
    await withTempRoot("runtime-run-", async (root) => {
      await assert.rejects(updateRunRecord(root, "missing-run", { status: "failed" }), (error: unknown) => {
        assert.ok(error instanceof RuntimeAbortError);
        assert.equal(error.detail.code, "runtime-missing-run");
        return true;
      });
    });
  });
});

describe("latest report store", () => {
  it("round-trips a build latest report and reports absence per kind", async () => {
    await withTempRoot("runtime-report-", async (root) => {
      const report = buildLatestReportForCompletion({
        runId: "20260622-000000-wonder-build-create",
        capabilityId: "create",
        summary: "done",
        finishedAt: "2026-06-22T00:05:00.000Z",
      });
      await writeLatestReport(root, "build", report);
      assert.deepEqual(await readLatestReport(root, "build"), report);
      assert.equal(await readLatestReport(root, "govern"), undefined);
    });
  });
});

describe("reuse index refresh", () => {
  it("regenerates a sorted index from asset directories", async () => {
    await withTempRoot("runtime-reuse-", async (root) => {
      await ensureReuseInitFiles(root, "2026-06-22T00:00:00.000Z");
      const refreshed = await refreshReuseIndex(root, "2026-06-22T01:00:00.000Z");

      assert.equal(refreshed.index.generatedAt, "2026-06-22T01:00:00.000Z");
      assert.deepEqual(
        refreshed.index.assets.map((asset) => `${asset.kind}:${asset.id}`),
        ["request:basic-task", "template:basic-report"],
      );
    });
  });

  it("skips malformed asset directories instead of failing", async () => {
    await withTempRoot("runtime-reuse-", async (root) => {
      await ensureReuseInitFiles(root, "2026-06-22T00:00:00.000Z");
      const brokenDir = join(root, ".wonder", "reuse", "snippets", "broken");
      await mkdir(brokenDir, { recursive: true });
      await writeFile(join(brokenDir, "asset.json"), "{ not json", "utf8");
      await writeFile(join(brokenDir, "body.md"), "x\n", "utf8");

      const refreshed = await refreshReuseIndex(root, "2026-06-22T02:00:00.000Z");
      assert.ok(refreshed.skippedInvalidAssets.includes(".wonder/reuse/snippets/broken"));
      assert.equal(
        refreshed.index.assets.some((asset) => asset.id === "broken"),
        false,
      );
    });
  });
});
