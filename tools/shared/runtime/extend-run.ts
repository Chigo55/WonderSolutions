import { join } from "node:path";
import { platformIdSchema, type PlatformId } from "../platform/names.ts";
import { createScaffold } from "./markdown/scaffold.ts";
import { writeRunFilesIfAbsent } from "./run-files.ts";
import type { CapabilityId } from "../schema/package.ts";
import { runRecordSchema, type RunRecord } from "../schema/run.ts";
import {
  companionRecommendationListSchema,
  companionSelectionChangesSchema,
  configureIntegrationArtifactsSchema,
  detectCapabilitiesArtifactsSchema,
  detectedCapabilitySchema,
  discoverCompanionArtifactsSchema,
  extendCapabilitiesSnapshotSchema,
  extendCompanionsSnapshotSchema,
  extendIntegrationsSnapshotSchema,
  integrationChangesSchema,
  type CompanionRecommendation,
  type DetectedCapability,
  type ExtendCapabilitiesSnapshot,
  type ExtendIntegrationCatalog,
  type ExtendIntegrationsSnapshot,
  type ExtendCompanionCatalog,
  type ExtendCompanionsSnapshot,
  type IntegrationAuthReference,
  type IntegrationChanges,
} from "../schema/extend.ts";
import { hasSecretLikeValue } from "./extend-init.ts";

export const DISCOVER_COMPANION_OPERATIONS = [
  "recommend",
  "save-selections",
  "refresh-snapshot",
] as const;

export type DiscoverCompanionOperation = (typeof DISCOVER_COMPANION_OPERATIONS)[number];

export interface RankCompanionRecommendationsOptions {
  catalog: ExtendCompanionCatalog;
  platform: PlatformId;
  userGoal?: string;
  projectContext?: string;
  detectedCapabilities?: Record<string, { available?: unknown; confidence?: unknown }>;
}

export interface BuildCompanionSelectionSnapshotOptions {
  catalog: ExtendCompanionCatalog;
  selectedCompanionIds?: readonly string[];
  existingSnapshot?: ExtendCompanionsSnapshot;
}

export interface CreateDiscoverCompanionsRunScaffoldOptions {
  projectRoot: string;
  runId: string;
  platform: PlatformId;
  userRequest: string;
  startedAt: string;
  operation: DiscoverCompanionOperation;
}

export interface DiscoverCompanionsRunScaffoldResult {
  runId: string;
  runDir: string;
  files: string[];
  createdPaths: string[];
  existingPaths: string[];
}

export function requiresDiscoverCompanionsRunRecord(operation: DiscoverCompanionOperation): boolean {
  return operation === "save-selections" || operation === "refresh-snapshot";
}

function tokenize(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3),
  );
}

function availabilityForCompanion(
  capabilityHints: readonly string[],
  detectedCapabilities: RankCompanionRecommendationsOptions["detectedCapabilities"],
): CompanionRecommendation["availability"] {
  for (const capabilityId of capabilityHints) {
    const detected = detectedCapabilities?.[capabilityId];
    if (
      detected?.available === true &&
      (detected.confidence === "high" || detected.confidence === "medium")
    ) {
      return "detected-available";
    }
  }

  return "recommended-only";
}

function fitForScore(score: number): CompanionRecommendation["fit"] {
  if (score >= 6) return "high";
  if (score >= 4) return "medium";
  return "low";
}

export function rankCompanionRecommendations(
  options: RankCompanionRecommendationsOptions,
): CompanionRecommendation[] {
  const platform = platformIdSchema.parse(options.platform);
  const contextTokens = tokenize(`${options.userGoal ?? ""} ${options.projectContext ?? ""}`);

  const scored = options.catalog.companions.map((companion) => {
    const searchableText = tokenize(
      `${companion.id} ${companion.displayName} ${companion.purpose} ${companion.tags.join(" ")}`,
    );
    const matchedTerms = [...contextTokens].filter((token) => searchableText.has(token));
    const platformScore = companion.platforms.includes(platform) ? 4 : 0;
    const score = platformScore + matchedTerms.length * 2;
    const availability = availabilityForCompanion(companion.capabilityHints, options.detectedCapabilities);

    return {
      companion,
      score,
      matchedTerms,
      recommendation: {
        id: companion.id,
        rank: 0,
        fit: fitForScore(score),
        reason:
          matchedTerms.length > 0
            ? `Matches ${matchedTerms.join(", ")} for the requested goal.`
            : `Fits ${platform} with limited project context.`,
        platforms: companion.platforms,
        availability,
        nextAction:
          availability === "detected-available"
            ? "use detected capability with user consent"
            : "run wonder-extend.detect-capabilities",
        assumptions: contextTokens.size === 0 ? ["limited context"] : [],
      } satisfies CompanionRecommendation,
    };
  });

  const recommendations = scored
    .sort((left, right) => right.score - left.score || left.companion.id.localeCompare(right.companion.id))
    .map((entry, index) => ({
      ...entry.recommendation,
      rank: index + 1,
    }));

  return companionRecommendationListSchema.parse({ recommendations }).recommendations;
}

