import { z } from "zod";
import { platformIdSchema } from "../platform/names.ts";
import {
  headerKindSchema,
  outputKindSchema,
  relativePathSchema,
  textKindSchema,
} from "./adapter.ts";
import { capabilityIdSchema, packageIdSchema } from "./package.ts";

export const generatedFileSchema = z
  .object({
    platform: platformIdSchema,
    kind: outputKindSchema,
    packageId: packageIdSchema.optional(),
    capabilityId: capabilityIdSchema.optional(),
    path: relativePathSchema,
    content: z.string(),
    sourceFiles: z.array(relativePathSchema).min(1),
    sourceHash: z.string().min(1),
    textKind: textKindSchema,
    header: headerKindSchema,
  })
  .strict()
  .superRefine((file, context) => {
    if (file.textKind === "json" && file.header !== "none") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "json output must use header none",
        path: ["header"],
      });
    }
  });

export type GeneratedFile = z.infer<typeof generatedFileSchema>;
