import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type ReuseAssetManifest } from "../schema/reuse.ts";
import { buildReuseIndexValue } from "./reuse-index.ts";

export const DEFAULT_REUSE_CONFIG = {
  schemaVersion: 1,
  autoRefreshIndex: true,
} as const;

export interface StarterReuseAsset {
  path: string;
  manifest: ReuseAssetManifest;
  body: string;
}

export const REUSE_STARTER_ASSETS: readonly StarterReuseAsset[] = [
  {
    path: ".wonder/reuse/requests/basic-task",
    manifest: {
      schemaVersion: 1,
      id: "basic-task",
      kind: "request",
      title: "Basic Task",
      description: "Starter request form for a basic task.",
      variables: {},
      tags: [],
      appliesTo: [],
      version: "0.1.0",
      starter: true,
    },
    body: "# Basic Task\n\nDescribe the task, context, constraints, and expected output.\n",
  },
  {
    path: ".wonder/reuse/templates/basic-report",
    manifest: {
      schemaVersion: 1,
      id: "basic-report",
      kind: "template",
      title: "Basic Report",
      description: "Starter template for a basic report.",
      variables: {},
      tags: [],
      appliesTo: [],
      version: "0.1.0",
      starter: true,
    },
    body: "# Basic Report\n\nSummarize changes, validation, and remaining risks.\n",
  },
] as const;

export interface EnsureReuseInitFilesResult {
  createdPaths: string[];
  existingPaths: string[];
  skippedInvalidAssets: string[];
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function ensureDirectory(
  projectRoot: string,
  relativePath: string,
  result: EnsureReuseInitFilesResult,
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
  result: EnsureReuseInitFilesResult,
): Promise<void> {
  const absolutePath = join(projectRoot, relativePath);
  if (await pathExists(absolutePath)) {
    result.existingPaths.push(relativePath);
    return;
  }

  await writeFile(absolutePath, content, "utf8");
  result.createdPaths.push(relativePath);
}

async function seedStarterAssets(
  projectRoot: string,
  result: EnsureReuseInitFilesResult,
): Promise<void> {
  for (const asset of REUSE_STARTER_ASSETS) {
    await ensureDirectory(projectRoot, asset.path, result);
    await writeIfAbsent(
      projectRoot,
      `${asset.path}/asset.json`,
      `${JSON.stringify(asset.manifest, null, 2)}\n`,
      result,
    );
    await writeIfAbsent(projectRoot, `${asset.path}/body.md`, asset.body, result);
  }
}

export async function ensureReuseInitFiles(
  projectRoot: string,
  generatedAt: string,
): Promise<EnsureReuseInitFilesResult> {
  const result: EnsureReuseInitFilesResult = {
    createdPaths: [],
    existingPaths: [],
    skippedInvalidAssets: [],
  };

  await ensureDirectory(projectRoot, ".wonder", result);
  await ensureDirectory(projectRoot, ".wonder/config", result);
  await ensureDirectory(projectRoot, ".wonder/reuse", result);
  await ensureDirectory(projectRoot, ".wonder/reuse/templates", result);
  await ensureDirectory(projectRoot, ".wonder/reuse/snippets", result);
  await ensureDirectory(projectRoot, ".wonder/reuse/requests", result);
  await ensureDirectory(projectRoot, ".wonder/reuse/patterns", result);
  await ensureDirectory(projectRoot, ".wonder/runs", result);

  await writeIfAbsent(
    projectRoot,
    ".wonder/config/reuse.json",
    `${JSON.stringify(DEFAULT_REUSE_CONFIG, null, 2)}\n`,
    result,
  );
  await seedStarterAssets(projectRoot, result);

  const built = await buildReuseIndexValue(projectRoot, generatedAt);
  result.skippedInvalidAssets.push(...built.skippedInvalidAssets);
  await writeFile(
    join(projectRoot, ".wonder/reuse/index.json"),
    `${JSON.stringify(built.index, null, 2)}\n`,
    "utf8",
  );
  result.createdPaths.push(".wonder/reuse/index.json");

  return result;
}
