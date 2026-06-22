import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildRuntimeToolDefinitions } from "./tools.ts";

/**
 * `wonder-runtime` MCP server (docs/deterministic-runtime.md section 2). Registers
 * one tool per runtime operation, each delegating to the shared operation
 * registry, so this surface is equivalent to the repository CLI.
 *
 * This module only builds the server; transport wiring lives in cli.ts so the
 * server can be driven by an in-memory transport in tests.
 */
export function createRuntimeMcpServer(): McpServer {
  const server = new McpServer({ name: "wonder-runtime", version: "0.1.0" });

  for (const tool of buildRuntimeToolDefinitions()) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputShape },
      async (args: unknown) => tool.call(args),
    );
  }

  return server;
}
