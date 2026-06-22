import { join } from "node:path";
import { platformIdSchema, type PlatformId } from "../platform/names.ts";
import { createScaffold } from "./markdown/scaffold.ts";
import { writeRunFilesIfAbsent } from "./run-files.ts";
import type { CapabilityId } from "../schema/package.ts";
import {
  governStandardsArtifactsSchema,
  policyStandardsIndexSchema,
  policyViolationsSchema,
  runRecordSchema,
  type GovernStandardsArtifacts,
  type RunRecord,
} from "../schema/run.ts";

export interface CreateGovernRunScaffoldOptions {
  projectRoot: string;
  runId: string;
  capabilityId: CapabilityId;
  platform: PlatformId;
  userRequest: string;
  startedAt: string;
}

export interface GovernRunScaffoldResult {
  runId: string;
  runDir: string;
  files: string[];
  createdPaths: string[];
  existingPaths: string[];
}

function jsonWithTrailingNewline(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function defaultDefineStandardsArtifacts(): GovernStandardsArtifacts {
  return governStandardsArtifactsSchema.parse({
    standardsCreated: [],
    standardsModified: [],
    rulesAdded: [],
    rulesUpdated: [],
    conflicts: [],
  });
}

function governRunFiles(
  runId: string,
  capabilityId: CapabilityId,
  runRecord: RunRecord,
  userRequest: string,
): ReadonlyArray<readonly [fileName: string, content: string]> {
  if (capabilityId === "check-policy") {
    const standardsIndex = policyStandardsIndexSchema.parse({ rules: [] });
    const violations = policyViolationsSchema.parse({ violations: [] });
    return [
      ["run.json", jsonWithTrailingNewline(runRecord)],
      ["request.md", `${userRequest.trimEnd()}\n`],
      ["standards-index.json", jsonWithTrailingNewline(standardsIndex)],
      ["inspect.md", createScaffold("govern-inspect")],
      ["violations.json", jsonWithTrailingNewline(violations)],
      ["report.md", createScaffold("run-report")],
      ["artifacts.json", jsonWithTrailingNewline({})],
    ];
  }

  if (capabilityId === "define-standards") {
    return [
      ["run.json", jsonWithTrailingNewline(runRecord)],
      ["request.md", `${userRequest.trimEnd()}\n`],
      ["observed-conventions.md", createScaffold("observed-conventions")],
      ["proposed-standards.md", createScaffold("proposed-standards")],
      ["changes.md", createScaffold("standards-changes")],
      ["report.md", createScaffold("run-report")],
      ["artifacts.json", jsonWithTrailingNewline(defaultDefineStandardsArtifacts())],
    ];
  }

  throw new Error(`unsupported govern run scaffold capability: ${capabilityId}`);
}

export async function createGovernRunScaffold(
  options: CreateGovernRunScaffoldOptions,
): Promise<GovernRunScaffoldResult> {
  const platform = platformIdSchema.parse(options.platform);
  const runDir = join(options.projectRoot, ".wonder", "runs", options.runId);

  const runRecord: RunRecord = runRecordSchema.parse({
    schemaVersion: 1,
    runId: options.runId,
    packageId: "wonder-govern",
    capabilityId: options.capabilityId,
    platform,
    status: "running",
    startedAt: options.startedAt,
  });
  const files = governRunFiles(options.runId, options.capabilityId, runRecord, options.userRequest);
  const written = await writeRunFilesIfAbsent(runDir, options.runId, files);

  return {
    runId: options.runId,
    runDir,
    files: written.files,
    createdPaths: written.createdPaths,
    existingPaths: written.existingPaths,
  };
}
