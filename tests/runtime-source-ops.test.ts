import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RuntimeAbortError } from "../tools/shared/runtime/result.ts";
import {
  getCapabilitySpec,
  listCapabilities,
  listPackages,
  loadCapabilityRegistrations,
} from "../tools/shared/runtime/source-ops.ts";

const sourceRoot = process.cwd();

describe("source operations", () => {
  it("lists the canonical packages", async () => {
    const packages = await listPackages(sourceRoot);
    assert.deepEqual(
      packages.map((entry) => entry.id).sort(),
      ["wonder-build", "wonder-extend", "wonder-govern", "wonder-reuse"],
    );
    const build = packages.find((entry) => entry.id === "wonder-build");
    assert.equal(build?.userJob, "Build");
  });

  it("lists capabilities for one package in manifest order", async () => {
    const capabilities = await listCapabilities(sourceRoot, "wonder-build");
    assert.deepEqual(
      capabilities.map((entry) => entry.id),
      ["init", "create", "modify", "review"],
    );
    assert.equal(capabilities.every((entry) => entry.packageId === "wonder-build"), true);
  });

  it("returns a capability spec with instruction and spec text", async () => {
    const spec = await getCapabilitySpec(sourceRoot, "wonder-build", "create");
    assert.equal(spec.kind, "workflow");
    assert.ok(spec.instruction.length > 0);
    assert.ok(spec.spec.length > 0);
  });

  it("aborts on an unknown capability", async () => {
    await assert.rejects(getCapabilitySpec(sourceRoot, "wonder-build", "nope"), (error: unknown) => {
      assert.ok(error instanceof RuntimeAbortError);
      assert.equal(error.detail.code, "runtime-unknown-capability");
      return true;
    });
  });

  it("derives capability registrations with kinds", async () => {
    const registrations = await loadCapabilityRegistrations(sourceRoot, "wonder-govern");
    assert.deepEqual(
      registrations.map((entry) => entry.id),
      ["init", "define-standards", "check-policy"],
    );
    assert.equal(registrations.find((entry) => entry.id === "init")?.kind, "operation");
  });
});
