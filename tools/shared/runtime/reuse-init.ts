import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  reuseAssetManifestSchema,
  reuseIndexSchema,
  type ReuseAssetKind,
  type ReuseAssetManifest,
  type ReuseIndex,
  type ReuseIndexAsset,
} from "../schema/reuse.ts";

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

const ASSET_DIRECTORIES: ReadonlyArray<{
  kind: ReuseAssetKind;
  directory: string;
}> = [
  { kind: "template", directory: ".wonder/reuse/templates" },
  { kind: "snippet", directory: ".wonder/reuse/snippets" },
  { kind: "request", directory: ".wonder/reuse/requests" },
  { kind: "pattern", directory: ".wonder/reuse/patterns" },
];

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

async function listAssetDirectories(projectRoot: string, relativeRoot: string): Promise<string[]> {
  const absoluteRoot = join(projectRoot, relativeRoot);
  if (!(await pathExists(absoluteRoot))) return [];

  const entries = await readdir(absoluteRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => `${relativeRoot}/${entry.name}`);
}

async function readAsset(projectRoot: string, relativePath: string): Promise<ReuseIndexAsset | undefined> {
  const assetJsonPath = `${relativePath}/asset.json`;
  const bodyPath = `${relativePath}/body.md`;
  if (!(await pathExists(join(projectRoot, assetJsonPath))) || !(await pathExists(join(projectRoot, bodyPath)))) {
    return undefined;
  }

  const manifest = reuseAssetManifestSchema.parse(
    JSON.parse(await readFile(join(projectRoot, assetJsonPath), "utf8")),
  );

  return {
    id: manifest.id,
    kind: manifest.kind,
    title: manifest.title,
    path: relativePath,
    tags: manifest.tags,
    version: manifest.version,
  };
}

async function buildReuseIndex(
  projectRoot: string,
  generatedAt: string,
  result: EnsureReuseInitFilesResult,
): Promise<ReuseIndex> {
  const assets: ReuseIndexAsset[] = [];

  for (const assetRoot of ASSET_DIRECTORIES) {
    for (const relativePath of await listAssetDirectories(projectRoot, assetRoot.directory)) {
      try {
        const asset = await readAsset(projectRoot, relativePath);
        if (asset) assets.push(asset);
        else result.skippedInvalidAssets.push(relativePath);
      } catch {
        result.skippedInvalidAssets.push(relativePath);
      }
    }
  }

  assets.sort((left, right) => `${left.kind}:${left.id}`.localeCompare(`${right.kind}:${right.id}`));

  return reuseIndexSchema.parse({
    schemaVersion: 1,
    generatedAt,
    assets,
  });
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

  const index = await buildReuseIndex(projectRoot, generatedAt, result);
  await writeFile(join(projectRoot, ".wonder/reuse/index.json"), `${JSON.stringify(index, null, 2)}\n`, "utf8");
  result.createdPaths.push(".wonder/reuse/index.json");

  return result;
}
