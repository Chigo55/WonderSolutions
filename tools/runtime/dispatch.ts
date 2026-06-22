import { executeOperation, listOperations } from "../shared/runtime/operations.ts";

/**
 * Repository CLI dispatch (docs/deterministic-runtime.md section 2). This is the
 * public fallback invocation surface; it maps argv onto the same
 * {@link executeOperation} contract the MCP surface uses, so both stay equivalent.
 *
 * Separated from the entry script (cli.ts) so it can be unit-tested without
 * spawning a child process.
 */

export interface CliOutcome {
  exitCode: number;
  output: string;
}

function jsonLine(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export async function runCli(argv: readonly string[]): Promise<CliOutcome> {
  const operationName = argv[0];

  if (operationName === undefined || operationName === "list" || operationName === "--list") {
    return {
      exitCode: 0,
      output: jsonLine({
        operations: listOperations().map(({ name, description }) => ({ name, description })),
      }),
    };
  }

  let rawInput: unknown = {};
  const jsonIndex = argv.indexOf("--json");
  if (jsonIndex >= 0) {
    const value = argv[jsonIndex + 1];
    if (value === undefined) {
      return {
        exitCode: 1,
        output: jsonLine({ ok: false, error: { code: "cli-missing-json", message: "--json requires a value" } }),
      };
    }
    try {
      rawInput = JSON.parse(value);
    } catch (error) {
      return {
        exitCode: 1,
        output: jsonLine({
          ok: false,
          error: { code: "cli-invalid-json", message: error instanceof Error ? error.message : String(error) },
        }),
      };
    }
  }

  const result = await executeOperation(operationName, rawInput);
  return { exitCode: result.ok ? 0 : 1, output: jsonLine(result) };
}
