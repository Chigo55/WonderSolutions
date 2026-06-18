import { PLATFORMS, platformIdSchema, type PlatformId } from "../shared/platform/names.ts";
import { loadSource } from "./src/load-source.ts";
import { computeOutputs } from "./src/compute-output.ts";
import { writeOutputs } from "./src/write-output.ts";

function parseArgs(args: readonly string[]): { platforms: PlatformId[]; dryRun: boolean } {
  let platforms: PlatformId[] = [...PLATFORMS];
  let dryRun = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--platform") {
      const value = args[index + 1];
      if (!value) throw new Error("--platform requires a value");
      platforms = value === "all" ? [...PLATFORMS] : [platformIdSchema.parse(value)];
      index += 1;
      continue;
    }

    throw new Error(`unknown generate argument: ${arg}`);
  }

  return { platforms, dryRun };
}

try {
  const options = parseArgs(process.argv.slice(2));
  const graph = await loadSource(process.cwd());
  const files = computeOutputs(graph, options.platforms);
  const report = await writeOutputs(process.cwd(), files, { dryRun: options.dryRun });
  console.log(
    JSON.stringify(
      {
        generated: files.length,
        written: report.written.length,
        skipped: report.skipped.length,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
