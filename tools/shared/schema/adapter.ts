import { z } from "zod";
import { platformIdSchema } from "../platform/names.ts";

export const outputScopeSchema = z.enum(["repository", "package", "capability"]);
export const outputKindSchema = z.enum([
  "marketplace",
  "plugin-manifest",
  "repo-skill",
  "plugin-skill",
]);
export const textKindSchema = z.enum(["json", "markdown"]);
export const headerKindSchema = z.enum(["none", "html-comment"]);
export const surfaceNameRuleSchema = z.enum([
  "claude-command",
  "codex-skill",
  "antigravity-workflow-id",
]);

export type OutputScope = z.infer<typeof outputScopeSchema>;
export type OutputKind = z.infer<typeof outputKindSchema>;
export type TextKind = z.infer<typeof textKindSchema>;
export type HeaderKind = z.infer<typeof headerKindSchema>;
export type SurfaceNameRule = z.infer<typeof surfaceNameRuleSchema>;

function isAbsolutePath(path: string): boolean {
  return /^(?:[a-zA-Z]:[\\/]|[\\/]{1,2})/.test(path);
}

function hasParentSegment(path: string): boolean {
  return path.split(/[\\/]+/).includes("..");
}

export const relativePathSchema = z.string().min(1).superRefine((path, context) => {
  if (isAbsolutePath(path)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "path cannot be absolute",
    });
  }

  if (hasParentSegment(path)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "path cannot contain parent directory segments",
    });
  }
});

export const adapterOutputSchema = z
  .object({
    kind: outputKindSchema,
    scope: outputScopeSchema,
    path: relativePathSchema,
    template: relativePathSchema,
    textKind: textKindSchema,
    header: headerKindSchema,
  })
  .strict()
  .superRefine((output, context) => {
    if (output.textKind === "json" && output.header !== "none") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "json output must use header none",
        path: ["header"],
      });
    }
  });

export const adapterConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    platform: platformIdSchema,
    surfaceNameRule: surfaceNameRuleSchema,
    outputs: z.array(adapterOutputSchema).min(1),
  })
  .strict();

export type AdapterOutput = z.infer<typeof adapterOutputSchema>;
export type AdapterConfig = z.infer<typeof adapterConfigSchema>;
