import type { PlatformId } from "../platform/names.ts";
import type { CapabilityId, PackageId } from "../schema/package.ts";
import { RuntimeAbortError, runtimeError } from "./result.ts";
import { createBuildRunScaffold } from "./build-run.ts";
import { createGovernRunScaffold } from "./govern-run.ts";
import { REUSE_OPERATIONS, createReuseRunScaffold, type ReuseOperation } from "./reuse-run.ts";
import {
  CONFIGURE_INTEGRATION_OPERATIONS,
  DISCOVER_COMPANION_OPERATIONS,
  createConfigureIntegrationRunScaffold,
  createDetectCapabilitiesRunScaffold,
  createDiscoverCompanionsRunScaffold,
  type ConfigureIntegrationOperation,
  type DiscoverCompanionOperation,
} from "./extend-run.ts";

/**
 * createRunScaffold dispatch (docs/deterministic-runtime.md section 7). Routes a
 * single uniform request to the per-package, per-capability scaffold creator,
 * validating the capability-specific fields (`operation`, `remoteConsent`).
 */

export interface CreateRunScaffoldOptions {
  projectRoot: string;
  packageId: PackageId;
  capabilityId: CapabilityId;
  platform: PlatformId;
  userRequest: string;
  startedAt: string;
  runId: string;
  /** Required for wonder-reuse and wonder-extend discover/configure scaffolds. */
  operation?: string;
  /** Used by wonder-extend detect-capabilities (defaults to false). */
  remoteConsent?: boolean;
}

export interface RunScaffoldResult {
  runId: string;
  runDir: string;
  files: string[];
  createdPaths: string[];
  existingPaths: string[];
}

function abort(code: string, message: string, hint: string): never {
  throw new RuntimeAbortError(runtimeError(code, message, { hint }));
}

function requireOperation<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  capability: string,
): T {
  if (value === undefined) {
    abort("runtime-missing-operation", `${capability} run scaffold requires an operation`, `pass operation: one of ${allowed.join(", ")}`);
  }
  if (!(allowed as readonly string[]).includes(value)) {
    abort("runtime-invalid-operation", `unsupported operation for ${capability}: ${value}`, `use one of ${allowed.join(", ")}`);
  }
  return value as T;
}

export async function createRunScaffold(options: CreateRunScaffoldOptions): Promise<RunScaffoldResult> {
  const base = {
    projectRoot: options.projectRoot,
    runId: options.runId,
    platform: options.platform,
    userRequest: options.userRequest,
    startedAt: options.startedAt,
  };

  if (options.packageId === "wonder-build") {
    if (!["create", "modify", "review"].includes(options.capabilityId)) {
      abort("runtime-no-run-scaffold", `wonder-build.${options.capabilityId} has no run scaffold`, "use create, modify, or review");
    }
    return createBuildRunScaffold({ ...base, capabilityId: options.capabilityId });
  }

  if (options.packageId === "wonder-govern") {
    return createGovernRunScaffold({ ...base, capabilityId: options.capabilityId });
  }

  if (options.packageId === "wonder-reuse") {
    const operation: ReuseOperation = requireOperation(options.operation, REUSE_OPERATIONS, "wonder-reuse");
    return createReuseRunScaffold({ ...base, capabilityId: options.capabilityId, operation });
  }

  if (options.packageId === "wonder-extend") {
    if (options.capabilityId === "discover-companions") {
      const operation: DiscoverCompanionOperation = requireOperation(
        options.operation,
        DISCOVER_COMPANION_OPERATIONS,
        "wonder-extend.discover-companions",
      );
      return createDiscoverCompanionsRunScaffold({ ...base, operation });
    }
    if (options.capabilityId === "configure-integration") {
      const operation: ConfigureIntegrationOperation = requireOperation(
        options.operation,
        CONFIGURE_INTEGRATION_OPERATIONS,
        "wonder-extend.configure-integration",
      );
      return createConfigureIntegrationRunScaffold({ ...base, operation });
    }
    if (options.capabilityId === "detect-capabilities") {
      return createDetectCapabilitiesRunScaffold({ ...base, remoteConsent: options.remoteConsent ?? false });
    }
    abort("runtime-no-run-scaffold", `wonder-extend.${options.capabilityId} has no run scaffold`, "use a workflow capability");
  }

  abort("runtime-unknown-package", `unknown package: ${String(options.packageId)}`, "use a canonical wonder-* package id");
}
