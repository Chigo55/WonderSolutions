import { runCli } from "./dispatch.ts";

/**
 * `wonder-runtime` CLI entry. Usage:
 *
 *   tsx tools/runtime/cli.ts <operation> --json '<input-json>'
 *   tsx tools/runtime/cli.ts list
 *
 * Prints a RuntimeResult (or the operation list) as JSON and exits non-zero on
 * failure.
 */
const outcome = await runCli(process.argv.slice(2));
process.stdout.write(`${outcome.output}\n`);
process.exitCode = outcome.exitCode;
