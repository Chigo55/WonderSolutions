import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  RuntimeAbortError,
  emptyRuntimePaths,
  mergeRuntimePaths,
  runRuntimeOperation,
  runtimeError,
  runtimeFail,
  runtimeOk,
} from "../tools/shared/runtime/result.ts";

describe("runtime result paths", () => {
  it("produces an empty disposition record", () => {
    assert.deepEqual(emptyRuntimePaths(), { created: [], existing: [], updated: [], skipped: [] });
  });

  it("merges disposition records in order", () => {
    const merged = mergeRuntimePaths(
      { created: ["a"], existing: [], updated: [], skipped: [] },
      { created: ["b"], existing: ["c"], updated: [], skipped: ["d"] },
    );
    assert.deepEqual(merged, {
      created: ["a", "b"],
      existing: ["c"],
      updated: [],
      skipped: ["d"],
    });
  });
});

describe("runtime error construction", () => {
  it("omits optional fields when not provided", () => {
    assert.deepEqual(runtimeError("code-x", "boom"), { code: "code-x", message: "boom" });
  });

  it("includes path and hint when provided", () => {
    assert.deepEqual(runtimeError("code-x", "boom", { path: ".wonder/state.json", hint: "repair it" }), {
      code: "code-x",
      message: "boom",
      path: ".wonder/state.json",
      hint: "repair it",
    });
  });
});

describe("runtime result envelopes", () => {
  it("builds a success with defaults", () => {
    const result = runtimeOk({ value: 1 });
    assert.equal(result.ok, true);
    assert.deepEqual(result.data, { value: 1 });
    assert.deepEqual(result.paths, emptyRuntimePaths());
    assert.deepEqual(result.warnings, []);
  });

  it("carries explicit paths and warnings", () => {
    const paths = { created: ["x"], existing: [], updated: [], skipped: [] };
    const result = runtimeOk(null, { paths, warnings: ["heads up"] });
    assert.deepEqual(result.paths, paths);
    assert.deepEqual(result.warnings, ["heads up"]);
  });

  it("builds a failure", () => {
    const result = runtimeFail(runtimeError("bad", "nope"));
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.error.code, "bad");
  });
});

describe("runRuntimeOperation", () => {
  it("passes successful results through", async () => {
    const result = await runRuntimeOperation(async () => runtimeOk("done"));
    assert.equal(result.ok && result.data, "done");
  });

  it("converts a RuntimeAbortError into a failure", async () => {
    const result = await runRuntimeOperation(async () => {
      throw new RuntimeAbortError(runtimeError("runtime-invalid-json", "broken", { path: "p", hint: "h" }));
    });
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.error.code, "runtime-invalid-json");
    assert.equal(result.ok === false && result.error.path, "p");
  });

  it("rethrows non-abort errors", async () => {
    await assert.rejects(
      runRuntimeOperation(async () => {
        throw new Error("unexpected bug");
      }),
      /unexpected bug/,
    );
  });
});