function containsAvailabilityOrInstallationField(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => containsAvailabilityOrInstallationField(entry));
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  return Object.entries(value).some(([key, entry]) => {
    if (/^(available|installed|installation|installPath)$/i.test(key)) return true;
    return containsAvailabilityOrInstallationField(entry);
  });
}

export function assertSavedCompanionSelectionsDoNotImplyAvailability(value: unknown): true {
  if (containsAvailabilityOrInstallationField(value)) {
    throw new Error("saved companion selections must not imply availability or installation");
  }

  if (hasSecretLikeValue(value)) {
    throw new Error("saved companion selections must not contain secret-like values");
  }

  extendCompanionsSnapshotSchema.parse(value);
  return true;
}

export function buildCompanionSelectionSnapshot(
  options: BuildCompanionSelectionSnapshotOptions,
): ExtendCompanionsSnapshot {
  const selectedIds = options.selectedCompanionIds ? new Set(options.selectedCompanionIds) : undefined;
  const catalogIds = new Set(options.catalog.companions.map((companion) => companion.id));
  const existingEnabledById = new Map(
    (options.existingSnapshot?.companions ?? []).map((companion) => [companion.id, companion.enabled]),
  );

  for (const selectedId of selectedIds ?? []) {
    if (!catalogIds.has(selectedId)) {
      throw new Error(`unknown companion selection: ${selectedId}`);
    }
  }

  const snapshot = {
    schemaVersion: 1 as const,
    companions: options.catalog.companions.map((companion) => ({
      id: companion.id,
      enabled: selectedIds ? selectedIds.has(companion.id) : existingEnabledById.get(companion.id) === true,
      source: "catalog" as const,
    })),
  };

  assertSavedCompanionSelectionsDoNotImplyAvailability(snapshot);
  return extendCompanionsSnapshotSchema.parse(snapshot);
}

