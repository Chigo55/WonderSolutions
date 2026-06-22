import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  extendCapabilitiesSnapshotSchema,
  extendCompanionCatalogSchema,
  extendCompanionsSnapshotSchema,
  extendIntegrationCatalogSchema,
  extendIntegrationsSnapshotSchema,
  type ExtendCompanionCatalog,
  type ExtendIntegrationCatalog,
} from "../schema/extend.ts";

export const DEFAULT_EXTEND_CONFIG = {
  schemaVersion: 1,
  allowRemoteChecksByDefault: false,
} as const;

export interface EnsureExtendInitFilesResult {
  createdPaths: string[];
  existingPaths: string[];
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

export function hasSecretLikeValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => hasSecretLikeValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).some(([key, entry]) => {
      if (/secret|token|password|api[_-]?key|credential/i.test(key)) return true;
      return hasSecretLikeValue(entry);
    });
  }

  return false;
}

async function ensureDirectory(
  projectRoot: string,
  relativePath: string,
  result: EnsureExtendInitFilesResult,
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
  result: EnsureExtendInitFilesResult,
): Promise<void> {
  const absolutePath = join(projectRoot, relativePath);
  if (await pathExists(absolutePath)) {
    result.existingPaths.push(relativePath);
    return;
  }

  await writeFile(absolutePath, content, "utf8");
  result.createdPaths.push(relativePath);
}

async function readCatalogs(catalogRoot: string): Promise<{
  companions: ExtendCompanionCatalog;
  integrations: ExtendIntegrationCatalog;
}> {
  const rawCompanions = JSON.parse(await readFile(join(catalogRoot, "companions.json"), "utf8"));
  const rawIntegrations = JSON.parse(await readFile(join(catalogRoot, "integrations.json"), "utf8"));

  if (hasSecretLikeValue(rawCompanions) || hasSecretLikeValue(rawIntegrations)) {
    throw new Error("catalog contains secret-like values");
  }

  return {
    companions: extendCompanionCatalogSchema.parse(rawCompanions),
    integrations: extendIntegrationCatalogSchema.parse(rawIntegrations),
  };
}

export async function ensureExtendInitFiles(
  projectRoot: string,
  catalogRoot: string,
  generatedAt: string,
): Promise<EnsureExtendInitFilesResult> {
  const catalogs = await readCatalogs(catalogRoot);
  const result: EnsureExtendInitFilesResult = {
    createdPaths: [],
    existingPaths: [],
  };

  await ensureDirectory(projectRoot, ".wonder", result);
  await ensureDirectory(projectRoot, ".wonder/config", result);
  await ensureDirectory(projectRoot, ".wonder/extend", result);
  await ensureDirectory(projectRoot, ".wonder/runs", result);

  await writeIfAbsent(
    projectRoot,
    ".wonder/config/extend.json",
    `${JSON.stringify(DEFAULT_EXTEND_CONFIG, null, 2)}\n`,
    result,
  );
  await writeIfAbsent(
    projectRoot,
    ".wonder/extend/companions.json",
    `${JSON.stringify(
      extendCompanionsSnapshotSchema.parse({
        schemaVersion: 1,
        companions: catalogs.companions.companions.map((companion) => ({
          id: companion.id,
          enabled: false,
          source: "catalog",
        })),
      }),
      null,
      2,
    )}\n`,
    result,
  );
  await writeIfAbsent(
    projectRoot,
    ".wonder/extend/integrations.json",
    `${JSON.stringify(
      extendIntegrationsSnapshotSchema.parse({
        schemaVersion: 1,
        integrations: Object.fromEntries(
          catalogs.integrations.integrations.map((integration) => [
            integration.id,
            {
              enabled: false,
              metadata: {
                provider: integration.id,
              },
            },
          ]),
        ),
      }),
      null,
      2,
    )}\n`,
    result,
  );
  await writeIfAbsent(
    projectRoot,
    ".wonder/extend/capabilities.json",
    `${JSON.stringify(
      extendCapabilitiesSnapshotSchema.parse({
        schemaVersion: 1,
        generatedAt,
        capabilities: {},
      }),
      null,
      2,
    )}\n`,
    result,
  );

  return result;
}
