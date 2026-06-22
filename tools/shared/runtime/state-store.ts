import { join } from "node:path";
import { ZodError } from "zod";
import { runtimeStateSchema, type WonderState } from "../schema/runtime.ts";
import { RuntimeAbortError, runtimeError } from "./result.ts";
import { readJsonIfPresent, writeJsonFile } from "./io/json.ts";

/**
 * Disk round-trip for `.wonder/state.json` (docs/deterministic-runtime.md section 4:
 * machine-managed state, typed merge only, preserve unknown plugin sections).
 *
 * These are throwing helpers; public operations wrap them with
 * {@link import("./result.ts").runRuntimeOperation}.
 */

export const STATE_RELATIVE_PATH = ".wonder/state.json";

export interface ReadStateOptions {
  repair?: boolean;
}

/**
 * Read and validate `.wonder/state.json`.
 *
 * - Missing -> `undefined`.
 * - Present but invalid JSON or schema -> aborts with a repair hint, unless
 *   `repair: true`, in which case it returns `undefined`.
 */
export async function readStateFile(
  projectRoot: string,
  options: ReadStateOptions = {},
): Promise<WonderState | undefined> {
  const raw = await readJsonIfPresent(join(projectRoot, STATE_RELATIVE_PATH), STATE_RELATIVE_PATH, options);
  if (raw === undefined) return undefined;

  try {
    return runtimeStateSchema.parse(raw);
  } catch (error) {
    if (options.repair) return undefined;
    throw new RuntimeAbortError(
      runtimeError(
        "runtime-invalid-state",
        `invalid runtime state in ${STATE_RELATIVE_PATH}: ${error instanceof ZodError ? error.message : String(error)}`,
        {
          path: STATE_RELATIVE_PATH,
          hint: "repair the state file to match the runtime state schema before retrying",
        },
      ),
    );
  }
}

/** Validate and write `.wonder/state.json` as canonical runtime JSON. */
export async function writeStateFile(projectRoot: string, state: WonderState): Promise<void> {
  await writeJsonFile(join(projectRoot, STATE_RELATIVE_PATH), runtimeStateSchema.parse(state));
}
