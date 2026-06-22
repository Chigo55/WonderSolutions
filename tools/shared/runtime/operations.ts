import { z } from "zod";
import { platformIdSchema } from "../platform/names.ts";
import { capabilityKindSchema } from "../schema/capability.ts";
import {
  buildLatestReportSchema,
  governLatestReportSchema,
  runStatusSchema,
} from "../schema/run.ts";
import { validateRuntime } from "../../validate/src/validate-runtime.ts";
import {
  RuntimeAbortError,
  runtimeError,
  runtimeFail,
  runtimeOk,
  type RuntimeResult,
} from "./result.ts";
import {
  getCapabilitySpec,
  listCapabilities,
  listPackages,
  loadCapabilityRegistrations,
} from "./source-ops.ts";
import { initPlugin } from "./init-plugin.ts";
import { readStateFile } from "./state-store.ts";
import { updateRunRecord, writeLatestReport, type RunRecordPatch } from "./run-store.ts";
import { refreshReuseIndex } from "./reuse-index.ts";
import { renderReuseTemplate, writeRenderedReuseOutput } from "./reuse-run.ts";
import { applyIntegrationChangeOnDisk, detectCapabilitiesOnDisk } from "./extend-store.ts";
import { createRunScaffold } from "./run-scaffold.ts";
import { runDrift, runGenerate, runValidate } from "./pipeline-ops.ts";
import type { IntegrationAuthReference } from "../schema/extend.ts";

/**
 * Public runtime operation registry (docs/deterministic-runtime.md section 7).
 *
 * Every operation has one Zod input schema and one handler returning a
 * {@link RuntimeResult}. Both public surfaces (MCP tools and the repository CLI)
 * dispatch through {@link executeOperation}, so they cannot drift apart.
 */

const packageEnum = z.enum(["wonder-build", "wonder-govern", "wonder-reuse", "wonder-extend"]);
const capabilityRegistrationSchema = z.object({ id: z.string().min(1), kind: capabilityKindSchema });

export interface RegisteredOperation {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  run: (input: unknown) => Promise<RuntimeResult<unknown>>;
}

function op<S extends z.ZodTypeAny>(
  name: string,
  description: string,
  inputSchema: S,
  run: (input: z.infer<S>) => Promise<RuntimeResult<unknown>>,
): RegisteredOperation {
  return { name, description, inputSchema, run: (input) => run(input as z.infer<S>) };
}

