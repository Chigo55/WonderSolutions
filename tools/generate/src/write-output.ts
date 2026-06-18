import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { ComputedGeneratedFile, WriteOptions, WriteReport } from "./types.ts";

function assertNoDuplicatePaths(files: readonly ComputedGeneratedFile[]): void {
  const seen = new Set<string>();
  for (const file of files) {
    if (seen.has(file.path)) {
      throw new Error(`generated output collision: ${file.path}`);
    }
    seen.add(file.path);
  }
}

export async function writeOutputs(
  root: string,
  files: readonly ComputedGeneratedFile[],
  options: WriteOptions,
): Promise<WriteReport> {
  assertNoDuplicatePaths(files);
  const report: WriteReport = {
    written: [],
    skipped: [],
  };

  for (const file of files) {
    if (options.dryRun) {
      report.skipped.push(file.path);
      continue;
    }

    const absolutePath = join(root, file.path);
    const targetDirectory = dirname(absolutePath);
    await mkdir(targetDirectory, { recursive: true });
    const tempPath = join(targetDirectory, `.tmp-${process.pid}-${randomUUID()}`);

    try {
      await writeFile(tempPath, file.content, "utf8");
      await rename(tempPath, absolutePath);
      report.written.push(file.path);
    } catch (error) {
      await rm(tempPath, { force: true });
      throw error;
    }
  }

  return report;
}
