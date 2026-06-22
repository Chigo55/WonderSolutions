import { loadSource } from "../../generate/src/load-source.ts";
import type { PackageSource, SourceGraph } from "../../generate/src/types.ts";
import { RuntimeAbortError, runtimeError } from "./result.ts";
import type { CapabilityRegistration } from "./init-plugin-state.ts";

/**
 * Source-bound read operations (docs/deterministic-runtime.md section 7:
 * listPackages, listCapabilities, getCapabilitySpec). These read the canonical
 * source graph and therefore run where `packages/` exists (the generator repo or a
 * bundled plugin), not in an arbitrary target project.
 */

export interface PackageSummary {
  id: string;
  displayName: string;
  version: string;
  userJob: string;
  description: string;
  capabilityOrder: readonly string[];
}

export interface CapabilitySummary {
  packageId: string;
  id: string;
  title: string;
  kind: string;
  description: string;
  requires: readonly string[];
}

export interface CapabilitySpec {
  packageId: string;
  capabilityId: string;
  title: string;
  kind: string;
  description: string;
  requires: readonly string[];
  instruction: string;
  spec: string;
}

function summarizePackage(source: PackageSource): PackageSummary {
  return {
    id: source.manifest.id,
    displayName: source.manifest.displayName,
    version: source.manifest.version,
    userJob: source.manifest.userJob,
    description: source.manifest.description,
    capabilityOrder: source.manifest.capabilityOrder,
  };
}

function findPackageOrAbort(graph: SourceGraph, packageId: string): PackageSource {
  const found = graph.packages.find((entry) => entry.manifest.id === packageId);
  if (found === undefined) {
    throw new RuntimeAbortError(
      runtimeError("runtime-unknown-package", `unknown package: ${packageId}`, {
        hint: "use one of the canonical wonder-* package ids",
      }),
    );
  }
  return found;
}

/** List canonical package manifests. */
export async function listPackages(sourceRoot: string): Promise<PackageSummary[]> {
  const graph = await loadSource(sourceRoot);
  return graph.packages.map(summarizePackage);
}

/** List canonical capability manifests, optionally filtered to one package. */
export async function listCapabilities(sourceRoot: string, packageId?: string): Promise<CapabilitySummary[]> {
  const graph = await loadSource(sourceRoot);
  const packages = packageId === undefined ? graph.packages : [findPackageOrAbort(graph, packageId)];

  return packages.flatMap((source) =>
    source.capabilities.map((capability) => ({
      packageId: source.manifest.id,
      id: capability.manifest.id,
      title: capability.manifest.title,
      kind: capability.manifest.kind,
      description: capability.manifest.description,
      requires: capability.manifest.requires,
    })),
  );
}

/** Return the source spec, instruction, and manifest for one capability. */
export async function getCapabilitySpec(
  sourceRoot: string,
  packageId: string,
  capabilityId: string,
): Promise<CapabilitySpec> {
  const graph = await loadSource(sourceRoot);
  const source = findPackageOrAbort(graph, packageId);
  const capability = source.capabilities.find((entry) => entry.manifest.id === capabilityId);
  const spec = source.specs[capabilityId];

  if (capability === undefined || spec === undefined) {
    throw new RuntimeAbortError(
      runtimeError("runtime-unknown-capability", `unknown capability: ${packageId}.${capabilityId}`, {
        hint: "use a capability id declared in the package manifest capabilityOrder",
      }),
    );
  }

  return {
    packageId,
    capabilityId,
    title: capability.manifest.title,
    kind: capability.manifest.kind,
    description: capability.manifest.description,
    requires: capability.manifest.requires,
    instruction: capability.instruction,
    spec,
  };
}

/** Derive `initPlugin` capability registrations (id + kind) from canonical source. */
export async function loadCapabilityRegistrations(
  sourceRoot: string,
  packageId: string,
): Promise<CapabilityRegistration[]> {
  const graph = await loadSource(sourceRoot);
  const source = findPackageOrAbort(graph, packageId);
  return source.capabilities.map((capability) => ({
    id: capability.manifest.id,
    kind: capability.manifest.kind,
  }));
}
