import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { ZodError, type ZodTypeAny } from "zod";
import { runtimeStateSchema } from "../../shared/schema/runtime.ts";
import {
  extendCapabilitiesSnapshotSchema,
  extendCompanionsSnapshotSchema,
  extendIntegrationsSnapshotSchema,
} from "../../shared/schema/extend.ts";
import { reuseIndexSchema } from "../../shared/schema/reuse.ts";
import { runRecordSchema } from "../../shared/schema/run.ts";
import type { ValidationIssue } from "./types.ts";

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function readJsonIfPresent(root: string, relativePath: string): Promise<unknown | undefined> {
  const absolutePath = join(root, relativePath);
  if (!(await pathExists(absolutePath))) return undefined;
  return JSON.parse(await readFile(absolutePath, "utf8"));
}

async function validateJsonFile(
  root: string,
  relativePath: string,
  schema: ZodTypeAny,
): Promise<ValidationIssue[]> {
  try {
    const value = await readJsonIfPresent(root, relativePath);
    if (value === undefined) return [];
    schema.parse(value);
    return [];
  } catch (error) {
    return [
      {
        code: "runtime-invalid",
        message: error instanceof ZodError ? error.message : error instanceof Error ? error.message : String(error),
        path: relativePath,
        hint: "repair or remove the invalid runtime state file",
      },
    ];
  }
}

async function validateRunRecords(root: string): Promise<ValidationIssue[]> {
  const runsRoot = join(root, ".wonder", "runs");
  if (!(await pathExists(runsRoot))) return [];

  const issues: ValidationIssue[] = [];
  for (const entry of await readdir(runsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    issues.push(...(await validateJsonFile(root, `.wonder/runs/${entry.name}/run.json`, runRecordSchema)));
  }
  return issues;
}

export async function validateRuntime(root: string): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  issues.push(...(await validateJsonFile(root, ".wonder/state.json", runtimeStateSchema)));
  issues.push(...(await validateJsonFile(root, ".wonder/extend/companions.json", extendCompanionsSnapshotSchema)));
  issues.push(...(await validateJsonFile(root, ".wonder/extend/integrations.json", extendIntegrationsSnapshotSchema)));
  issues.push(...(await validateJsonFile(root, ".wonder/extend/capabilities.json", extendCapabilitiesSnapshotSchema)));
  issues.push(...(await validateJsonFile(root, ".wonder/reuse/index.json", reuseIndexSchema)));
  issues.push(...(await validateRunRecords(root)));

  return issues;
}
