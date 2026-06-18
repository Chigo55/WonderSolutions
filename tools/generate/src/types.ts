import type { AdapterConfig } from "../../shared/schema/adapter.ts";
import type { CapabilityManifest } from "../../shared/schema/capability.ts";
import type { GeneratedFile } from "../../shared/schema/generated.ts";
import type { PackageManifest, CapabilityId } from "../../shared/schema/package.ts";
import type { PlatformId } from "../../shared/platform/names.ts";

export interface CapabilitySource {
  manifestPath: string;
  instructionPath: string;
  manifest: CapabilityManifest;
  instruction: string;
}

export interface PackageSource {
  manifestPath: string;
  manifest: PackageManifest;
  specs: Record<CapabilityId, string>;
  capabilities: CapabilitySource[];
}

export interface AdapterSource {
  configPath: string;
  templateRoot: string;
  config: AdapterConfig;
  templates: Record<string, string>;
}

export interface SourceGraph {
  packages: PackageSource[];
  adapters: Record<PlatformId, AdapterSource>;
  sourceTextByPath: Map<string, string>;
}

export interface WriteOptions {
  dryRun: boolean;
}

export interface WriteReport {
  written: string[];
  skipped: string[];
}

export type ComputedGeneratedFile = GeneratedFile;
