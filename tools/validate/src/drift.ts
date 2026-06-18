import { validateGeneratedFiles } from "./validate-generated.ts";
import type { ComputedGeneratedFile } from "../../generate/src/types.ts";
import type { ValidationIssue } from "./types.ts";

export async function detectGeneratedDrift(
  root: string,
  expectedFiles: readonly ComputedGeneratedFile[],
): Promise<ValidationIssue[]> {
  return validateGeneratedFiles(root, expectedFiles);
}
