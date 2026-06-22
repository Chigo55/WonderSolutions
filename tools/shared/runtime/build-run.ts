import { join } from "node:path";
import { platformIdSchema, type PlatformId } from "../platform/names.ts";
import { createScaffold } from "./markdown/scaffold.ts";
import { writeRunFilesIfAbsent } from "./run-files.ts";
import type { CapabilityId } from "../schema/package.ts";
import {
  buildArtifactsSchema,
  buildModifyArtifactsSchema,
  reviewFindingsSchema,
  runRecordSchema,
  type BuildArtifacts,
  type BuildModifyArtifacts,
  type RunRecord,
} from "../schema/run.ts";

export interface CreateBuildRunScaffoldOptions {
  projectRoot: string;
  runId: string;
  capabilityId: CapabilityId;
  platform: PlatformId;
  userRequest: string;
  startedAt: string;
}

export interface BuildRunScaffoldResult {
  runId: string;
  runDir: string;
  files: string[];
  createdPaths: string[];
  existingPaths: string[];
}

function jsonWithTrailingNewline(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function defaultArtifacts(capabilityId: CapabilityId): BuildArtifacts | BuildModifyArtifacts | Record<string, never> {
  if (capabilityId === "review") {
    return {};
  }

  if (capabilityId === "modify") {
    return buildModifyArtifactsSchema.parse({
      modified: [],
      created: [],
      deleted: [],
      validation: [],
      preservedUnrelatedChanges: [],
    });
  }

  return buildArtifactsSchema.parse({
    created: [],
    modified: [],
    validated: [],
    reuseAssetsUsed: [],
    companionCapabilitiesUsed: [],
  });
}

function buildRunFiles(
  runId: string,
  capabilityId: CapabilityId,
  runRecord: RunRecord,
  userRequest: string,
): ReadonlyArray<readonly [fileName: string, content: string]> {
  const artifacts = defaultArtifacts(capabilityId);

  if (capabilityId === "review") {
    const findings = reviewFindingsSchema.parse({ findings: [] });
    return [
      ["run.json", jsonWithTrailingNewline(runRecord)],
      ["request.md", `${userRequest.trimEnd()}\n`],
      ["inspect.md", createScaffold("build-inspect")],
      ["findings.json", jsonWithTrailingNewline(findings)],
      ["report.md", createScaffold("run-report")],
      ["artifacts.json", jsonWithTrailingNewline(artifacts)],
    ];
  }

  return [
    ["run.json", jsonWithTrailingNewline(runRecord)],
    ["request.md", `${userRequest.trimEnd()}\n`],
    ["plan.md", createScaffold(capabilityId === "modify" ? "build-modify-plan" : "build-create-plan")],
    ["inspect.md", createScaffold("build-inspect")],
    ["report.md", createScaffold("run-report")],
    ["artifacts.json", jsonWithTrailingNewline(artifacts)],
  ];
}

export async function createBuildRunScaffold(
  options: CreateBuildRunScaffoldOptions,
): Promise<BuildRunScaffoldResult> {
  const platform = platformIdSchema.parse(options.platform);
  const runDir = join(options.projectRoot, ".wonder", "runs", options.runId);

  const runRecord: RunRecord = runRecordSchema.parse({
    schemaVersion: 1,
    runId: options.runId,
    packageId: "wonder-build",
    capabilityId: options.capabilityId,
    platform,
    status: "running",
    startedAt: options.startedAt,
  });
  const files = buildRunFiles(options.runId, options.capabilityId, runRecord, options.userRequest);
  const written = await writeRunFilesIfAbsent(runDir, options.runId, files);

  return {
    runId: options.runId,
    runDir,
    files: written.files,
    createdPaths: written.createdPaths,
    existingPaths: written.existingPaths,
  };
}
