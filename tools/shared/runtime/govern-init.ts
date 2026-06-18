import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const DEFAULT_GOVERN_CONFIG = {
  schemaVersion: 1,
  autoRunPolicyCheckAfterStandardsChange: false,
} as const;

export interface StarterStandard {
  fileName: string;
  path: string;
  content: string;
}

export const GOVERN_STARTER_STANDARDS: readonly StarterStandard[] = [
  {
    fileName: "coding.md",
    path: ".wonder/standards/coding.md",
    content: "# Coding Standards\n\nAdd project-specific coding standards here.\n",
  },
  {
    fileName: "architecture.md",
    path: ".wonder/standards/architecture.md",
    content: "# Architecture Standards\n\nAdd project-specific architecture standards here.\n",
  },
  {
    fileName: "security.md",
    path: ".wonder/standards/security.md",
    content: "# Security Standards\n\nAdd project-specific security standards here.\n",
  },
  {
    fileName: "docs.md",
    path: ".wonder/standards/docs.md",
    content: "# Documentation Standards\n\nAdd project-specific documentation standards here.\n",
  },
] as const;

export interface EnsureGovernInitFilesResult {
  createdPaths: string[];
  existingPaths: string[];
}

export function isKebabMarkdownName(fileName: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(fileName);
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

async function ensureDirectory(
  projectRoot: string,
  relativePath: string,
  result: EnsureGovernInitFilesResult,
): Promise<void> {
  const absolutePath = join(projectRoot, relativePath);
  if (await pathExists(absolutePath)) {
    result.existingPaths.push(relativePath);
    return;
  }

  await mkdir(absolutePath, { recursive: true });
  result.createdPaths.push(relativePath);
}

async function writeIfAbsent(
  projectRoot: string,
  relativePath: string,
  content: string,
  result: EnsureGovernInitFilesResult,
): Promise<void> {
  const absolutePath = join(projectRoot, relativePath);
  if (await pathExists(absolutePath)) {
    result.existingPaths.push(relativePath);
    return;
  }

  await writeFile(absolutePath, content, "utf8");
  result.createdPaths.push(relativePath);
}

export async function ensureGovernInitFiles(projectRoot: string): Promise<EnsureGovernInitFilesResult> {
  const result: EnsureGovernInitFilesResult = {
    createdPaths: [],
    existingPaths: [],
  };

  await ensureDirectory(projectRoot, ".wonder", result);
  await ensureDirectory(projectRoot, ".wonder/config", result);
  await ensureDirectory(projectRoot, ".wonder/standards", result);
  await ensureDirectory(projectRoot, ".wonder/runs", result);

  await writeIfAbsent(
    projectRoot,
    ".wonder/config/govern.json",
    `${JSON.stringify(DEFAULT_GOVERN_CONFIG, null, 2)}\n`,
    result,
  );

  for (const standard of GOVERN_STARTER_STANDARDS) {
    if (!isKebabMarkdownName(standard.fileName)) {
      throw new Error(`starter standard filename must be kebab-case Markdown: ${standard.fileName}`);
    }
    await writeIfAbsent(projectRoot, standard.path, standard.content, result);
  }

  return result;
}