const OPERATIONS: readonly RegisteredOperation[] = [
  op("listPackages", "Read canonical package manifests.", z.object({ sourceRoot: z.string().min(1) }), async (input) =>
    runtimeOk(await listPackages(input.sourceRoot)),
  ),

  op(
    "listCapabilities",
    "Read canonical capability manifests.",
    z.object({ sourceRoot: z.string().min(1), packageId: z.string().min(1).optional() }),
    async (input) => runtimeOk(await listCapabilities(input.sourceRoot, input.packageId)),
  ),

  op(
    "getCapabilitySpec",
    "Return the source spec for a capability.",
    z.object({ sourceRoot: z.string().min(1), packageId: z.string().min(1), capabilityId: z.string().min(1) }),
    async (input) => runtimeOk(await getCapabilitySpec(input.sourceRoot, input.packageId, input.capabilityId)),
  ),

  op(
    "initPlugin",
    "Ensure init files and merge state for one package and platform.",
    z.object({
      projectRoot: z.string().min(1),
      packageId: packageEnum,
      platform: platformIdSchema,
      generatedAt: z.string().min(1),
      capabilities: z.array(capabilityRegistrationSchema).optional(),
      sourceRoot: z.string().min(1).optional(),
      catalogRoot: z.string().min(1).optional(),
    }),
    async (input) => {
      const capabilities =
        input.capabilities ??
        (input.sourceRoot !== undefined
          ? await loadCapabilityRegistrations(input.sourceRoot, input.packageId)
          : undefined);
      if (capabilities === undefined) {
        return runtimeFail(
          runtimeError("runtime-missing-capabilities", "initPlugin requires capabilities or sourceRoot", {
            hint: "pass capabilities[] explicitly or sourceRoot to derive them from canonical source",
          }),
        );
      }
      return initPlugin({
        projectRoot: input.projectRoot,
        packageId: input.packageId,
        platform: input.platform,
        capabilities,
        generatedAt: input.generatedAt,
        ...(input.catalogRoot !== undefined ? { catalogRoot: input.catalogRoot } : {}),
      });
    },
  ),

  op(
    "readState",
    "Read and validate .wonder/state.json.",
    z.object({ projectRoot: z.string().min(1), repair: z.boolean().optional() }),
    async (input) => {
      const state = await readStateFile(input.projectRoot, { repair: input.repair ?? false });
      return runtimeOk(state ?? null);
    },
  ),

  op("validateState", "Validate runtime JSON files when present.", z.object({ projectRoot: z.string().min(1) }), async (input) => {
    const issues = await validateRuntime(input.projectRoot);
    return runtimeOk({ ok: issues.length === 0, issues });
  }),

  op(
    "createRunScaffold",
    "Create run directory files for a capability.",
    z.object({
      projectRoot: z.string().min(1),
      packageId: packageEnum,
      capabilityId: z.string().min(1),
      platform: platformIdSchema,
      userRequest: z.string(),
      startedAt: z.string().min(1),
      runId: z.string().min(1),
      operation: z.string().min(1).optional(),
      remoteConsent: z.boolean().optional(),
    }),
    async (input) => {
      const result = await createRunScaffold({
        projectRoot: input.projectRoot,
        packageId: input.packageId,
        capabilityId: input.capabilityId,
        platform: input.platform,
        userRequest: input.userRequest,
        startedAt: input.startedAt,
        runId: input.runId,
        ...(input.operation !== undefined ? { operation: input.operation } : {}),
        ...(input.remoteConsent !== undefined ? { remoteConsent: input.remoteConsent } : {}),
      });
      return runtimeOk(result, {
        paths: { created: result.createdPaths, existing: result.existingPaths, updated: [], skipped: [] },
      });
    },
  ),

  op(
    "updateRunRecord",
    "Apply typed status, output, validation, and error updates.",
    z.object({
      projectRoot: z.string().min(1),
      runId: z.string().min(1),
      patch: z.object({
        status: runStatusSchema.optional(),
        finishedAt: z.string().optional(),
        outputs: z.record(z.unknown()).optional(),
        validation: z.unknown().optional(),
        error: z.unknown().optional(),
      }).strict(),
    }).strict(),
    async (input) => {
      const record = await updateRunRecord(input.projectRoot, input.runId, input.patch as RunRecordPatch);
      return runtimeOk(record, {
        paths: { created: [], existing: [], updated: [`.wonder/runs/${input.runId}/run.json`], skipped: [] },
      });
    },
  ),

  op(
    "updateLatestReport",
    "Write typed build or govern latest report.",
    z.object({
      projectRoot: z.string().min(1),
      kind: z.enum(["build", "govern"]),
      report: z.unknown(),
    }),
    async (input) => {
      if (input.kind === "build") {
        await writeLatestReport(input.projectRoot, "build", buildLatestReportSchema.parse(input.report));
      } else {
        await writeLatestReport(input.projectRoot, "govern", governLatestReportSchema.parse(input.report));
      }
      const path = `.wonder/reports/${input.kind}-latest.json`;
      return runtimeOk({ path }, { paths: { created: [], existing: [], updated: [path], skipped: [] } });
    },
  ),

  op(
    "refreshReuseIndex",
    "Regenerate .wonder/reuse/index.json from asset directories.",
    z.object({ projectRoot: z.string().min(1), generatedAt: z.string().min(1) }),
    async (input) => {
      const result = await refreshReuseIndex(input.projectRoot, input.generatedAt);
      return runtimeOk(result, {
        paths: { created: [], existing: [], updated: [result.indexPath], skipped: result.skippedInvalidAssets },
        warnings: result.skippedInvalidAssets.map((path) => `skipped invalid reuse asset: ${path}`),
      });
    },
  ),

  op(
    "renderReuseOutput",
    "Render a reuse body.md with typed variables.",
    z.object({
      body: z.string(),
      variables: z.record(z.string()),
      requiredVariables: z.array(z.string()).optional(),
      optionalDefaults: z.record(z.string()).optional(),
      projectRoot: z.string().min(1).optional(),
      runId: z.string().min(1).optional(),
      targetPath: z.string().min(1).optional(),
      explicitTargetPath: z.boolean().optional(),
      overwriteConfirmed: z.boolean().optional(),
    }).strict(),
    async (input) => {
      const result = renderReuseTemplate(input.body, input.variables, {
        ...(input.requiredVariables !== undefined ? { requiredVariables: input.requiredVariables } : {}),
        ...(input.optionalDefaults !== undefined ? { optionalDefaults: input.optionalDefaults } : {}),
      });
      if (input.projectRoot === undefined && (input.runId !== undefined || input.targetPath !== undefined)) {
        return runtimeFail(
          runtimeError("runtime-missing-project-root", "renderReuseOutput requires projectRoot when writing output files", {
            hint: "pass projectRoot with runId and/or targetPath, or omit write targets for render-only mode",
          }),
        );
      }

      const writes =
        input.projectRoot !== undefined
          ? await writeRenderedReuseOutput({
              projectRoot: input.projectRoot,
              output: result.output,
              ...(input.runId !== undefined ? { runId: input.runId } : {}),
              ...(input.targetPath !== undefined ? { targetPath: input.targetPath } : {}),
              ...(input.explicitTargetPath !== undefined ? { explicitTargetPath: input.explicitTargetPath } : {}),
              ...(input.overwriteConfirmed !== undefined ? { overwriteConfirmed: input.overwriteConfirmed } : {}),
            })
          : { writtenPaths: [], createdPaths: [], updatedPaths: [] };

      return runtimeOk(
        { ...result, writtenPaths: writes.writtenPaths },
        {
          paths: { created: writes.createdPaths, existing: [], updated: writes.updatedPaths, skipped: [] },
          warnings: result.warnings,
        },
      );
    },
  ),

  op(
    "applyIntegrationChange",
    "Apply typed integration changes without storing secrets.",
    z.object({
      projectRoot: z.string().min(1),
      action: z.enum(["add", "update", "disable", "remove"]),
      integrationId: z.string().min(1),
      auth: z.unknown().optional(),
      metadata: z.record(z.unknown()).optional(),
      customIntegrationConfirmed: z.boolean().optional(),
    }),
    async (input) => {
      const result = await applyIntegrationChangeOnDisk({
        projectRoot: input.projectRoot,
        action: input.action,
        integrationId: input.integrationId,
        ...(input.auth !== undefined ? { auth: input.auth as IntegrationAuthReference } : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
        ...(input.customIntegrationConfirmed !== undefined
          ? { customIntegrationConfirmed: input.customIntegrationConfirmed }
          : {}),
      });
      return runtimeOk(result, {
        paths: { created: [], existing: [], updated: [".wonder/extend/integrations.json"], skipped: [] },
      });
    },
  ),

  op(
    "detectCapabilities",
    "Write typed capability detection snapshot.",
    z.object({
      projectRoot: z.string().min(1),
      generatedAt: z.string().min(1),
      remoteConsent: z.boolean(),
      envPresence: z.record(z.boolean()).optional(),
    }),
    async (input) => {
      const snapshot = await detectCapabilitiesOnDisk({
        projectRoot: input.projectRoot,
        generatedAt: input.generatedAt,
        remoteConsent: input.remoteConsent,
        ...(input.envPresence !== undefined ? { envPresence: input.envPresence } : {}),
      });
      return runtimeOk(snapshot, {
        paths: { created: [], existing: [], updated: [".wonder/extend/capabilities.json"], skipped: [] },
      });
    },
  ),

  op(
    "generate",
    "Regenerate native platform outputs.",
    z.object({
      sourceRoot: z.string().min(1),
      platforms: z.array(platformIdSchema).optional(),
      dryRun: z.boolean().optional(),
    }),
    async (input) =>
      runtimeOk(
        await runGenerate(input.sourceRoot, {
          ...(input.platforms !== undefined ? { platforms: input.platforms } : {}),
          ...(input.dryRun !== undefined ? { dryRun: input.dryRun } : {}),
        }),
      ),
  ),

  op(
    "validate",
    "Validate source, generated output, and runtime state.",
    z.object({
      root: z.string().min(1),
      source: z.boolean().optional(),
      generated: z.boolean().optional(),
      runtime: z.boolean().optional(),
      platforms: z.array(platformIdSchema).optional(),
    }),
    async (input) => {
      const result = await runValidate(input.root, {
        ...(input.source !== undefined ? { source: input.source } : {}),
        ...(input.generated !== undefined ? { generated: input.generated } : {}),
        ...(input.runtime !== undefined ? { runtime: input.runtime } : {}),
        ...(input.platforms !== undefined ? { platforms: input.platforms } : {}),
      });
      return runtimeOk(result);
    },
  ),

  op(
    "drift",
    "Report whether generated output differs from canonical source.",
    z.object({ root: z.string().min(1), platforms: z.array(platformIdSchema).optional() }),
    async (input) => runtimeOk(await runDrift(input.root, input.platforms ?? undefined)),
  ),
];

const OPERATION_MAP = new Map(OPERATIONS.map((operation) => [operation.name, operation]));

export const OPERATION_NAMES: readonly string[] = OPERATIONS.map((operation) => operation.name);

export function listOperations(): readonly RegisteredOperation[] {
  return OPERATIONS;
}

export function getOperation(name: string): RegisteredOperation | undefined {
  return OPERATION_MAP.get(name);
}

/**
 * Validate input against an operation's schema and run it. Unknown operations,
 * invalid input, aborts, and unexpected errors all resolve to a
 * {@link RuntimeResult} failure so public surfaces never crash.
 */
export async function executeOperation(name: string, rawInput: unknown): Promise<RuntimeResult<unknown>> {
  const operation = OPERATION_MAP.get(name);
  if (operation === undefined) {
    return runtimeFail(
      runtimeError("runtime-unknown-operation", `unknown operation: ${name}`, {
        hint: `use one of: ${OPERATION_NAMES.join(", ")}`,
      }),
    );
  }

  const parsed = operation.inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return runtimeFail(
      runtimeError("runtime-invalid-input", `invalid input for ${name}: ${parsed.error.message}`, {
        hint: "check the operation input schema",
      }),
    );
  }

  try {
    return await operation.run(parsed.data);
  } catch (error) {
    if (error instanceof RuntimeAbortError) return runtimeFail(error.detail);
    return runtimeFail(
      runtimeError("runtime-error", error instanceof Error ? error.message : String(error), {
        hint: "unexpected runtime failure",
      }),
    );
  }
}
