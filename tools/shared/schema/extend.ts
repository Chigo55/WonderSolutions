import { z } from "zod";
import { platformIdSchema } from "../platform/names.ts";
import { relativePathSchema } from "./adapter.ts";

const idSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const externalCapabilityIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*){2,}$/);

export const extendCompanionCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    companions: z.array(
      z
        .object({
          id: idSchema,
          displayName: z.string().min(1),
          sourceType: z.literal("companion"),
          purpose: z.string().min(1),
          platforms: z.array(platformIdSchema).min(1),
          tags: z.array(z.string().min(1)).default([]),
          capabilityHints: z.array(externalCapabilityIdSchema).default([]),
        })
        .strict(),
    ),
  })
  .strict();

export const extendIntegrationCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    integrations: z.array(
      z
        .object({
          id: idSchema,
          displayName: z.string().min(1),
          sourceType: z.literal("integration").default("integration"),
        })
        .strict(),
    ),
  })
  .strict();

export const integrationAuthReferenceSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("none"),
    })
    .strict(),
  z
    .object({
      type: z.literal("env"),
      envVar: z.string().regex(/^[A-Z_][A-Z0-9_]*$/),
    })
    .strict(),
  z
    .object({
      type: z.literal("secret-ref"),
      ref: z.string().min(1),
    })
    .strict(),
]);

export const extendIntegrationEntrySchema = z
  .object({
    enabled: z.boolean(),
    auth: integrationAuthReferenceSchema.optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .strict();

export const extendCompanionsSnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    companions: z.array(
      z
        .object({
          id: idSchema,
          enabled: z.boolean(),
          source: z.literal("catalog"),
        })
        .strict(),
    ),
  })
  .strict();

export const extendIntegrationsSnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    integrations: z.record(idSchema, extendIntegrationEntrySchema),
  })
  .strict();

export const detectedCapabilitySchema = z
  .object({
    available: z.boolean(),
    source: z.enum(["integration", "companion", "cli", "platform", "environment", "remote"]),
    confidence: z.enum(["high", "medium", "low"]),
    evidence: z.array(z.string().min(1)),
    remoteChecked: z.boolean(),
    lastCheckedAt: z.string().datetime(),
  })
  .strict();

export const extendCapabilitiesSnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    generatedAt: z.string().datetime(),
    capabilities: z.record(externalCapabilityIdSchema, detectedCapabilitySchema),
  })
  .strict();

export const companionFitSchema = z.enum(["high", "medium", "low"]);
export const companionAvailabilitySchema = z.enum(["recommended-only", "detected-available"]);

export const companionRecommendationSchema = z
  .object({
    id: idSchema,
    rank: z.number().int().positive(),
    fit: companionFitSchema,
    reason: z.string().min(1),
    platforms: z.array(platformIdSchema).min(1),
    availability: companionAvailabilitySchema,
    nextAction: z.string().min(1),
    assumptions: z.array(z.string().min(1)).default([]),
  })
  .strict();

export const companionRecommendationListSchema = z
  .object({
    recommendations: z.array(companionRecommendationSchema),
  })
  .strict();

export const companionSelectionChangesSchema = z
  .object({
    enabled: z.array(idSchema),
    disabled: z.array(idSchema),
    refreshed: z.boolean(),
  })
  .strict();

export const discoverCompanionArtifactsSchema = z
  .object({
    updatedPaths: z.array(relativePathSchema),
  })
  .strict();

export const integrationChangesSchema = z
  .object({
    added: z.array(idSchema),
    updated: z.array(idSchema),
    disabled: z.array(idSchema),
    removed: z.array(idSchema),
  })
  .strict();

export const configureIntegrationArtifactsSchema = z
  .object({
    updatedPaths: z.array(relativePathSchema),
  })
  .strict();

export const detectCapabilitiesArtifactsSchema = z
  .object({
    updatedPaths: z.array(relativePathSchema),
  })
  .strict();

export type ExtendCompanionCatalog = z.infer<typeof extendCompanionCatalogSchema>;
export type ExtendIntegrationCatalog = z.infer<typeof extendIntegrationCatalogSchema>;
export type IntegrationAuthReference = z.infer<typeof integrationAuthReferenceSchema>;
export type ExtendIntegrationEntry = z.infer<typeof extendIntegrationEntrySchema>;
export type ExtendCompanionsSnapshot = z.infer<typeof extendCompanionsSnapshotSchema>;
export type ExtendIntegrationsSnapshot = z.infer<typeof extendIntegrationsSnapshotSchema>;
export type ExtendCapabilitiesSnapshot = z.infer<typeof extendCapabilitiesSnapshotSchema>;
export type DetectedCapability = z.infer<typeof detectedCapabilitySchema>;
export type CompanionRecommendation = z.infer<typeof companionRecommendationSchema>;
export type CompanionRecommendationList = z.infer<typeof companionRecommendationListSchema>;
export type CompanionSelectionChanges = z.infer<typeof companionSelectionChangesSchema>;
export type DiscoverCompanionArtifacts = z.infer<typeof discoverCompanionArtifactsSchema>;
export type IntegrationChanges = z.infer<typeof integrationChangesSchema>;
export type ConfigureIntegrationArtifacts = z.infer<typeof configureIntegrationArtifactsSchema>;
export type DetectCapabilitiesArtifacts = z.infer<typeof detectCapabilitiesArtifactsSchema>;
