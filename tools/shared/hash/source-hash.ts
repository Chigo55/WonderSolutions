import { createHash } from "node:crypto";
import type { OutputKind } from "../schema/adapter.ts";
import type { PlatformId } from "../platform/names.ts";
import { canonicalSourceText, stableStringify } from "./canonicalize.ts";

export const GENERATOR_VERSION = "0.1.0";

export interface SourceHashInput {
  platform: PlatformId;
  outputKind: OutputKind;
  outputPath: string;
  sourceFiles: readonly string[];
  sourceTextByPath: ReadonlyMap<string, string>;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function computeSourceHash(input: SourceHashInput): string {
  const sourceFiles = input.sourceFiles.map((path) => {
    const sourceText = input.sourceTextByPath.get(path);
    if (sourceText === undefined) {
      throw new Error(`source file not loaded for hash: ${path}`);
    }

    return {
      path: path.replace(/\\/g, "/"),
      sha256: sha256(canonicalSourceText(path, sourceText)),
    };
  });

  return sha256(
    stableStringify({
      generatorVersion: GENERATOR_VERSION,
      platform: input.platform,
      outputKind: input.outputKind,
      outputPath: input.outputPath.replace(/\\/g, "/"),
      sourceFiles,
    }),
  );
}
