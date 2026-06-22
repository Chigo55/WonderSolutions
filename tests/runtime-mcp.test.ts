import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildRuntimeToolDefinitions } from "../tools/mcp/tools.ts";
import { createRuntimeMcpServer } from "../tools/mcp/server.ts";
import { OPERATION_NAMES, executeOperation } from "../tools/shared/runtime/operations.ts";

const repoRoot = process.cwd();

function textOf(content: unknown): string {
  const items = content as Array<{ type: string; text: string }>;
  assert.equal(items[0]?.type, "text");
  return items[0]!.text;
}

describe("MCP tool adapter", () => {
  it("exposes one tool per registry operation", () => {
    const tools = buildRuntimeToolDefinitions();
    assert.deepEqual(
      tools.map((tool) => tool.name).sort(),
      [...OPERATION_NAMES].sort(),
    );
    for (const tool of tools) {
      assert.ok(tool.description.length > 0);
      assert.equal(typeof tool.inputShape, "object");
    }
  });

  it("a tool call equals the facade result", async () => {
    const tool = buildRuntimeToolDefinitions().find((entry) => entry.name === "listPackages");
    assert.ok(tool);
    const result = await tool.call({ sourceRoot: repoRoot });
    assert.equal(result.isError, false);
    const facade = await executeOperation("listPackages", { sourceRoot: repoRoot });
    assert.deepEqual(JSON.parse(textOf(result.content)), facade);
  });
});

describe("MCP server over in-memory transport", () => {
  it("lists tools and calls operations through the protocol", async () => {
    const server = createRuntimeMcpServer();
    const client = new Client({ name: "wonder-runtime-test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    try {
      const listed = await client.listTools();
      assert.equal(listed.tools.length, 16);
      assert.ok(listed.tools.some((tool) => tool.name === "initPlugin"));

      const ok = await client.callTool({ name: "listPackages", arguments: { sourceRoot: repoRoot } });
      assert.notEqual(ok.isError, true);
      const facade = await executeOperation("listPackages", { sourceRoot: repoRoot });
      assert.deepEqual(JSON.parse(textOf(ok.content)), facade);

      const bad = await client.callTool({
        name: "getCapabilitySpec",
        arguments: { sourceRoot: repoRoot, packageId: "wonder-build", capabilityId: "nope" },
      });
      assert.equal(bad.isError, true);
      const parsed = JSON.parse(textOf(bad.content)) as { ok: boolean; error: { code: string } };
      assert.equal(parsed.ok, false);
      assert.equal(parsed.error.code, "runtime-unknown-capability");
    } finally {
      await client.close();
      await server.close();
    }
  });
});
