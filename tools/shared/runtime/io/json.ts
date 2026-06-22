import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { RuntimeAbortError, runtimeError } from "../result.ts";
import { pathExists } from "./fs-path.ts";

/**
 * Typed runtime JSON IO. Enforces the section 8 rules: two-space indentation with
 * a trailing newline on write, and invalid existing JSON aborts the operation with
 * a repair hint unless the read is explicitly part of a repair.
 */

/** Serialize a value to canonical runtime JSON text (2-space indent + trailing LF). */
export function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/** Write a value as canonical runtime JSON, creating parent directories as needed. */
export async function writeJsonFile(absolutePath: string, value: unknown): Promise<void> {
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, serializeJson(value), "utf8");
}

export interface ReadJsonOptions {
  /**
   * Repair mode. When true, malformed JSON is treated as absent (returns
   * `undefined`) so the caller may regenerate it, instead of aborting.
   */
  repair?: boolean;
}

/**
 * Read and JSON-parse a file when present.
 *
 * - Missing file -> `undefined`.
 * - Present but malformed -> throws {@link RuntimeAbortError} with a repair hint,
 *   unless `repair: true`, in which case it returns `undefined`.
 */
export async function readJsonIfPresent(
  absolutePath: string,
  relativePath: string,
  options: ReadJsonOptions = {},
): Promise<unknown | undefined> {
  if (!(await pathExists(absolutePath))) return undefined;

  const text = await readFile(absolutePath, "utf8");
  try {
    return JSON.parse(text);
  } catch (error) {
    if (options.repair) return undefined;
    throw new RuntimeAbortError(
      runtimeError("runtime-invalid-json", `invalid JSON in ${relativePath}: ${(error as Error).message}`, {
        path: relativePath,
        hint: "fix or remove the malformed JSON file, or rerun the operation in repair mode",
      }),
    );
  }
}
