import { z } from "zod";

export const REQUIRED_PACKAGES = {
  "wonder-build": ["init", "create", "modify", "review"],
  "wonder-govern": ["init", "define-standards", "check-policy"],
  "wonder-reuse": ["init", "manage-assets", "generate-output", "promote-asset"],
  "wonder-extend": [
    "init",
    "discover-companions",
    "configure-integration",
    "detect-capabilities",
  ],
} as const;

export type PackageId = keyof typeof REQUIRED_PACKAGES;

export type CapabilityId = string;

export const PACKAGE_IDS = Object.keys(REQUIRED_PACKAGES) as PackageId[];

export const PACKAGE_ID_PATTERN = /^wonder-[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const CAPABILITY_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const packageIdSchema = z.string().regex(PACKAGE_ID_PATTERN);
export const capabilityIdSchema = z.string().regex(CAPABILITY_ID_PATTERN);

const uniqueCapabilityOrderSchema = z.array(capabilityIdSchema).superRefine((items, context) => {
  const seen = new Set<string>();
  for (const [index, item] of items.entries()) {
    if (seen.has(item)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `duplicate capability id '${item}'`,
        path: [index],
      });
    }
    seen.add(item);
  }
});

export const packageManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: packageIdSchema,
    displayName: z.string().min(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    userJob: z.enum(["Build", "Govern", "Reuse", "Extend"]),
    description: z.string().min(1),
    capabilityOrder: uniqueCapabilityOrderSchema,
  })
  .strict();

export type PackageManifest = z.infer<typeof packageManifestSchema>;

export function requiredCapabilityIds(packageId: PackageId): readonly string[] {
  return REQUIRED_PACKAGES[packageId];
}

export function validatePackageManifestForDirectory(
  manifest: unknown,
  directoryName: string,
  capabilityDirectories: readonly string[] = [],
): PackageManifest {
  const parsed = packageManifestSchema.parse(manifest);

  if (parsed.id !== directoryName) {
    throw new Error(`package manifest id must match directory name: ${directoryName}`);
  }

  if (capabilityDirectories.length > 0) {
    const declared = new Set(parsed.capabilityOrder);
    const discovered = new Set(capabilityDirectories);
    const missing = parsed.capabilityOrder.filter((capabilityId) => !discovered.has(capabilityId));
    const extra = capabilityDirectories.filter((capabilityId) => !declared.has(capabilityId));

    if (missing.length > 0 || extra.length > 0) {
      throw new Error(
        `capabilityOrder must match capability directories: missing=[${missing.join(
          ", ",
        )}] extra=[${extra.join(", ")}]`,
      );
    }
  }

  return parsed;
}
