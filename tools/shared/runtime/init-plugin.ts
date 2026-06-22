import {
  RuntimeAbortError,
  runtimeError,
  runtimeOk,
  runRuntimeOperation,
  type RuntimeResult,
} from "./result.ts";
import type { PlatformId } from "../platform/names.ts";
import type { PackageId } from "../schema/package.ts";
import type { WonderState } from "../schema/runtime.ts";
import { initPluginState, type CapabilityRegistration } from "./init-plugin-state.ts";
import { readStateFile, writeStateFile, STATE_RELATIVE_PATH } from "./state-store.ts";
import { ensureBuildInitFiles } from "./build-init.ts";
import { ensureGovernInitFiles } from "./govern-init.ts";
import { ensureReuseInitFiles } from "./reuse-init.ts";
import { ensureExtendInitFiles } from "./extend-init.ts";

/**
 * initPlugin (docs/deterministic-runtime.md section 7): ensure a package's init
 * files and merge `.wonder/state.json` for one package and platform. Combines the
 * per-package `ensure*InitFiles` seeding with the typed state merge and reports
 * created / existing / updated paths (section 8).
 */

export interface InitPluginOptions {
  projectRoot: string;
  packageId: PackageId;
  platform: PlatformId;
  capabilities: readonly CapabilityRegistration[];
  /** Timestamp for files that record one (for example the reuse index). */
  generatedAt: string;
  /** Required for wonder-extend: directory holding the companion/integration catalogs. */
  catalogRoot?: string;
}

export interface InitPluginData {
  state: WonderState;
}

interface NormalizedInitFiles {
  created: string[];
  existing: string[];
  skippedAssets: string[];
}

async function ensureInitFiles(options: InitPluginOptions): Promise<NormalizedInitFiles> {
  switch (options.packageId) {
    case "wonder-build": {
      const result = await ensureBuildInitFiles(options.projectRoot);
      return { created: result.createdPaths, existing: result.existingPaths, skippedAssets: [] };
    }
    case "wonder-govern": {
      const result = await ensureGovernInitFiles(options.projectRoot);
      return { created: result.createdPaths, existing: result.existingPaths, skippedAssets: [] };
    }
    case "wonder-reuse": {
      const result = await ensureReuseInitFiles(options.projectRoot, options.generatedAt);
      return {
        created: result.createdPaths,
        existing: result.existingPaths,
        skippedAssets: result.skippedInvalidAssets,
      };
    }
    case "wonder-extend": {
      if (options.catalogRoot === undefined) {
        throw new RuntimeAbortError(
          runtimeError("runtime-missing-catalog", "wonder-extend init requires a catalog root", {
            hint: "pass catalogRoot pointing to the bundled companion/integration catalogs",
          }),
        );
      }
      const result = await ensureExtendInitFiles(options.projectRoot, options.catalogRoot, options.generatedAt);
      return { created: result.createdPaths, existing: result.existingPaths, skippedAssets: [] };
    }
    default: {
      throw new RuntimeAbortError(
        runtimeError("runtime-unknown-package", `unknown package: ${String(options.packageId)}`, {
          hint: "use one of the canonical wonder-* package ids",
        }),
      );
    }
  }
}

export async function initPlugin(options: InitPluginOptions): Promise<RuntimeResult<InitPluginData>> {
  return runRuntimeOperation(async () => {
    const files = await ensureInitFiles(options);

    const existing = await readStateFile(options.projectRoot);
    const merged = initPluginState({
      ...(existing !== undefined ? { state: existing } : {}),
      packageId: options.packageId,
      platform: options.platform,
      capabilities: options.capabilities,
    });
    const stateExisted = existing !== undefined;
    await writeStateFile(options.projectRoot, merged);

    return runtimeOk(
      { state: merged },
      {
        paths: {
          created: [...files.created, ...(stateExisted ? [] : [STATE_RELATIVE_PATH])],
          existing: files.existing,
          updated: stateExisted ? [STATE_RELATIVE_PATH] : [],
          skipped: files.skippedAssets,
        },
        warnings: files.skippedAssets.map((path) => `skipped invalid reuse asset: ${path}`),
      },
    );
  });
}
