import { join } from "node:path";
import { ZodError } from "zod";
import {
  extendCapabilitiesSnapshotSchema,
  extendIntegrationsSnapshotSchema,
  type ExtendCapabilitiesSnapshot,
  type ExtendIntegrationCatalog,
  type ExtendIntegrationsSnapshot,
  type IntegrationAuthReference,
  type IntegrationChanges,
} from "../schema/extend.ts";
import {
  applyIntegrationChange,
  detectCapabilitiesFromConfiguredIntegrations,
  type ConfigureIntegrationOperation,
} from "./extend-run.ts";
import { readJsonIfPresent, writeJsonFile } from "./io/json.ts";
import { RuntimeAbortError, runtimeError } from "./result.ts";

/**
 * Disk-aware wrappers for the extend snapshots (docs/deterministic-runtime.md
 * section 6 wonder-extend rows). The pure transforms live in extend-run.ts; these
 * read the on-disk snapshot, apply the transform, and write it back. Secret values
 * remain forbidden by the underlying transforms.
 */

const INTEGRATIONS_RELATIVE_PATH = ".wonder/extend/integrations.json";
const CAPABILITIES_RELATIVE_PATH = ".wonder/extend/capabilities.json";

function emptyIntegrationsSnapshot(): ExtendIntegrationsSnapshot {
  return extendIntegrationsSnapshotSchema.parse({ schemaVersion: 1, integrations: {} });
}

async function readIntegrationsSnapshot(projectRoot: string): Promise<ExtendIntegrationsSnapshot> {
  const raw = await readJsonIfPresent(join(projectRoot, INTEGRATIONS_RELATIVE_PATH), INTEGRATIONS_RELATIVE_PATH);
  if (raw === undefined) return emptyIntegrationsSnapshot();
  try {
    return extendIntegrationsSnapshotSchema.parse(raw);
  } catch (error) {
    throw new RuntimeAbortError(
      runtimeError(
        "runtime-invalid-integrations",
        `invalid integrations snapshot: ${error instanceof ZodError ? error.message : String(error)}`,
        { path: INTEGRATIONS_RELATIVE_PATH, hint: "repair the integrations snapshot before retrying" },
      ),
    );
  }
}

export interface ApplyIntegrationChangeOnDiskOptions {
  projectRoot: string;
  action: Exclude<ConfigureIntegrationOperation, "inspect">;
  integrationId: string;
  catalog?: ExtendIntegrationCatalog;
  auth?: IntegrationAuthReference;
  metadata?: Record<string, unknown>;
  customIntegrationConfirmed?: boolean;
}

export interface ApplyIntegrationChangeOnDiskResult {
  snapshot: ExtendIntegrationsSnapshot;
  changes: IntegrationChanges;
}

/** Apply a typed integration change to the on-disk snapshot and persist it. */
export async function applyIntegrationChangeOnDisk(
  options: ApplyIntegrationChangeOnDiskOptions,
): Promise<ApplyIntegrationChangeOnDiskResult> {
  const existingSnapshot = await readIntegrationsSnapshot(options.projectRoot);
  const result = applyIntegrationChange({
    existingSnapshot,
    action: options.action,
    integrationId: options.integrationId,
    ...(options.catalog !== undefined ? { catalog: options.catalog } : {}),
    ...(options.auth !== undefined ? { auth: options.auth } : {}),
    ...(options.metadata !== undefined ? { metadata: options.metadata } : {}),
    ...(options.customIntegrationConfirmed !== undefined
      ? { customIntegrationConfirmed: options.customIntegrationConfirmed }
      : {}),
  });
  await writeJsonFile(join(options.projectRoot, INTEGRATIONS_RELATIVE_PATH), result.snapshot);
  return result;
}

export interface DetectCapabilitiesOnDiskOptions {
  projectRoot: string;
  generatedAt: string;
  remoteConsent: boolean;
  envPresence?: Record<string, boolean>;
}

/** Detect capabilities from the configured integrations snapshot and persist them. */
export async function detectCapabilitiesOnDisk(
  options: DetectCapabilitiesOnDiskOptions,
): Promise<ExtendCapabilitiesSnapshot> {
  const integrationsSnapshot = await readIntegrationsSnapshot(options.projectRoot);
  const snapshot = detectCapabilitiesFromConfiguredIntegrations({
    integrationsSnapshot,
    generatedAt: options.generatedAt,
    remoteConsent: options.remoteConsent,
    ...(options.envPresence !== undefined ? { envPresence: options.envPresence } : {}),
  });
  await writeJsonFile(join(options.projectRoot, CAPABILITIES_RELATIVE_PATH), snapshot);
  return snapshot;
}
