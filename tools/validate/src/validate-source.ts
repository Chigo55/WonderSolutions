import { loadSource } from "../../generate/src/load-source.ts";
import type { ValidationIssue } from "./types.ts";

export async function validateSource(root: string): Promise<ValidationIssue[]> {
  try {
    await loadSource(root);
    return [];
  } catch (error) {
    return [
      {
        code: "source-invalid",
        message: error instanceof Error ? error.message : String(error),
        hint: "repair canonical package, capability, adapter, or catalog source",
      },
    ];
  }
}
