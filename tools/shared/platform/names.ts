import { z } from "zod";
import type { CapabilityId, PackageId } from "../schema/package.ts";

export const PLATFORMS = ["claude", "codex", "antigravity"] as const;

export const platformIdSchema = z.enum(PLATFORMS);

export type PlatformId = z.infer<typeof platformIdSchema>;

export function canonicalId(packageId: PackageId | string, capabilityId: CapabilityId | string): string {
  return `${packageId}.${capabilityId}`;
}

export function surfaceName(
  platform: PlatformId,
  packageId: PackageId | string,
  capabilityId: CapabilityId | string,
): string {
  if (platform === "claude") return `/${packageId}:${capabilityId}`;
  if (platform === "codex") return `$${packageId}-${capabilityId}`;
  return canonicalId(packageId, capabilityId);
}
