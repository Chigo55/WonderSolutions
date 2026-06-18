import { z } from "zod";
import { relativePathSchema } from "./adapter.ts";

export const reuseAssetKindSchema = z.enum(["request", "template", "snippet", "pattern"]);

export const reuseAssetManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    kind: reuseAssetKindSchema,
    title: z.string().min(1),
    description: z.string().min(1),
    variables: z.record(z.unknown()),
    tags: z.array(z.string().min(1)).default([]),
    appliesTo: z.array(z.string().min(1)).default([]),
    version: z.string().regex(/^\d+\.\d+\.\d+$/).default("0.1.0"),
    createdFromRunId: z.string().min(1).optional(),
    starter: z.boolean().optional(),
  })
  .strict();

export const reuseIndexAssetSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    kind: reuseAssetKindSchema,
    title: z.string().min(1),
    path: relativePathSchema,
    tags: z.array(z.string().min(1)),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
  })
  .strict();

export const reuseIndexSchema = z
  .object({
    schemaVersion: z.literal(1),
    generatedAt: z.string().datetime(),
    assets: z.array(reuseIndexAssetSchema),
  })
  .strict();

export const reuseAssetChangesSchema = z
  .object({
    created: z.array(relativePathSchema),
    updated: z.array(relativePathSchema),
    moved: z.array(relativePathSchema),
    deleted: z.array(relativePathSchema),
    deletionCandidates: z.array(relativePathSchema),
  })
  .strict();

export const selectedReuseAssetSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
    kind: reuseAssetKindSchema.optional(),
    path: relativePathSchema.optional(),
    version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
  })
  .strict();

export const reuseGenerationArtifactsSchema = z
  .object({
    writtenPaths: z.array(relativePathSchema),
  })
  .strict();

export const promotedAssetArtifactsSchema = z
  .object({
    savedAssetPath: relativePathSchema.nullable(),
  })
  .strict();

const ASSET_KIND_DIRECTORIES: Record<ReuseAssetKind, string> = {
  template: "templates",
  snippet: "snippets",
  request: "requests",
  pattern: "patterns",
};

export type ReuseAssetKind = z.infer<typeof reuseAssetKindSchema>;
export type ReuseAssetManifest = z.infer<typeof reuseAssetManifestSchema>;
export type ReuseIndexAsset = z.infer<typeof reuseIndexAssetSchema>;
export type ReuseIndex = z.infer<typeof reuseIndexSchema>;
export type ReuseAssetChanges = z.infer<typeof reuseAssetChangesSchema>;
export type SelectedReuseAsset = z.infer<typeof selectedReuseAssetSchema>;
export type ReuseGenerationArtifacts = z.infer<typeof reuseGenerationArtifactsSchema>;
export type PromotedAssetArtifacts = z.infer<typeof promotedAssetArtifactsSchema>;

export function reuseAssetPath(kind: ReuseAssetKind, assetId: string): string {
  return `.wonder/reuse/${ASSET_KIND_DIRECTORIES[kind]}/${assetId}`;
}
