import { loadSource } from "../../generate/src/load-source.ts";
import { computeOutputs } from "../../generate/src/compute-output.ts";
import { writeOutputs } from "../../generate/src/write-output.ts";
import { validateGenerated } from "../../validate/src/validate-generated.ts";
import { validateRuntime } from "../../validate/src/validate-runtime.ts";
import { validateSource } from "../../validate/src/validate-source.ts";
import type { ValidationIssue } from "../../validate/src/types.ts";
import { PLATFORMS, type PlatformId } from "../platform/names.ts";

/**
 * Thin wrappers over the existing build-time pipeline so generate / validate /
 * drift are reachable as runtime operations (docs/deterministic-runtime.md
 * section 7) without duplicating logic.
 */

export interface GenerateOptions {
  platforms?: readonly PlatformId[];
  dryRun?: boolean;
}

export interface GenerateResult {
  generated: number;
  written: string[];
  skipped: string[];
}

export async function runGenerate(sourceRoot: string, options: GenerateOptions = {}): Promise<GenerateResult> {
  const platforms = options.platforms ?? [...PLATFORMS];
  const graph = await loadSource(sourceRoot);
  const files = computeOutputs(graph, platforms);
  const report = await writeOutputs(sourceRoot, files, { dryRun: options.dryRun ?? false });
  return { generated: files.length, written: report.written, skipped: report.skipped };
}

export interface ValidateOptions {
  source?: boolean;
  generated?: boolean;
  runtime?: boolean;
  platforms?: readonly PlatformId[];
}

export interface ValidateResult {
  ok: boolean;
  issues: ValidationIssue[];
}

export async function runValidate(root: string, options: ValidateOptions = {}): Promise<ValidateResult> {
  const explicit = options.source === true || options.generated === true || options.runtime === true;
  const doSource = explicit ? options.source === true : true;
  const doGenerated = explicit ? options.generated === true : true;
  const doRuntime = explicit ? options.runtime === true : true;
  const platforms = options.platforms ?? [...PLATFORMS];

  const issues: ValidationIssue[] = [];
  if (doSource) issues.push(...(await validateSource(root)));
  if (doGenerated) issues.push(...(await validateGenerated(root, platforms)));
  if (doRuntime) issues.push(...(await validateRuntime(root)));

  return { ok: issues.length === 0, issues };
}

export interface DriftResult {
  drift: boolean;
  issues: ValidationIssue[];
}

export async function runDrift(root: string, platforms: readonly PlatformId[] = PLATFORMS): Promise<DriftResult> {
  const issues = await validateGenerated(root, platforms);
  return { drift: issues.length > 0, issues };
}
