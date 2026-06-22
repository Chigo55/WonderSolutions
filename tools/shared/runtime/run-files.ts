import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathExists } from "./io/fs-path.ts";

export type RuntimeFileEntry = readonly [fileName: string, content: string];

export interface RunFileWriteReport {
  files: string[];
  createdPaths: string[];
  existingPaths: string[];
}

function runRelativePath(runId: string, fileName: string): string {
  return `.wonder/runs/${runId}/${fileName}`;
}

/**
 * Create run files without overwriting an existing run. Run scaffolds are
 * create-once records; callers update machine-managed JSON through typed update
 * operations after initial creation.
 */
export async function writeRunFilesIfAbsent(
  runDir: string,
  runId: string,
  files: readonly RuntimeFileEntry[],
): Promise<RunFileWriteReport> {
  await mkdir(runDir, { recursive: true });

  const allPaths: string[] = [];
  const createdPaths: string[] = [];
  const existingPaths: string[] = [];

  for (const [fileName, content] of files) {
    const relativePath = runRelativePath(runId, fileName);
    allPaths.push(relativePath);

    const absolutePath = join(runDir, fileName);
    if (await pathExists(absolutePath)) {
      existingPaths.push(relativePath);
      continue;
    }

    await writeFile(absolutePath, content, "utf8");
    createdPaths.push(relativePath);
  }

  return { files: allPaths, createdPaths, existingPaths };
}
