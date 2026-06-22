import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { runCli } from "../tools/runtime/dispatch.ts";
import { executeOperation } from "../tools/shared/runtime/operations.ts";

const repoRoot = process.cwd();

describe("runtime CLI", () => {
  it("lists operations with no arguments", async () => {
    const outcome = await runCli([]);
    assert.equal(outcome.exitCode, 0);
    const parsed = JSON.parse(outcome.output) as { operations: Array<{ name: string }> };
    assert.equal(parsed.operations.length, 16);
    assert.ok(parsed.operations.some((entry) => entry.name === "initPlugin"));
  });

  it("is equivalent to the facade for a read-only operation", async () => {
    const input = { sourceRoot: repoRoot };
    const viaCli = await runCli(["listPackages", "--json", JSON.stringify(input)]);
    const viaFacade = await executeOperation("listPackages", input);

    assert.equal(viaCli.exitCode, 0);
    assert.deepEqual(JSON.parse(viaCli.output), viaFacade);
  });

  it("reports an unknown operation with a non-zero exit code", async () => {
    const outcome = await runCli(["nope", "--json", "{}"]);
    assert.equal(outcome.exitCode, 1);
    const parsed = JSON.parse(outcome.output) as { ok: boolean; error: { code: string } };
    assert.equal(parsed.ok, false);
    assert.equal(parsed.error.code, "runtime-unknown-operation");
  });

  it("rejects malformed --json input", async () => {
    const outcome = await runCli(["listPackages", "--json", "{not json"]);
    assert.equal(outcome.exitCode, 1);
    assert.equal((JSON.parse(outcome.output) as { error: { code: string } }).error.code, "cli-invalid-json");
  });

  it("drives a project-local operation end to end", async () => {
    const root = await mkdtemp(join(tmpdir(), "runtime-cli-"));
    try {
      const outcome = await runCli([
        "initPlugin",
        "--json",
        JSON.stringify({
          projectRoot: root,
          packageId: "wonder-build",
          platform: "claude",
          generatedAt: "2026-06-22T00:00:00.000Z",
          sourceRoot: repoRoot,
        }),
      ]);
      assert.equal(outcome.exitCode, 0);
      assert.equal(existsSync(join(root, ".wonder/state.json")), true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
