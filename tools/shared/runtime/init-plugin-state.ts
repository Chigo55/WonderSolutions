import type { CapabilityKind } from "../schema/capability.ts";
import type { CapabilityId, PackageId } from "../schema/package.ts";
import {
  runtimeStateSchema,
  type PlatformInitState,
  type PluginState,
  type RuntimeCapability,
  type WonderState,
} from "../schema/runtime.ts";
import { PLATFORMS, platformIdSchema, surfaceName, type PlatformId } from "../platform/names.ts";

export interface CapabilityRegistration {
  id: CapabilityId;
  kind: CapabilityKind;
}

export interface InitPluginStateOptions {
  state?: WonderState;
  packageId: PackageId | string;
  platform: PlatformId;
  capabilities: readonly CapabilityRegistration[];
}

function defaultPlatformState(): Record<PlatformId, PlatformInitState> {
  return {
    claude: { initialized: false },
    codex: { initialized: false },
    antigravity: { initialized: false },
  };
}

function mergePlatformState(
  existing: PluginState["platforms"] | undefined,
  currentPlatform: PlatformId,
): Record<PlatformId, PlatformInitState> {
  const next = defaultPlatformState();

  for (const platform of PLATFORMS) {
    next[platform] = {
      initialized: existing?.[platform]?.initialized ?? false,
    };
  }

  next[currentPlatform] = { initialized: true };
  return next;
}

function capabilitySurface(packageId: string, capabilityId: string): RuntimeCapability["surfaces"] {
  return {
    claude: surfaceName("claude", packageId, capabilityId),
    codex: surfaceName("codex", packageId, capabilityId),
    antigravity: surfaceName("antigravity", packageId, capabilityId),
  };
}

function buildCapabilityRegistry(
  packageId: string,
  capabilities: readonly CapabilityRegistration[],
): Record<string, RuntimeCapability> {
  const registry: Record<string, RuntimeCapability> = {};

  for (const capability of capabilities) {
    registry[capability.id] = {
      kind: capability.kind,
      surfaces: capabilitySurface(packageId, capability.id),
    };
  }

  return registry;
}

export function initPluginState(options: InitPluginStateOptions): WonderState {
  const platform = platformIdSchema.parse(options.platform);
  const state = options.state ?? { schemaVersion: 1, plugins: {} };
  const packageId = options.packageId;
  const existingPlugin = state.plugins[packageId];

  const next: WonderState = {
    schemaVersion: 1,
    plugins: {
      ...state.plugins,
      [packageId]: {
        initialized: true,
        capabilities: buildCapabilityRegistry(packageId, options.capabilities),
        platforms: mergePlatformState(existingPlugin?.platforms, platform),
      },
    },
  };

  return runtimeStateSchema.parse(next);
}
