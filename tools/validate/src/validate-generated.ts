import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PLATFORMS, type PlatformId } from "../../shared/platform/names.ts";
import type { ComputedGeneratedFile } from "../../generate/src/types.ts";
import { loadSource } from "../../generate/src/load-source.ts";
import { computeOutputs } from "../../generate/src/compute-output.ts";
import type { ValidationIssue } from "./types.ts";

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

function validateGeneratedContent(file: ComputedGeneratedFile, actual: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (actual !== file.content) {
    issues.push({
      code: "generated-drift",
      message: "generated output differs from computed content",
      path: file.path,
      hint: "run npm run generate and review the generated diff",
    });
  }

  if (file.textKind === "json") {
    try {
      JSON.parse(actual);
    } catch (error) {
      issues.push({
        code: "generated-json-invalid",
        message: error instanceof Error ? error.message : String(error),
        path: file.path,
        hint: "regenerate the JSON output from canonical source",
      });
    }
  }

  if (file.textKind === "markdown" && file.header === "html-comment" && !actual.startsWith("<!-- GENERATED")) {
    issues.push({
      code: "generated-header-missing",
      message: "generated markdown is missing Wonder ownership header",
      path: file.path,
      hint: "run npm run generate",
    });
  }

  return issues;
}

export async function validateGeneratedFiles(
  root: string,
  expectedFiles: readonly ComputedGeneratedFile[],
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();

  for (const file of expectedFiles) {
    if (seen.has(file.path)) {
      issues.push({
        code: "generated-collision",
        message: "duplicate generated target path",
        path: file.path,
      });
      continue;
    }
    seen.add(file.path);

    const actual = await readOptional(join(root, file.path));
    if (actual === undefined) {
      issues.push({
        code: "generated-missing",
        message: "expected generated output is missing",
        path: file.path,
        hint: "run npm run generate",
      });
      continue;
    }

    issues.push(...validateGeneratedContent(file, actual));
  }

  return issues;
}

export async function validateGenerated(
  root: string,
  platforms: readonly PlatformId[] = PLATFORMS,
): Promise<ValidationIssue[]> {
  const graph = await loadSource(root);
  return validateGeneratedFiles(root, computeOutputs(graph, platforms));
}
