import { PLATFORMS, platformIdSchema, type PlatformId } from "../shared/platform/names.ts";
import { computeOutputs } from "../generate/src/compute-output.ts";
import { loadSource } from "../generate/src/load-source.ts";
import { validateGeneratedFiles } from "./src/validate-generated.ts";
import { validateRuntime } from "./src/validate-runtime.ts";
import { validateSource } from "./src/validate-source.ts";
import type { ValidationIssue } from "./src/types.ts";

interface ValidateCliOptions {
  source: boolean;
  generated: boolean;
  runtime: boolean;
  drift: boolean;
  platforms: PlatformId[];
}

function parseArgs(args: readonly string[]): ValidateCliOptions {
  const options: ValidateCliOptions = {
    source: false,
    generated: false,
    runtime: false,
    drift: false,
    platforms: [...PLATFORMS],
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--source") {
      options.source = true;
      continue;
    }
    if (arg === "--generated") {
      options.generated = true;
      continue;
    }
    if (arg === "--runtime") {
      options.runtime = true;
      continue;
    }
    if (arg === "--drift") {
      options.generated = true;
      options.drift = true;
      continue;
    }
    if (arg === "--platform") {
      const value = args[index + 1];
      if (!value) throw new Error("--platform requires a value");
      options.platforms = value === "all" ? [...PLATFORMS] : [platformIdSchema.parse(value)];
      index += 1;
      continue;
    }
    throw new Error(`unknown validate argument: ${arg}`);
  }

  if (!options.source && !options.generated && !options.runtime) {
    options.source = true;
    options.generated = true;
    options.runtime = true;
  }

  return options;
}

function printIssues(issues: readonly ValidationIssue[]): void {
  for (const issue of issues) {
    console.error(
      JSON.stringify(
        {
          code: issue.code,
          message: issue.message,
          path: issue.path,
          hint: issue.hint,
        },
        null,
        2,
      ),
    );
  }
}

try {
  const options = parseArgs(process.argv.slice(2));
  const issues: ValidationIssue[] = [];

  if (options.source) {
    issues.push(...(await validateSource(process.cwd())));
  }

  if (options.generated) {
    const graph = await loadSource(process.cwd());
    issues.push(...(await validateGeneratedFiles(process.cwd(), computeOutputs(graph, options.platforms))));
  }

  if (options.runtime) {
    issues.push(...(await validateRuntime(process.cwd())));
  }

  if (issues.length > 0) {
    printIssues(issues);
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ ok: true, drift: options.drift }, null, 2));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
