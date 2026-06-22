import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { RuntimeAbortError } from "../tools/shared/runtime/result.ts";
import { pathExists } from "../tools/shared/runtime/io/fs-path.ts";
import { readJsonIfPresent, serializeJson, writeJsonFile } from "../tools/shared/runtime/io/json.ts";
import { normalizeMarkdown } from "../tools/shared/runtime/io/markdown.ts";

describe("runtime json io", () => {
  it("serializes with two-space indent and a trailing newline", () => {
    assert.equal(serializeJson({ b: 1, a: 2 }), '{\n  "b": 1,\n  "a": 2\n}\n');
  });

  it("writes JSON and creates missing parent directories", async () => {
    const root = await mkdtemp(join(tmpdir(), "runtime-io-"));
    try {
      const target = join(root, ".wonder", "nested", "value.json");
      await writeJsonFile(target, { ok: true });
      assert.equal(await readFile(target, "utf8"), '{\n  "ok": true\n}\n');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns undefined for a missing file", async () => {
    const root = await mkdtemp(join(tmpdir(), "runtime-io-"));
    try {
      assert.equal(await readJsonIfPresent(join(root, "missing.json"), "missing.json"), undefined);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("parses present valid JSON", async () => {
    const root = await mkdtemp(join(tmpdir(), "runtime-io-"));
    try {
      const target = join(root, "value.json");
      await writeJsonFile(target, { count: 3 });
      assert.deepEqual(await readJsonIfPresent(target, "value.json"), { count: 3 });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("aborts with a repair hint on malformed JSON", async () => {
    const root = await mkdtemp(join(tmpdir(), "runtime-io-"));
    try {
      const target = join(root, "broken.json");
      await writeFile(target, "{ not json", "utf8");

      await assert.rejects(
        readJsonIfPresent(target, ".wonder/broken.json"),
        (error: unknown) => {
          assert.ok(error instanceof RuntimeAbortError);
          assert.equal(error.detail.code, "runtime-invalid-json");
          assert.equal(error.detail.path, ".wonder/broken.json");
          assert.match(error.detail.hint ?? "", /repair/i);
          return true;
        },
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("treats malformed JSON as absent in repair mode", async () => {
    const root = await mkdtemp(join(tmpdir(), "runtime-io-"));
    try {
      const target = join(root, "broken.json");
      await writeFile(target, "{ not json", "utf8");
      assert.equal(await readJsonIfPresent(target, "broken.json", { repair: true }), undefined);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("path existence", () => {
  it("reports presence and absence", async () => {
    const root = await mkdtemp(join(tmpdir(), "runtime-io-"));
    try {
      const target = join(root, "value.json");
      assert.equal(await pathExists(target), false);
      await writeJsonFile(target, {});
      assert.equal(await pathExists(target), true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("markdown normalization", () => {
  it("preserves content byte-for-byte at the preserve-content level", () => {
    const input = "line one\r\nline two\r\n\r\n";
    assert.equal(normalizeMarkdown(input, "preserve-content"), input);
  });

  it("converts CRLF to LF and enforces a single trailing newline", () => {
    assert.equal(normalizeMarkdown("a\r\nb\r\n\r\n", "light-normalization"), "a\nb\n");
    assert.equal(normalizeMarkdown("a\nb", "strict-scaffold"), "a\nb\n");
  });

  it("keeps empty content empty", () => {
    assert.equal(normalizeMarkdown("", "strict-scaffold"), "");
    assert.equal(normalizeMarkdown("\r\n", "light-normalization"), "\n");
  });
});
