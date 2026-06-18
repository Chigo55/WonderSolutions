import { z } from "zod";
import { capabilityIdSchema } from "./package.ts";

export const CAPABILITY_KINDS = ["workflow", "operation"] as const;

export const ABSTRACT_ACTIONS = [
  "read",
  "search",
  "write",
  "edit",
  "run-command",
  "delegate",
  "web-research",
  "ask-user",
  "report",
  "manage-state",
] as const;

export const capabilityKindSchema = z.enum(CAPABILITY_KINDS);
export const abstractActionSchema = z.enum(ABSTRACT_ACTIONS);

const requiresSchema = z.array(abstractActionSchema).min(1).superRefine((items, context) => {
  const seen = new Set<string>();
  for (const [index, item] of items.entries()) {
    if (seen.has(item)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `duplicate abstract action '${item}'`,
        path: [index],
      });
    }
    seen.add(item);
  }
});

export const capabilityManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: capabilityIdSchema,
    title: z.string().min(1),
    kind: capabilityKindSchema,
    description: z.string().min(1),
    requires: requiresSchema,
  })
  .strict();

export type CapabilityKind = z.infer<typeof capabilityKindSchema>;
export type AbstractAction = z.infer<typeof abstractActionSchema>;
export type CapabilityManifest = z.infer<typeof capabilityManifestSchema>;

export const FORBIDDEN_INSTRUCTION_TERMS = [
  "Claude",
  "Codex",
  "Antigravity",
  "shell_command",
  ".claude/",
  ".codex/",
  ".agents/",
] as const;

export function validateCapabilityManifestForDirectory(
  manifest: unknown,
  directoryName: string,
): CapabilityManifest {
  const parsed = capabilityManifestSchema.parse(manifest);

  if (parsed.id !== directoryName) {
    throw new Error(`capability manifest id must match directory name: ${directoryName}`);
  }

  return parsed;
}

export function findForbiddenInstructionTerms(instruction: string): string[] {
  return FORBIDDEN_INSTRUCTION_TERMS.filter((term) => instruction.includes(term));
}

export function validateInstructionBody(instruction: string): string {
  const forbiddenTerms = findForbiddenInstructionTerms(instruction);

  if (forbiddenTerms.length > 0) {
    throw new Error(
      `platform-specific instruction terms are forbidden: ${forbiddenTerms.join(", ")}`,
    );
  }

  return instruction;
}
