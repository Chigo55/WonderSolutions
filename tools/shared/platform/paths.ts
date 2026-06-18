import type { OutputKind } from "../schema/adapter.ts";
import type { CapabilityId, PackageId } from "../schema/package.ts";
import type { PlatformId } from "./names.ts";

function requirePackageId(packageId: PackageId | string | undefined, kind: OutputKind): string {
  if (!packageId) {
    throw new Error(`${kind} output path requires package id`);
  }
  return packageId;
}

function requireCapabilityId(capabilityId: CapabilityId | string | undefined, kind: OutputKind): string {
  if (!capabilityId) {
    throw new Error(`${kind} output path requires capability id`);
  }
  return capabilityId;
}

export function outputPathFor(
  platform: PlatformId,
  kind: OutputKind,
  packageId?: PackageId | string,
  capabilityId?: CapabilityId | string,
): string {
  if (kind === "marketplace") {
    if (platform === "claude") return ".claude-plugin/marketplace.json";
    if (platform === "codex") return ".agents/plugins/marketplace.json";
    throw new Error("antigravity does not define a repository marketplace output");
  }

  const pkg = requirePackageId(packageId, kind);

  if (kind === "plugin-manifest") {
    if (platform === "claude") return `plugins/claude/${pkg}/.claude-plugin/plugin.json`;
    if (platform === "codex") return `plugins/codex/${pkg}/.codex-plugin/plugin.json`;
    return `.agents/plugins/${pkg}/plugin.json`;
  }

  const cap = requireCapabilityId(capabilityId, kind);

  if (kind === "repo-skill") {
    if (platform !== "codex") {
      throw new Error(`${platform} does not define repo-local skill output`);
    }
    return `.agents/skills/${pkg}-${cap}/SKILL.md`;
  }

  if (platform === "claude") return `plugins/claude/${pkg}/skills/${cap}/SKILL.md`;
  if (platform === "codex") return `plugins/codex/${pkg}/skills/${pkg}-${cap}/SKILL.md`;
  return `.agents/plugins/${pkg}/skills/${cap}/SKILL.md`;
}
