import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathExists } from "./io/fs-path.ts";

/**
 * Build init file seeding (docs/deterministic-runtime.md section 6, wonder-build
 * `init`). Creates the project-local config when absent and preserves any existing
 * config. State registration is handled separately by initPlugin.
 */

export const DEFAULT_BUILD_CONFIG = {
  schemaVersion: 1,
} as const;

export interface EnsureBuildInitFilesResult {
  createdPaths: string[];
  existingPaths: string[];
}

async function ensureDirectory(
  projectRoot: string,
  relativePath: string,
  result: EnsureBuildInitFilesResult,
): Promise<void> {
  const absolutePath = join(projectRoot, relativePath);
  if (await pathExists(absolutePath)) {
    result.existingPaths.push(relativePath);
    return;
  }
  await mkdir(absolutePath, { recursive: true });
  result.createdPaths.push(relativePath);
}

async function writeIfAbsent(
  projectRoot: string,
  relativePath: string,
  content: string,
  result: EnsureBuildInitFilesResult,
): Promise<void> {
  const absolutePath = join(projectRoot, relativePath);
  if (await pathExists(absolutePath)) {
    result.existingPaths.push(relativePath);
    return;
  }
  await writeFile(absolutePath, content, "utf8");
  result.createdPaths.push(relativePath);
}

export async function ensureBuildInitFiles(projectRoot: string): Promise<EnsureBuildInitFilesResult> {
  const result: EnsureBuildInitFilesResult = { createdPaths: [], existingPaths: [] };

  await ensureDirectory(projectRoot, ".wonder", result);
  await ensureDirectory(projectRoot, ".wonder/config", result);
  await ensureDirectory(projectRoot, ".wonder/runs", result);

  await writeIfAbsent(
    projectRoot,
    ".wonder/config/build.json",
    `${JSON.stringify(DEFAULT_BUILD_CONFIG, null, 2)}\n`,
    result,
  );

  return result;
}
