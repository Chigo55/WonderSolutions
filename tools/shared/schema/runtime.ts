import { z } from "zod";
import { platformIdSchema } from "../platform/names.ts";
import { capabilityKindSchema } from "./capability.ts";
import { capabilityIdSchema, packageIdSchema } from "./package.ts";

export const platformSurfacesSchema = z
  .object({
    claude: z.string().min(1),
    codex: z.string().min(1),
    antigravity: z.string().min(1),
  })
  .strict();

export const platformInitStateSchema = z
  .object({
    initialized: z.boolean(),
  })
  .strict();

export const platformInitStatesSchema = z
  .object({
    claude: platformInitStateSchema,
    codex: platformInitStateSchema,
    antigravity: platformInitStateSchema,
  })
  .strict();

export const runtimeCapabilitySchema = z
  .object({
    kind: capabilityKindSchema,
    surfaces: platformSurfacesSchema,
  })
  .strict();

export const pluginStateSchema = z
  .object({
    initialized: z.boolean(),
    capabilities: z.record(capabilityIdSchema, runtimeCapabilitySchema),
    platforms: platformInitStatesSchema,
  })
  .strict();

export const runtimeStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    plugins: z.record(packageIdSchema, pluginStateSchema),
  })
  .strict();

export type PlatformInitState = z.infer<typeof platformInitStateSchema>;
export type RuntimeCapability = z.infer<typeof runtimeCapabilitySchema>;
export type PluginState = z.infer<typeof pluginStateSchema>;
export type WonderState = z.infer<typeof runtimeStateSchema>;
export type RuntimePlatformId = z.infer<typeof platformIdSchema>;
