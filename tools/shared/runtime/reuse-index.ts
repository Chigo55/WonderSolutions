import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  reuseAssetManifestSchema,
  reuseIndexSchema,
  type ReuseAssetKind,
  type ReuseIndex,
  type ReuseIndexAsset,
} from "../schema/reuse.ts";
import { pathExists } from "./io/fs-path.ts";
import { writeJsonFile } from "./io/json.ts";

/**
 * Machine-managed reuse index (docs/deterministic-runtime.md section 4: regenerate
 * from asset directories when missing, stale, or explicitly refreshed). Extracted
 * from reuse-init so the refresh is a standalone runtime operation.
 */

export const REUSE_INDEX_RELATIVE_PATH = ".wonder/reuse/index.json";

export const REUSE_ASSET_DIRECTORIES = [
  { kind: "template", directory: ".wonder/reuse/templates" },
  { kind: "snippet", directory: ".wonder/reuse/snippets" },
  { kind: "request", directory: ".wonder/reuse/requests" },
  { kind: "pattern", directory: ".wonder/reuse/patterns" },
] as const satisfies ReadonlyArray<{ kind: ReuseAssetKind; directory: string }>;

export interface BuildReuseIndexResult {
  index: ReuseIndex;
  skippedInvalidAssets: string[];
}

async function listAssetDirectories(projectRoot: string, relativeRoot: string): Promise<string[]> {
  const absoluteRoot = join(projectRoot, relativeRoot);
  if (!(await pathExists(absoluteRoot))) return [];

  const entries = await readdir(absoluteRoot, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => `${relativeRoot}/${entry.name}`);
}

async function readIndexAsset(projectRoot: string, relativePath: string): Promise<ReuseIndexAsset | undefined> {
  const assetJsonPath = `${relativePath}/asset.json`;
  const bodyPath = `${relativePath}/body.md`;
  if (!(await pathExists(join(projectRoot, assetJsonPath))) || !(await pathExists(join(projectRoot, bodyPath)))) {
    return undefined;
  }

  const manifest = reuseAssetManifestSchema.parse(JSON.parse(await readFile(join(projectRoot, assetJsonPath), "utf8")));

  return {
    id: manifest.id,
    kind: manifest.kind,
    title: manifest.title,
    path: relativePath,
    tags: manifest.tags,
    version: manifest.version,
  };
}

/** Build the reuse index value by scanning asset directories (does not write). */
export async function buildReuseIndexValue(projectRoot: string, generatedAt: string): Promise<BuildReuseIndexResult> {
  const assets: ReuseIndexAsset[] = [];
  const skippedInvalidAssets: string[] = [];

  for (const assetRoot of REUSE_ASSET_DIRECTORIES) {
    for (const relativePath of await listAssetDirectories(projectRoot, assetRoot.directory)) {
      try {
        const asset = await readIndexAsset(projectRoot, relativePath);
        if (asset) assets.push(asset);
        else skippedInvalidAssets.push(relativePath);
      } catch {
        skippedInvalidAssets.push(relativePath);
      }
    }
  }

  assets.sort((left, right) => `${left.kind}:${left.id}`.localeCompare(`${right.kind}:${right.id}`));

  return {
    index: reuseIndexSchema.parse({ schemaVersion: 1, generatedAt, assets }),
    skippedInvalidAssets,
  };
}

export interface RefreshReuseIndexResult {
  index: ReuseIndex;
  indexPath: string;
  skippedInvalidAssets: string[];
}

/** Regenerate and write `.wonder/reuse/index.json` from the asset directories. */
export async function refreshReuseIndex(projectRoot: string, generatedAt: string): Promise<RefreshReuseIndexResult> {
  const built = await buildReuseIndexValue(projectRoot, generatedAt);
  await writeJsonFile(join(projectRoot, REUSE_INDEX_RELATIVE_PATH), built.index);
  return {
    index: built.index,
    indexPath: REUSE_INDEX_RELATIVE_PATH,
    skippedInvalidAssets: built.skippedInvalidAssets,
  };
}