function jsonWithTrailingNewline(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function discoverCompanionFiles(
  runRecord: RunRecord,
  userRequest: string,
): ReadonlyArray<readonly [fileName: string, content: string]> {
  return [
    ["run.json", jsonWithTrailingNewline(runRecord)],
    ["request.md", `${userRequest.trimEnd()}\n`],
    ["recommendation-context.md", createScaffold("recommendation-context")],
    [
      "companion-recommendations.json",
      jsonWithTrailingNewline(companionRecommendationListSchema.parse({ recommendations: [] })),
    ],
    [
      "selection-changes.json",
      jsonWithTrailingNewline(
        companionSelectionChangesSchema.parse({
          enabled: [],
          disabled: [],
          refreshed: false,
        }),
      ),
    ],
    ["report.md", createScaffold("run-report")],
    ["artifacts.json", jsonWithTrailingNewline(discoverCompanionArtifactsSchema.parse({ updatedPaths: [] }))],
  ];
}

export async function createDiscoverCompanionsRunScaffold(
  options: CreateDiscoverCompanionsRunScaffoldOptions,
): Promise<DiscoverCompanionsRunScaffoldResult> {
  if (!requiresDiscoverCompanionsRunRecord(options.operation)) {
    throw new Error(`read-only companion discovery does not require run scaffold: ${options.operation}`);
  }

  const platform = platformIdSchema.parse(options.platform);
  const capabilityId: CapabilityId = "discover-companions";
  const runDir = join(options.projectRoot, ".wonder", "runs", options.runId);

  const runRecord = runRecordSchema.parse({
    schemaVersion: 1,
    runId: options.runId,
    packageId: "wonder-extend",
    capabilityId,
    platform,
    status: "running",
    startedAt: options.startedAt,
    inputs: {
      operation: options.operation,
    },
  });
  const files = discoverCompanionFiles(runRecord, options.userRequest);
  const written = await writeRunFilesIfAbsent(runDir, options.runId, files);

  return {
    runId: options.runId,
    runDir,
    files: written.files,
    createdPaths: written.createdPaths,
    existingPaths: written.existingPaths,
  };
}

export const CONFIGURE_INTEGRATION_OPERATIONS = [
  "inspect",
  "add",
  "update",
  "disable",
  "remove",
] as const;

export type ConfigureIntegrationOperation = (typeof CONFIGURE_INTEGRATION_OPERATIONS)[number];

export interface ApplyIntegrationChangeOptions {
  existingSnapshot: ExtendIntegrationsSnapshot;
  action: Exclude<ConfigureIntegrationOperation, "inspect">;
  integrationId: string;
  catalog?: ExtendIntegrationCatalog;
  auth?: IntegrationAuthReference;
  metadata?: Record<string, unknown>;
  customIntegrationConfirmed?: boolean;
}

export interface IntegrationChangeResult {
  snapshot: ExtendIntegrationsSnapshot;
  changes: IntegrationChanges;
}

export interface CreateConfigureIntegrationRunScaffoldOptions {
  projectRoot: string;
  runId: string;
  platform: PlatformId;
  userRequest: string;
  startedAt: string;
  operation: ConfigureIntegrationOperation;
}

export interface ConfigureIntegrationRunScaffoldResult {
  runId: string;
  runDir: string;
  files: string[];
  createdPaths: string[];
  existingPaths: string[];
}

const FORBIDDEN_INTEGRATION_FIELD_PATTERN = /^(token|password|secret|privateKey|apiKeyValue|credentialValue)$/i;

export function requiresConfigureIntegrationRunRecord(operation: ConfigureIntegrationOperation): boolean {
  return operation !== "inspect";
}

function containsForbiddenIntegrationSecret(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => containsForbiddenIntegrationSecret(entry));
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  return Object.entries(value).some(([key, entry]) => {
    if (FORBIDDEN_INTEGRATION_FIELD_PATTERN.test(key)) return true;
    return containsForbiddenIntegrationSecret(entry);
  });
}

export function assertIntegrationMetadataHasNoSecrets(value: unknown): true {
  if (containsForbiddenIntegrationSecret(value)) {
    throw new Error("integration metadata must not contain secret values");
  }

  return true;
}

function emptyIntegrationChanges(): IntegrationChanges {
  return integrationChangesSchema.parse({
    added: [],
    updated: [],
    disabled: [],
    removed: [],
  });
}

function assertKnownOrConfirmedIntegration(options: ApplyIntegrationChangeOptions): void {
  if (!options.catalog) return;
  if (options.catalog.integrations.some((integration) => integration.id === options.integrationId)) return;
  if (options.customIntegrationConfirmed === true) return;

  throw new Error(`unknown integration requires confirmation: ${options.integrationId}`);
}

export function applyIntegrationChange(options: ApplyIntegrationChangeOptions): IntegrationChangeResult {
  assertKnownOrConfirmedIntegration(options);
  assertIntegrationMetadataHasNoSecrets(options.auth);
  assertIntegrationMetadataHasNoSecrets(options.metadata);

  const snapshot: ExtendIntegrationsSnapshot = extendIntegrationsSnapshotSchema.parse({
    schemaVersion: 1,
    integrations: { ...options.existingSnapshot.integrations },
  });
  const changes = emptyIntegrationChanges();
  const existing = snapshot.integrations[options.integrationId];

  if (options.action === "remove") {
    if (existing) {
      delete snapshot.integrations[options.integrationId];
      changes.removed.push(options.integrationId);
    }
    return {
      snapshot: extendIntegrationsSnapshotSchema.parse(snapshot),
      changes: integrationChangesSchema.parse(changes),
    };
  }

  if (options.action === "disable") {
    snapshot.integrations[options.integrationId] = {
      ...(existing ?? { metadata: {} }),
      enabled: false,
    };
    changes.disabled.push(options.integrationId);
    return {
      snapshot: extendIntegrationsSnapshotSchema.parse(snapshot),
      changes: integrationChangesSchema.parse(changes),
    };
  }

  const nextEntry = {
    enabled: true,
    ...(options.auth ? { auth: options.auth } : existing?.auth ? { auth: existing.auth } : {}),
    metadata: {
      ...(existing?.metadata ?? {}),
      ...(options.metadata ?? {}),
    },
  };
  snapshot.integrations[options.integrationId] = nextEntry;
  if (existing) {
    changes.updated.push(options.integrationId);
  } else {
    changes.added.push(options.integrationId);
  }

  return {
    snapshot: extendIntegrationsSnapshotSchema.parse(snapshot),
    changes: integrationChangesSchema.parse(changes),
  };
}

