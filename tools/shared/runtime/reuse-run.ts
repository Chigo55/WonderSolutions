import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { platformIdSchema, type PlatformId } from "../platform/names.ts";
import type { CapabilityId } from "../schema/package.ts";
import {
  reuseGenerationArtifactsSchema,
  promotedAssetArtifactsSchema,
  selectedReuseAssetSchema,
  reuseAssetChangesSchema,
  reuseAssetKindSchema,
  reuseAssetManifestSchema,
  type ReuseIndexAsset,
  type ReuseAssetChanges,
  type ReuseAssetKind,
  type ReuseAssetManifest,
} from "../schema/reuse.ts";
import { runRecordSchema, type RunRecord } from "../schema/run.ts";

export const REUSE_OPERATIONS = [
  "list",
  "search",
  "inspect",
  "create",
  "update",
  "move",
  "organize",
  "delete",
  "generate",
  "promote",
] as const;

export type ReuseOperation = (typeof REUSE_OPERATIONS)[number];

export interface ReuseDeletionOptions {
  explicitDeleteRequested: boolean;
  referenced: boolean;
  referencedDeletionConfirmed?: boolean;
}

export interface PromotionSaveOptions {
  immediateSaveRequested: boolean;
  draftConfirmed: boolean;
}

export interface CreatePromotedAssetDraftOptions {
  sourceContent: string;
  kind: ReuseAssetKind | string;
  id: string;
  title: string;
  description: string;
  variables: Record<string, unknown>;
  tags?: string[];
  appliesTo?: string[];
  sourceRunId?: string;
}

export interface PromotedAssetDraft {
  asset: ReuseAssetManifest;
  body: string;
}

export interface CreateReuseRunScaffoldOptions {
  projectRoot: string;
  runId: string;
  capabilityId: CapabilityId;
  platform: PlatformId;
  userRequest: string;
  startedAt: string;
  operation: ReuseOperation;
}

export interface ReuseRunScaffoldResult {
  runId: string;
  runDir: string;
  files: string[];
}

const CHANGING_OPERATIONS = new Set<ReuseOperation>([
  "create",
  "update",
  "move",
  "organize",
  "delete",
  "promote",
]);

export function requiresReuseRunRecord(operation: ReuseOperation): boolean {
  return operation === "generate" || CHANGING_OPERATIONS.has(operation);
}

export function assertReuseDeletionAllowed(options: ReuseDeletionOptions): true {
  if (!options.explicitDeleteRequested) {
    throw new Error("asset deletion requires explicit user request");
  }

  if (options.referenced && options.referencedDeletionConfirmed !== true) {
    throw new Error("referenced asset deletion requires explicit confirmation");
  }

  return true;
}

export function assertPromotionSaveAllowed(options: PromotionSaveOptions): true {
  if (!options.immediateSaveRequested && !options.draftConfirmed) {
    throw new Error("confirmation required before saving promoted asset");
  }

  return true;
}

export function createPromotedAssetDraft(options: CreatePromotedAssetDraftOptions): PromotedAssetDraft {
  if (options.sourceContent.trim().length === 0) {
    throw new Error("source content is required");
  }

  const kindResult = reuseAssetKindSchema.safeParse(options.kind);
  if (!kindResult.success) {
    throw new Error("target kind is unsupported");
  }

  const asset = reuseAssetManifestSchema.parse({
    schemaVersion: 1,
    id: options.id,
    kind: kindResult.data,
    title: options.title,
    description: options.description,
    variables: options.variables,
    tags: options.tags ?? [],
    appliesTo: options.appliesTo ?? [],
    version: "0.1.0",
    ...(options.sourceRunId ? { createdFromRunId: options.sourceRunId } : {}),
  });

  return {
    asset,
    body: `${options.sourceContent.replace(/\r\n/g, "\n").trimEnd()}\n`,
  };
}

function jsonWithTrailingNewline(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function runRelativePath(runId: string, fileName: string): string {
  return `.wonder/runs/${runId}/${fileName}`;
}

function defaultAssetChanges(): ReuseAssetChanges {
  return reuseAssetChangesSchema.parse({
    created: [],
    updated: [],
    moved: [],
    deleted: [],
    deletionCandidates: [],
  });
}

export interface RenderReuseTemplateOptions {
  requiredVariables?: readonly string[];
  optionalDefaults?: Record<string, string>;
}

export interface RenderReuseTemplateResult {
  output: string;
  warnings: string[];
}

export function renderReuseTemplate(
  body: string,
  variables: Record<string, string>,
  options: RenderReuseTemplateOptions = {},
): RenderReuseTemplateResult {
  const normalizedBody = body.replace(/\r\n/g, "\n");
  const requiredVariables = options.requiredVariables ?? [];
  const missingRequired = requiredVariables.filter(
    (name) => variables[name] === undefined && options.optionalDefaults?.[name] === undefined,
  );

  if (missingRequired.length > 0) {
    throw new Error(`missing required variables: ${missingRequired.join(", ")}`);
  }

  const unknownVariables = new Set<string>();
  const output = normalizedBody.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (_match, variableName: string) => {
    if (variables[variableName] !== undefined) return variables[variableName];
    if (options.optionalDefaults?.[variableName] !== undefined) return options.optionalDefaults[variableName];
    unknownVariables.add(variableName);
    return "";
  });

  return {
    output,
    warnings:
      unknownVariables.size > 0
        ? [`unknown variables in body: ${Array.from(unknownVariables).join(", ")}`]
        : [],
  };
}

