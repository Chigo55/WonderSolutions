import { join } from "node:path";
import { ZodError } from "zod";
import {
  buildLatestReportSchema,
  governLatestReportSchema,
  runRecordSchema,
  type BuildLatestReport,
  type GovernLatestReport,
  type RunRecord,
  type RunStatus,
} from "../schema/run.ts";
import { RuntimeAbortError, runtimeError } from "./result.ts";
import { readJsonIfPresent, writeJsonFile } from "./io/json.ts";

/**
 * Disk round-trips for run records and latest-report pointers
 * (docs/deterministic-runtime.md section 4). Throwing helpers; public operations
 * wrap them.
 */

export type RunStatusValue = RunStatus;

function runRecordRelativePath(runId: string): string {
  return `.wonder/runs/${runId}/run.json`;
}

/** Typed, additive patch for a run record. Identity fields cannot be changed. */
export interface RunRecordPatch {
  status?: RunStatus;
  finishedAt?: string;
  outputs?: Record<string, unknown>;
  validation?: RunRecord["validation"];
  error?: RunRecord["error"];
}

function parseRunRecordOrAbort(raw: unknown, relativePath: string): RunRecord {
  try {
    return runRecordSchema.parse(raw);
  } catch (error) {
    throw new RuntimeAbortError(
      runtimeError(
        "runtime-invalid-run",
        `invalid run record in ${relativePath}: ${error instanceof ZodError ? error.message : String(error)}`,
        { path: relativePath, hint: "repair the run record to match the run schema before retrying" },
      ),
    );
  }
}

/** Read and validate a run record. Returns `undefined` when the run has no record. */
export async function readRunRecord(projectRoot: string, runId: string): Promise<RunRecord | undefined> {
  const relativePath = runRecordRelativePath(runId);
  const raw = await readJsonIfPresent(join(projectRoot, relativePath), relativePath);
  if (raw === undefined) return undefined;
  return parseRunRecordOrAbort(raw, relativePath);
}

/**
 * Apply a typed patch to an existing run record. The record must already exist
 * (run scaffolds create it once); a missing record aborts with a repair hint.
 */
export async function updateRunRecord(
  projectRoot: string,
  runId: string,
  patch: RunRecordPatch,
): Promise<RunRecord> {
  const relativePath = runRecordRelativePath(runId);
  const existing = await readRunRecord(projectRoot, runId);
  if (existing === undefined) {
    throw new RuntimeAbortError(
      runtimeError("runtime-missing-run", `run record not found: ${relativePath}`, {
        path: relativePath,
        hint: "create the run scaffold before updating its record",
      }),
    );
  }

  const next = parseRunRecordOrAbort(
    {
      ...existing,
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.finishedAt !== undefined ? { finishedAt: patch.finishedAt } : {}),
      ...(patch.outputs !== undefined ? { outputs: patch.outputs } : {}),
      ...(patch.validation !== undefined ? { validation: patch.validation } : {}),
      ...(patch.error !== undefined ? { error: patch.error } : {}),
    },
    relativePath,
  );

  await writeJsonFile(join(projectRoot, relativePath), next);
  return next;
}

export type LatestReportKind = "build" | "govern";

interface LatestReportByKind {
  build: BuildLatestReport;
  govern: GovernLatestReport;
}

const LATEST_REPORT_CONFIG = {
  build: { path: ".wonder/reports/build-latest.json", schema: buildLatestReportSchema },
  govern: { path: ".wonder/reports/govern-latest.json", schema: governLatestReportSchema },
} as const;

/** Read the latest build or govern report pointer, validated. */
export async function readLatestReport<K extends LatestReportKind>(
  projectRoot: string,
  kind: K,
): Promise<LatestReportByKind[K] | undefined> {
  const config = LATEST_REPORT_CONFIG[kind];
  const raw = await readJsonIfPresent(join(projectRoot, config.path), config.path);
  if (raw === undefined) return undefined;
  try {
    return config.schema.parse(raw) as LatestReportByKind[K];
  } catch (error) {
    throw new RuntimeAbortError(
      runtimeError(
        "runtime-invalid-report",
        `invalid ${kind} latest report in ${config.path}: ${error instanceof ZodError ? error.message : String(error)}`,
        { path: config.path, hint: "repair or remove the latest report file before retrying" },
      ),
    );
  }
}

/** Overwrite the latest build or govern report pointer with a validated summary. */
export async function writeLatestReport<K extends LatestReportKind>(
  projectRoot: string,
  kind: K,
  report: LatestReportByKind[K],
): Promise<void> {
  const config = LATEST_REPORT_CONFIG[kind];
  await writeJsonFile(join(projectRoot, config.path), config.schema.parse(report));
}
