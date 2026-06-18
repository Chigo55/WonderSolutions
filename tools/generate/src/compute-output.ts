import { createRequire } from "node:module";
import type HandlebarsType from "handlebars";
import { outputPathFor } from "../../shared/platform/paths.ts";
import { canonicalId, surfaceName, type PlatformId } from "../../shared/platform/names.ts";
import type { AdapterOutput } from "../../shared/schema/adapter.ts";
import { generatedFileSchema } from "../../shared/schema/generated.ts";
import type { CapabilityId, PackageId } from "../../shared/schema/package.ts";
import { normalizeText, stableStringify } from "../../shared/hash/canonicalize.ts";
import { computeSourceHash } from "../../shared/hash/source-hash.ts";
import type { CapabilitySource, ComputedGeneratedFile, PackageSource, SourceGraph } from "./types.ts";

const require = createRequire(import.meta.url);
const Handlebars = require("handlebars") as typeof HandlebarsType;

function ensureTrailingNewline(value: string): string {
  const normalized = normalizeText(value).trimEnd();
  return `${normalized}\n`;
}

function renderTemplate(template: string, context: Record<string, unknown>): string {
  return ensureTrailingNewline(Handlebars.compile(template, { noEscape: true })(context));
}

function renderPath(
  output: AdapterOutput,
  packageSource?: PackageSource,
  capabilitySource?: CapabilitySource,
): string {
  return renderTemplate(output.path, {
    package: packageSource?.manifest,
    capability: capabilitySource?.manifest,
  }).trim();
}

function marketplaceJson(platform: PlatformId, packages: readonly PackageSource[]): string {
  const sourceRoot = platform === "claude" ? "plugins/claude" : "plugins/codex";
  return stableStringify({
    schemaVersion: 1,
    plugins: packages.map((packageSource) => ({
      name: packageSource.manifest.id,
      displayName: packageSource.manifest.displayName,
      version: packageSource.manifest.version,
      description: packageSource.manifest.description,
      source: {
        path: `./${sourceRoot}/${packageSource.manifest.id}`,
      },
    })),
  });
}

function pluginManifestJson(platform: PlatformId, packageSource: PackageSource): string {
  if (platform === "claude") {
    return stableStringify({
      name: packageSource.manifest.id,
      displayName: packageSource.manifest.displayName,
      version: packageSource.manifest.version,
      description: packageSource.manifest.description,
    });
  }

  if (platform === "codex") {
    return stableStringify({
      name: packageSource.manifest.id,
      version: packageSource.manifest.version,
      description: packageSource.manifest.description,
      skills: "./skills/",
    });
  }

  return stableStringify({
    name: packageSource.manifest.id,
  });
}

function skillMarkdown(
  platform: PlatformId,
  packageSource: PackageSource,
  capabilitySource: CapabilitySource,
): string {
  const pkg = packageSource.manifest;
  const cap = capabilitySource.manifest;
  const frontmatter =
    platform === "codex"
      ? `---\nname: ${pkg.id}-${cap.id}\ndescription: ${cap.description}\n---\n\n`
      : "";

  return ensureTrailingNewline(`${frontmatter}${capabilitySource.instruction.trimEnd()}`);
}

function sourceFilesFor(
  output: AdapterOutput,
  adapterConfigPath: string,
  templatePath: string,
  packages: readonly PackageSource[],
  packageSource?: PackageSource,
  capabilitySource?: CapabilitySource,
): string[] {
  if (output.kind === "marketplace") {
    return [...packages.map((entry) => entry.manifestPath), adapterConfigPath, templatePath];
  }

  if (output.kind === "plugin-manifest") {
    if (!packageSource) throw new Error("plugin manifest output requires package source");
    return [packageSource.manifestPath, adapterConfigPath, templatePath];
  }

  if (!packageSource || !capabilitySource) {
    throw new Error(`${output.kind} output requires package and capability source`);
  }

  return [
    packageSource.manifestPath,
    capabilitySource.manifestPath,
    capabilitySource.instructionPath,
    adapterConfigPath,
    templatePath,
  ];
}