export interface SelectReuseAssetOptions {
  assetId?: string;
  purpose?: string;
}

export type SelectableReuseAsset = Omit<ReuseIndexAsset, "tags"> & {
  readonly tags: readonly string[];
};

export function selectReuseAsset<TAsset extends SelectableReuseAsset>(
  assets: readonly TAsset[],
  options: SelectReuseAssetOptions,
): TAsset {
  if (options.assetId) {
    const found = assets.find((asset) => asset.id === options.assetId);
    if (!found) throw new Error(`reuse asset not found: ${options.assetId}`);
    return found;
  }

  if (!options.purpose) {
    throw new Error("asset id or purpose is required");
  }

  const purpose = options.purpose.toLowerCase();
  const matches = assets.filter((asset) => {
    const searchable = [asset.id, asset.title, ...asset.tags].join(" ").toLowerCase();
    return searchable.includes(purpose);
  });

  if (matches.length === 0) {
    throw new Error("no matching reuse asset found");
  }
  if (matches.length > 1) {
    throw new Error("ambiguous asset match");
  }
  const selected = matches[0];
  if (!selected) {
    throw new Error("no matching reuse asset found");
  }
  return selected;
}

export interface ReuseTargetWriteOptions {
  projectRoot: string;
  targetPath: string;
  explicitTargetPath: boolean;
  overwriteConfirmed?: boolean;
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

export async function assertReuseTargetWriteAllowed(options: ReuseTargetWriteOptions): Promise<true> {
  if (!options.explicitTargetPath) {
    throw new Error("target path must be explicit before writing generated output");
  }

  const absolutePath = join(options.projectRoot, options.targetPath);
  if ((await pathExists(absolutePath)) && options.overwriteConfirmed !== true) {
    throw new Error("existing output target requires explicit overwrite confirmation");
  }

  return true;
}

function generationFiles(
  runRecord: RunRecord,
  userRequest: string,
): ReadonlyArray<readonly [fileName: string, content: string]> {
  return [
    ["run.json", jsonWithTrailingNewline(runRecord)],
    ["request.md", `${userRequest.trimEnd()}\n`],
    ["selected-asset.json", jsonWithTrailingNewline(selectedReuseAssetSchema.parse({}))],
    ["variables.json", jsonWithTrailingNewline({})],
    ["output.md", ""],
    ["report.md", ""],
    ["artifacts.json", jsonWithTrailingNewline(reuseGenerationArtifactsSchema.parse({ writtenPaths: [] }))],
  ];
}

function promotionFiles(
  runRecord: RunRecord,
  userRequest: string,
): ReadonlyArray<readonly [fileName: string, content: string]> {
  return [
    ["run.json", jsonWithTrailingNewline(runRecord)],
    ["request.md", `${userRequest.trimEnd()}\n`],
    ["source.md", ""],
    ["abstraction.md", ""],
    ["proposed-asset.json", jsonWithTrailingNewline({})],
    ["proposed-body.md", ""],
    ["report.md", ""],
    ["artifacts.json", jsonWithTrailingNewline(promotedAssetArtifactsSchema.parse({ savedAssetPath: null }))],
  ];
}

export async function createReuseRunScaffold(
  options: CreateReuseRunScaffoldOptions,
): Promise<ReuseRunScaffoldResult> {
  if (
    options.capabilityId !== "manage-assets" &&
    options.capabilityId !== "generate-output" &&
    options.capabilityId !== "promote-asset"
  ) {
    throw new Error(`unsupported reuse run scaffold capability: ${options.capabilityId}`);
  }

  if (!requiresReuseRunRecord(options.operation)) {
    throw new Error(`read-only reuse operation does not require run scaffold: ${options.operation}`);
  }

  const platform = platformIdSchema.parse(options.platform);
  const runDir = join(options.projectRoot, ".wonder", "runs", options.runId);
  await mkdir(runDir, { recursive: true });

  const runRecord: RunRecord = runRecordSchema.parse({
    schemaVersion: 1,
    runId: options.runId,
    packageId: "wonder-reuse",
    capabilityId: options.capabilityId,
    platform,
    status: "running",
    startedAt: options.startedAt,
  });
  const files =
    options.capabilityId === "generate-output"
      ? generationFiles(runRecord, options.userRequest)
      : options.capabilityId === "promote-asset"
        ? promotionFiles(runRecord, options.userRequest)
      : ([
          ["run.json", jsonWithTrailingNewline(runRecord)],
          ["request.md", `${options.userRequest.trimEnd()}\n`],
          ["asset-changes.json", jsonWithTrailingNewline(defaultAssetChanges())],
          ["report.md", ""],
          ["artifacts.json", jsonWithTrailingNewline({})],
        ] as const);

  for (const [fileName, content] of files) {
    await writeFile(join(runDir, fileName), content, "utf8");
  }

  return {
    runId: options.runId,
    runDir,
    files: files.map(([fileName]) => runRelativePath(options.runId, fileName)),
  };
}
