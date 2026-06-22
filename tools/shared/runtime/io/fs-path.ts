import { stat } from "node:fs/promises";

/**
 * Whether a path exists on disk. Centralizes the `ENOENT`-vs-rethrow pattern that
 * was previously duplicated across every `*-init.ts` / `*-run.ts` module.
 */
export async function pathExists(absolutePath: string): Promise<boolean> {
  try {
    await stat(absolutePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}
