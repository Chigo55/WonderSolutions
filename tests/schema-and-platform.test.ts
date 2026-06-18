import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ZodError } from "zod";
import {
  REQUIRED_PACKAGES,
  packageManifestSchema,
  validatePackageManifestForDirectory,
} from "../tools/shared/schema/package.ts";
import {
  ABSTRACT_ACTIONS,
  capabilityManifestSchema,
  validateCapabilityManifestForDirectory,
  validateInstructionBody,
} from "../tools/shared/schema/capability.ts";
import { canonicalId, surfaceName } from "../tools/shared/platform/names.ts";
import { outputPathFor } from "../tools/shared/platform/paths.ts";

describe("required package contract", () => {
  it("keeps the implementation-design package and capability order", () => {
    assert.deepEqual(REQUIRED_PACKAGES, {
      "wonder-build": ["init", "create", "modify", "review"],
      "wonder-govern": ["init", "define-standards", "check-policy"],
      "wonder-reuse": ["init", "manage-assets", "generate-output", "promote-asset"],
      "wonder-extend": [
        "init",
        "discover-companions",
        "configure-integration",
        "detect-capabilities",
      ],
    });
  });
});

describe("package manifest schema", () => {
  const manifest = {
    schemaVersion: 1,
    id: "wonder-build",
    displayName: "Wonder Build",
    version: "0.1.0",
    userJob: "Build",
    description: "Structure task creation, modification, and review.",
    capabilityOrder: ["init", "create", "modify", "review"],
  };

  it("accepts a strict valid package manifest", () => {
    assert.equal(packageManifestSchema.parse(manifest).id, "wonder-build");
  });

  it("rejects unknown top-level keys", () => {
    assert.throws(() => packageManifestSchema.parse({ ...manifest, extra: true }), ZodError);
  });

  it("requires id to match the package directory", () => {
    assert.throws(
      () => validatePackageManifestForDirectory(manifest, "wonder-reuse", manifest.capabilityOrder),
      /id must match directory name/,
    );
  });

  it("requires capabilityOrder to match capability directories", () => {
    assert.throws(
      () => validatePackageManifestForDirectory(manifest, "wonder-build", ["init", "create"]),
      /capabilityOrder must match capability directories/,
    );
  });
});

describe("capability manifest schema", () => {
  const manifest = {
    schemaVersion: 1,
    id: "create",
    title: "Create Task",
    kind: "workflow",
    description: "Create a structured task from a user request.",
    requires: ["read", "write", "delegate", "run-command", "report"],
  };

  it("uses the required abstract action vocabulary", () => {
    assert.deepEqual(ABSTRACT_ACTIONS, [
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
    ]);
  });

  it("accepts a strict valid capability manifest", () => {
    assert.equal(capabilityManifestSchema.parse(manifest).kind, "workflow");
  });

  it("rejects duplicate abstract actions", () => {
    assert.throws(
      () => capabilityManifestSchema.parse({ ...manifest, requires: ["read", "read"] }),
      ZodError,
    );
  });

  it("requires id to match the capability directory", () => {
    assert.throws(
      () => validateCapabilityManifestForDirectory(manifest, "modify"),
      /id must match directory name/,
    );
  });

  it("rejects platform-specific instruction bodies", () => {
    assert.throws(
      () => validateInstructionBody("Call Codex shell_command and write .agents/skills."),
      /platform-specific instruction/,
    );
  });
});

describe("platform naming and output paths", () => {
  it("derives canonical and platform surface names", () => {
    assert.equal(canonicalId("wonder-build", "create"), "wonder-build.create");
    assert.equal(surfaceName("claude", "wonder-build", "create"), "/wonder-build:create");
    assert.equal(surfaceName("codex", "wonder-build", "create"), "$wonder-build-create");
    assert.equal(surfaceName("antigravity", "wonder-build", "create"), "wonder-build.create");
  });

  it("computes native generated output paths", () => {
    assert.equal(
      outputPathFor("claude", "plugin-manifest", "wonder-build"),
      "plugins/claude/wonder-build/.claude-plugin/plugin.json",
    );
    assert.equal(
      outputPathFor("codex", "repo-skill", "wonder-build", "create"),
      ".agents/skills/wonder-build-create/SKILL.md",
    );
    assert.equal(
      outputPathFor("antigravity", "plugin-skill", "wonder-build", "create"),
      ".agents/plugins/wonder-build/skills/create/SKILL.md",
    );
  });
});
