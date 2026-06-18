import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

describe("pre-commit hook", () => {
  it("runs generation, validation, and drift without staging files", async () => {
    const hook = await readFile(join(root, ".githooks", "pre-commit"), "utf8");

    assert.match(hook, /npm run generate/);
    assert.match(hook, /npm run validate/);
    assert.match(hook, /npm run drift/);
    assert.doesNotMatch(hook, /git add/);
  });
});