function configureIntegrationFiles(
  runRecord: RunRecord,
  userRequest: string,
): ReadonlyArray<readonly [fileName: string, content: string]> {
  return [
    ["run.json", jsonWithTrailingNewline(runRecord)],
    ["request.md", `${userRequest.trimEnd()}\n`],
    ["integration-changes.json", jsonWithTrailingNewline(emptyIntegrationChanges())],
    ["report.md", createScaffold("run-report")],
    [
      "artifacts.json",
      jsonWithTrailingNewline(configureIntegrationArtifactsSchema.parse({ updatedPaths: [] })),
    ],
  ];
}

export async function createConfigureIntegrationRunScaffold(
  options: CreateConfigureIntegrationRunScaffoldOptions,
): Promise<ConfigureIntegrationRunScaffoldResult> {
  if (!requiresConfigureIntegrationRunRecord(options.operation)) {
    throw new Error(`read-only integration inspection does not require run scaffold: ${options.operation}`);
  }

  const platform = platformIdSchema.parse(options.platform);
  const capabilityId: CapabilityId = "configure-integration";
  const runDir = join(options.projectRoot, ".wonder", "runs", options.runId);

  const runRecord = runRecordSchema.parse({
    schemaVersion: 1,
    runId: options.runId,
    packageId: "wonder-extend",
    capabilityId,
    platform,
    status: "running",
    startedAt: options.startedAt,
    inputs: {
      operation: options.operation,
    },
  });
  const files = configureIntegrationFiles(runRecord, options.userRequest);
  const written = await writeRunFilesIfAbsent(runDir, options.runId, files);

  return {
    runId: options.runId,
    runDir,
    files: written.files,
    createdPaths: written.createdPaths,
    existingPaths: written.existingPaths,
  };
}

export interface RemoteCheckConsentOptions {
  remoteChecksRequested: boolean;
  remoteConsent: boolean;
}

export interface UseExtendCapabilityOptions {
  capability: DetectedCapability;
  userConsented: boolean;
  readOnly: boolean;
  readOnlyOptInEnabled: boolean;
}

export interface DetectCapabilitiesFromConfiguredIntegrationsOptions {
  integrationsSnapshot: ExtendIntegrationsSnapshot;
  envPresence?: Record<string, boolean>;
  generatedAt: string;
  remoteConsent: boolean;
}

export interface CreateDetectCapabilitiesRunScaffoldOptions {
  projectRoot: string;
  runId: string;
  platform: PlatformId;
  userRequest: string;
  startedAt: string;
  remoteConsent: boolean;
}

export interface DetectCapabilitiesRunScaffoldResult {
  runId: string;
  runDir: string;
  files: string[];
  createdPaths: string[];
  existingPaths: string[];
}

const PROVIDER_CAPABILITY_IDS: Record<string, readonly string[]> = {
  github: ["github.pr.read", "github.issue.write"],
  linear: ["linear.issue.read", "linear.issue.write"],
};

const OBVIOUS_SECRET_VALUE_PATTERN = /\b(?:token|password|secret|api[_-]?key|credential)\s*=/i;

export function assertRemoteChecksAllowed(options: RemoteCheckConsentOptions): true {
  if (options.remoteChecksRequested && !options.remoteConsent) {
    throw new Error("remote checks require explicit user consent");
  }

  return true;
}

export function canUseExtendCapability(options: UseExtendCapabilityOptions): boolean {
  const capability = detectedCapabilitySchema.parse(options.capability);
  if (!capability.available) return false;
  if (capability.confidence === "low") return false;
  if (options.userConsented) return true;
  return options.readOnly && options.readOnlyOptInEnabled;
}

function capabilityIdsForProvider(provider: string): readonly string[] {
  const normalized = provider.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return PROVIDER_CAPABILITY_IDS[normalized] ?? [`${normalized}.connection.read`];
}

