import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { computeOutputs } from "../tools/generate/src/compute-output.ts";
import { loadSource } from "../tools/generate/src/load-source.ts";
import { writeOutputs } from "../tools/generate/src/write-output.ts";
import { validateGeneratedFiles } from "../tools/validate/src/validate-generated.ts";
import { validateRuntime } from "../tools/validate/src/validate-runtime.ts";
import { validateSource } from "../tools/validate/src/validate-source.ts";

const root = process.cwd();

describe("source validator", () => {
  it("accepts the canonical package, adapter, and catalog source graph", async () => {
    const issues = await validateSource(root);

    assert.deepEqual(issues, []);
  });
});

describe("generated validator", () => {
  it("accepts generated files that match computed source output", async () => {
    const graph = await loadSource(root);
    const outputs = computeOutputs(graph, ["codex"]).slice(0, 5);
    const projectRoot = await mkdtemp(join(tmpdir(), "wonder-validate-generated-"));

    try {
      await writeOutputs(projectRoot, outputs, { dryRun: false });

      const issues = await validateGeneratedFiles(projectRoot, outputs);

      assert.deepEqual(issues, []);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it("reports missing or modified generated output without rewriting it", async () => {
    const graph = await loadSource(root);
    const outputs = computeOutputs(graph, ["codex"]).slice(0, 2);
    const projectRoot = await mkdtemp(join(tmpdir(), "wonder-validate-drift-"));

    try {
      await writeOutputs(projectRoot, outputs, { dryRun: false });
      await writeFile(join(projectRoot, outputs[0]?.path ?? ""), "{}\n", "utf8");
      await rm(join(projectRoot, outputs[1]?.path ?? ""), { force: true });

      const issues = await validateGeneratedFiles(projectRoot, outputs);

      assert.deepEqual(
        issues.map((issue) => issue.code),
        ["generated-drift", "generated-missing"],
      );
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});

describe("runtime validator", () => {
  it("validates runtime files when present and reports repair hints", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "wonder-validate-runtime-"));

    try {
      await mkdir(join(projectRoot, ".wonder"), { recursive: true });
      await writeFile(join(projectRoot, ".wonder", "state.json"), "{\"schemaVersion\":1,\"plugins\":[]}\n", "utf8");

      const issues = await validateRuntime(projectRoot);

      assert.equal(issues[0]?.code, "runtime-invalid");
      assert.equal(issues[0]?.path, ".wonder/state.json");
      assert.match(issues[0]?.hint ?? "", /repair/i);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it("passes when optional runtime state is absent", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "wonder-validate-runtime-empty-"));

    try {
      assert.deepEqual(await validateRuntime(projectRoot), []);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
