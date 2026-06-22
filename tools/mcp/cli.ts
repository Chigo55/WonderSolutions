import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRuntimeMcpServer } from "./server.ts";

/**
 * `wonder-runtime` MCP stdio entry. Run with: tsx tools/mcp/cli.ts
 */
const server = createRuntimeMcpServer();
await server.connect(new StdioServerTransport());