function capabilityEvidenceContainsSecret(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => capabilityEvidenceContainsSecret(entry));
  }

  if (value && typeof value === "object") {
    return Object.values(value).some((entry) => capabilityEvidenceContainsSecret(entry));
  }

  return typeof value === "string" && OBVIOUS_SECRET_VALUE_PATTERN.test(value);
}

export function assertCapabilitySnapshotHasNoSecrets(value: unknown): true {
  const snapshot = extendCapabilitiesSnapshotSchema.parse(value);
  if (capabilityEvidenceContainsSecret(snapshot.capabilities)) {
    throw new Error("capability status must not contain secret values");
  }

  return true;
}

export function detectCapabilitiesFromConfiguredIntegrations(
  options: DetectCapabilitiesFromConfiguredIntegrationsOptions,
): ExtendCapabilitiesSnapshot {
  assertRemoteChecksAllowed({
    remoteChecksRequested: false,
    remoteConsent: options.remoteConsent,
  });

  const capabilities: ExtendCapabilitiesSnapshot["capabilities"] = {};

  for (const [integrationId, integration] of Object.entries(options.integrationsSnapshot.integrations)) {
    if (!integration.enabled) continue;

    const provider = String(integration.metadata.provider ?? integrationId);
    const auth = integration.auth;
    const envVar = auth?.type === "env" ? auth.envVar : undefined;
    const envPresent = envVar ? options.envPresence?.[envVar] === true : undefined;
    const envMissing = envVar ? options.envPresence?.[envVar] !== true : false;
    const available = envMissing ? false : true;
    const confidence = envMissing ? "low" : envPresent ? "high" : "medium";
    const evidence = [`integration ${integrationId} enabled`];

    if (envVar) {
      evidence.push(envPresent ? `env var ${envVar} is present` : `env var ${envVar} is not present`);
    } else {
      evidence.push("no authentication reference required or recorded");
    }

    for (const capabilityId of capabilityIdsForProvider(provider)) {
      capabilities[capabilityId] = detectedCapabilitySchema.parse({
        available,
        source: "integration",
        confidence,
        evidence,
        remoteChecked: false,
        lastCheckedAt: options.generatedAt,
      });
    }
  }

  const snapshot = extendCapabilitiesSnapshotSchema.parse({
    schemaVersion: 1,
    generatedAt: options.generatedAt,
    capabilities,
  });
  assertCapabilitySnapshotHasNoSecrets(snapshot);
  return snapshot;
}

function emptyCapabilitiesSnapshot(generatedAt: string): ExtendCapabilitiesSnapshot {
  return extendCapabilitiesSnapshotSchema.parse({
    schemaVersion: 1,
    generatedAt,
    capabilities: {},
  });
}

function detectCapabilitiesFiles(
  runRecord: RunRecord,
  userRequest: string,
): ReadonlyArray<readonly [fileName: string, content: string]> {
  return [
    ["run.json", jsonWithTrailingNewline(runRecord)],
    ["request.md", `${userRequest.trimEnd()}\n`],
    ["detection-plan.md", createScaffold("detection-plan")],
    ["detection-results.json", jsonWithTrailingNewline(emptyCapabilitiesSnapshot(runRecord.startedAt))],
    ["report.md", createScaffold("run-report")],
    [
      "artifacts.json",
      jsonWithTrailingNewline(
        detectCapabilitiesArtifactsSchema.parse({
          updatedPaths: [".wonder/extend/capabilities.json"],
        }),
      ),
    ],
  ];
}

export async function createDetectCapabilitiesRunScaffold(
  options: CreateDetectCapabilitiesRunScaffoldOptions,
): Promise<DetectCapabilitiesRunScaffoldResult> {
  const platform = platformIdSchema.parse(options.platform);
  const capabilityId: CapabilityId = "detect-capabilities";
  const runDir = join(options.projectRoot, ".wonder", "runs", options.runId);

  const runRecord = runRecordSchema.parse({
    schemaVersion: 1,
    runId: options.runId,
    packageId: "wonder-extend",
    capabilityId,
    platform,
    status: "running",
    startedAt: options.startedAt,
    inputs: {
      remoteConsent: options.remoteConsent,
    },
  });
  const files = detectCapabilitiesFiles(runRecord, options.userRequest);
  const written = await writeRunFilesIfAbsent(runDir, options.runId, files);

  return {
    runId: options.runId,
    runDir,
    files: written.files,
    createdPaths: written.createdPaths,
    existingPaths: written.existingPaths,
  };
}
