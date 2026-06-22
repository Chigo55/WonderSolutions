import type { z } from "zod";
import { executeOperation, listOperations } from "../shared/runtime/operations.ts";
import type { RuntimeResult } from "../shared/runtime/result.ts";

/**
 * MCP tool adapter (docs/deterministic-runtime.md section 2). Projects the runtime
 * operation registry into MCP tool definitions. Kept free of the MCP SDK so it is
 * unit-testable without a transport; server.ts does the SDK wiring.
 *
 * Each tool calls the same {@link executeOperation} the CLI uses, so the two public
 * surfaces are equivalent by construction.
 */

export interface McpTextResult {
  content: Array<{ type: "text"; text: string }>;
  isError: boolean;
  // CallToolResult carries an open index signature; mirror it so this is assignable.
  [key: string]: unknown;
}

export function toMcpResult(result: RuntimeResult<unknown>): McpTextResult {
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    isError: !result.ok,
  };
}

export interface RuntimeToolDefinition {
  name: string;
  description: string;
  inputShape: z.ZodRawShape;
  call: (args: unknown) => Promise<McpTextResult>;
}

export function buildRuntimeToolDefinitions(): RuntimeToolDefinition[] {
  return listOperations().map((operation) => ({
    name: operation.name,
    description: operation.description,
    inputShape: (operation.inputSchema as z.ZodObject<z.ZodRawShape>).shape,
    call: async (args: unknown) => toMcpResult(await executeOperation(operation.name, args)),
  }));
}
