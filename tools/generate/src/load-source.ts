import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import {
  REQUIRED_PACKAGES,
  validatePackageManifestForDirectory,
  type CapabilityId,
  type PackageId,
} from "../../shared/schema/package.ts";
import {
  validateCapabilityManifestForDirectory,
  validateInstructionBody,
} from "../../shared/schema/capability.ts";
import { adapterConfigSchema } from "../../shared/schema/adapter.ts";
import { extendCompanionCatalogSchema, extendIntegrationCatalogSchema } from "../../shared/schema/extend.ts";
import { PLATFORMS, type PlatformId } from "../../shared/platform/names.ts";
import type { AdapterSource, CapabilitySource, PackageSource, SourceGraph } from "./types.ts";

function toRelativePath(...segments: string[]): string {
  return segments.join("/").replace(/\\/g, "/");
}

async function readText(root: string, relativePath: string, sourceTextByPath: Map<string, string>): Promise<string> {
  const content = await readFile(join(root, relativePath), "utf8");
  sourceTextByPath.set(relativePath, content);
  return content;
}

async function readJson(root: string, relativePath: string, sourceTextByPath: Map<string, string>): Promise<unknown> {
  return JSON.parse(await readText(root, relativePath, sourceTextByPath));
}

async function assertFileExists(root: string, relativePath: string): Promise<void> {
  const info = await stat(join(root, relativePath));
  if (!info.isFile()) {
    throw new Error(`expected file: ${relativePath}`);
  }
}

async function loadPackage(
  root: string,
  packageId: PackageId,
  capabilityIds: readonly CapabilityId[],
  sourceTextByPath: Map<string, string>,
): Promise<PackageSource> {
  const manifestPath = toRelativePath("packages", packageId, "manifest.json");
  const manifest = validatePackageManifestForDirectory(
    await readJson(root, manifestPath, sourceTextByPath),
    packageId,
    capabilityIds,
  );
  const capabilities: CapabilitySource[] = [];
  const specs: Record<CapabilityId, string> = {};

  for (const capabilityId of manifest.capabilityOrder) {
    const specPath = toRelativePath("packages", packageId, "specs", `${capabilityId}.md`);
    specs[capabilityId] = await readText(root, specPath, sourceTextByPath);

    const capabilityManifestPath = toRelativePath(
      "packages",
      packageId,
      "capabilities",
      capabilityId,
      "capability.json",
    );
    const instructionPath = toRelativePath(
      "packages",
      packageId,
      "capabilities",
      capabilityId,
      "instruction.md",
    );
    capabilities.push({
      manifestPath: capabilityManifestPath,
      instructionPath,
      manifest: validateCapabilityManifestForDirectory(
        await readJson(root, capabilityManifestPath, sourceTextByPath),
        capabilityId,
      ),
      instruction: validateInstructionBody(await readText(root, instructionPath, sourceTextByPath)),
    });
  }

  return { manifestPath, manifest, specs, capabilities };
}

async function loadAdapter(
  root: string,
  platform: PlatformId,
  sourceTextByPath: Map<string, string>,
): Promise<AdapterSource> {
  const configPath = toRelativePath("adapters", platform, "adapter.json");
  const config = adapterConfigSchema.parse(await readJson(root, configPath, sourceTextByPath));
  if (config.platform !== platform) {
    throw new Error(`adapter platform must match directory: ${platform}`);
  }

  const templateRoot = toRelativePath("adapters", platform, "templates");
  const templates: Record<string, string> = {};
  for (const output of config.outputs) {
    const templatePath = toRelativePath(templateRoot, output.template);
    await assertFileExists(root, templatePath);
    templates[output.template] = await readText(root, templatePath, sourceTextByPath);
  }

  return { configPath, templateRoot, config, templates };
}

export async function loadSource(root: string): Promise<SourceGraph> {
  const sourceTextByPath = new Map<string, string>();
  const packages: PackageSource[] = [];

  for (const [packageId, capabilityIds] of Object.entries(REQUIRED_PACKAGES) as Array<
    [PackageId, readonly CapabilityId[]]
  >) {
    packages.push(await loadPackage(root, packageId, capabilityIds, sourceTextByPath));
  }

  extendCompanionCatalogSchema.parse(
    await readJson(root, "packages/wonder-extend/catalog/companions.json", sourceTextByPath),
  );
  extendIntegrationCatalogSchema.parse(
    await readJson(root, "packages/wonder-extend/catalog/integrations.json", sourceTextByPath),
  );

  const adapters = {} as Record<PlatformId, AdapterSource>;
  for (const platform of PLATFORMS) {
    adapters[platform] = await loadAdapter(root, platform, sourceTextByPath);
  }

  return { packages, adapters, sourceTextByPath };
}