function renderOutputBody(
  platform: PlatformId,
  output: AdapterOutput,
  graph: SourceGraph,
  packageSource?: PackageSource,
  capabilitySource?: CapabilitySource,
): string {
  if (output.kind === "marketplace") {
    return marketplaceJson(platform, graph.packages);
  }

  if (output.kind === "plugin-manifest") {
    if (!packageSource) throw new Error("plugin manifest output requires package source");
    return pluginManifestJson(platform, packageSource);
  }

  if (!packageSource || !capabilitySource) {
    throw new Error(`${output.kind} output requires package and capability source`);
  }

  return skillMarkdown(platform, packageSource, capabilitySource);
}

function generatedFileFor(
  graph: SourceGraph,
  platform: PlatformId,
  output: AdapterOutput,
  packageSource?: PackageSource,
  capabilitySource?: CapabilitySource,
): ComputedGeneratedFile {
  const adapter = graph.adapters[platform];
  const template = adapter.templates[output.template];
  if (!template) throw new Error(`template not loaded: ${platform}/${output.template}`);

  const outputPath = renderPath(output, packageSource, capabilitySource);
  const expectedPath = outputPathFor(
    platform,
    output.kind,
    packageSource?.manifest.id,
    capabilitySource?.manifest.id,
  );
  if (outputPath !== expectedPath) {
    throw new Error(`adapter path mismatch for ${platform} ${output.kind}: ${outputPath} != ${expectedPath}`);
  }

  const templatePath = `${adapter.templateRoot}/${output.template}`;
  const sourceFiles = sourceFilesFor(
    output,
    adapter.configPath,
    templatePath,
    graph.packages,
    packageSource,
    capabilitySource,
  );
  const sourceHash = computeSourceHash({
    platform,
    outputKind: output.kind,
    outputPath,
    sourceFiles,
    sourceTextByPath: graph.sourceTextByPath,
  });
  const canonical = capabilitySource
    ? canonicalId(packageSource?.manifest.id as PackageId, capabilitySource.manifest.id as CapabilityId)
    : "";
  const body = renderTemplate(template, {
    platform,
    generatedAt: null,
    package: packageSource?.manifest,
    capability: capabilitySource?.manifest,
    instruction: capabilitySource?.instruction,
    surface: capabilitySource
      ? {
          canonicalId: canonical,
          platformName: surfaceName(platform, packageSource?.manifest.id as PackageId, capabilitySource.manifest.id),
        }
      : undefined,
    paths: {
      sourceFiles,
      outputPath,
    },
    hash: {
      sourceHash,
    },
    content: renderOutputBody(platform, output, graph, packageSource, capabilitySource),
  });
  const content =
    output.header === "html-comment"
      ? `<!-- GENERATED by WonderSolutions. Source hash: ${sourceHash}. Do not edit. -->\n${body}`
      : body;

  return generatedFileSchema.parse({
    platform,
    kind: output.kind,
    ...(packageSource ? { packageId: packageSource.manifest.id } : {}),
    ...(capabilitySource ? { capabilityId: capabilitySource.manifest.id } : {}),
    path: outputPath,
    content,
    sourceFiles,
    sourceHash,
    textKind: output.textKind,
    header: output.header,
  });
}

function filesForOutput(
  graph: SourceGraph,
  platform: PlatformId,
  output: AdapterOutput,
): ComputedGeneratedFile[] {
  if (output.scope === "repository") {
    return [generatedFileFor(graph, platform, output)];
  }

  if (output.scope === "package") {
    return graph.packages.map((packageSource) => generatedFileFor(graph, platform, output, packageSource));
  }

  return graph.packages.flatMap((packageSource) =>
    packageSource.capabilities.map((capabilitySource) =>
      generatedFileFor(graph, platform, output, packageSource, capabilitySource),
    ),
  );
}

function assertNoDuplicatePaths(files: readonly ComputedGeneratedFile[]): void {
  const seen = new Map<string, ComputedGeneratedFile>();
  for (const file of files) {
    const existing = seen.get(file.path);
    if (existing) {
      throw new Error(`generated output collision: ${file.path} (${existing.platform}, ${file.platform})`);
    }
    seen.set(file.path, file);
  }
}

export function computeOutputs(
  graph: SourceGraph,
  platforms: readonly PlatformId[],
): ComputedGeneratedFile[] {
  const files = platforms.flatMap((platform) => {
    const adapter = graph.adapters[platform];
    return adapter.config.outputs.flatMap((output) => filesForOutput(graph, platform, output));
  });

  assertNoDuplicatePaths(files);
  return files;
}
