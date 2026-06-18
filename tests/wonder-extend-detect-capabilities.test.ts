import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  validateCapabilityManifestForDirectory,
  validateInstructionBody,
} from "../tools/shared/schema/capability.ts";
import {
  detectCapabilitiesArtifactsSchema,
  detectedCapabilitySchema,
  extendCapabilitiesSnapshotSchema,
  extendIntegrationsSnapshotSchema,
} from "../tools/shared/schema/extend.ts";
import {
  assertCapabilitySnapshotHasNoSecrets,
  assertRemoteChecksAllowed,
  canUseExtendCapability,
  createDetectCapabilitiesRunScaffold,
  detectCapabilitiesFromConfiguredIntegrations,
} from "../tools/shared/runtime/extend-run.ts";

const root = process.cwd();

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(root, path), "utf8"));
}

describe("wonder-extend.detect-capabilities source", () => {
  it("defines metadata and platform-neutral instruction", async () => {
    const manifest = validateCapabilityManifestForDirectory(
      await readJson("packages/wonder-extend/capabilities/detect-capabilities/capability.json"),
      "detect-capabilities",
    );
    const instruction = validateInstructionBody(
      await readFile(
        join(root, "packages/wonder-extend/capabilities/detect-capabilities/instruction.md"),
        "utf8",
      ),
    );

    assert.deepEqual(manifest, {
      schemaVersion: 1,
      id: "detect-capabilities",
      title: "Detect Capabilities",
      kind: "workflow",
      description: "Determine currently available external capabilities.",
      requires: ["read", "search", "write", "run-command", "ask-user", "report", "manage-state"],
    });
    assert.match(
      instruction,
      /scope[\s\S]*plan-detection[\s\S]*detect-local[\s\S]*optionally-detect-remote[\s\S]*write-status[\s\S]*report/,
    );
    assert.match(instruction, /detection-results\.json/);
    assert.match(instruction, /Do not perform remote checks without explicit user consent/i);
    assert.match(instruction, /Do not create `?\.wonder\/reports\/extend-latest\.json`?/i);
  });
});

describe("wonder-extend.detect-capabilities status", () => {
  it("records local integration evidence without exposing secret values", () => {
    const integrationsSnapshot = extendIntegrationsSnapshotSchema.parse({
      schemaVersion: 1,
      integrations: {
        github: {
          enabled: true,
          auth: { type: "env", envVar: "GITHUB_TOKEN" },
          metadata: { provider: "github" },
        },
      },
    });

    const snapshot = detectCapabilitiesFromConfiguredIntegrations({
      integrationsSnapshot,
      envPresence: { GITHUB_TOKEN: true },
      generatedAt: "2026-06-18T13:00:00.000Z",
      remoteConsent: false,
    });

    const parsed = extendCapabilitiesSnapshotSchema.parse(snapshot);
    const githubRead = detectedCapabilitySchema.parse(parsed.capabilities["github.pr.read"]);

    assert.equal(githubRead.available, true);
    assert.equal(githubRead.source, "integration");
    assert.equal(githubRead.confidence, "high");
    assert.equal(githubRead.remoteChecked, false);
    assert.deepEqual(githubRead.evidence, [
      "integration github enabled",
      "env var GITHUB_TOKEN is present",
    ]);
    assertCapabilitySnapshotHasNoSecrets(parsed);
  });

  it("marks missing local evidence unavailable instead of overstating availability", () => {
    const integrationsSnapshot = extendIntegrationsSnapshotSchema.parse({
      schemaVersion: 1,
      integrations: {
        github: {
          enabled: true,
          auth: { type: "env", envVar: "GITHUB_TOKEN" },
          metadata: { provider: "github" },
        },
      },
    });

    const snapshot = detectCapabilitiesFromConfiguredIntegrations({
      integrationsSnapshot,
      envPresence: { GITHUB_TOKEN: false },
      generatedAt: "2026-06-18T13:00:00.000Z",
      remoteConsent: false,
    });

    assert.equal(snapshot.capabilities["github.pr.read"]?.available, false);
    assert.equal(snapshot.capabilities["github.pr.read"]?.confidence, "low");
    assert.equal(snapshot.capabilities["github.pr.read"]?.remoteChecked, false);
    assert.match(snapshot.capabilities["github.pr.read"]?.evidence.join("\n") ?? "", /not present/);
  });

  it("enforces remote consent and downstream usage rules", () => {
    const capability = detectedCapabilitySchema.parse({
      available: true,
      source: "integration",
      confidence: "medium",
      evidence: ["integration github enabled"],
      remoteChecked: false,
      lastCheckedAt: "2026-06-18T13:00:00.000Z",
    });

    assert.throws(
      () => assertRemoteChecksAllowed({ remoteChecksRequested: true, remoteConsent: false }),
      /remote checks require explicit user consent/,
    );
    assert.equal(
      canUseExtendCapability({
        capability,
        userConsented: false,
        readOnly: true,
        readOnlyOptInEnabled: true,
      }),
      true,
    );
    assert.equal(
      canUseExtendCapability({
        capability,
        userConsented: false,
        readOnly: false,
        readOnlyOptInEnabled: true,
      }),
      false,
    );
  });

  it("rejects capability evidence that contains obvious secret values", () => {
    assert.throws(
      () =>
        assertCapabilitySnapshotHasNoSecrets({
          schemaVersion: 1,
          generatedAt: "2026-06-18T13:00:00.000Z",
          capabilities: {
            "github.pr.read": {
              available: true,
              source: "integration",
              confidence: "high",
              evidence: ["token=secret-value"],
              remoteChecked: false,
              lastCheckedAt: "2026-06-18T13:00:00.000Z",
            },
          },
        }),
      /capability status must not contain secret values/,
    );
  });
});

describe("wonder-extend.detect-capabilities run records", () => {
  it("creates the required run directory scaffold for every detection run", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "wonder-extend-detect-"));

    try {
      const runId = "20260618-220000-wonder-extend-detect-capabilities-test";
      const result = await createDetectCapabilitiesRunScaffold({
        projectRoot,
        runId,
        platform: "codex",
        userRequest: "Detect configured external capabilities.",
        startedAt: "2026-06-18T13:00:00.000Z",
        remoteConsent: false,
      });

      assert.deepEqual(result.files.sort(), [
        ".wonder/runs/20260618-220000-wonder-extend-detect-capabilities-test/artifacts.json",
        ".wonder/runs/20260618-220000-wonder-extend-detect-capabilities-test/detection-plan.md",
        ".wonder/runs/20260618-220000-wonder-extend-detect-capabilities-test/detection-results.json",
        ".wonder/runs/20260618-220000-wonder-extend-detect-capabilities-test/report.md",
        ".wonder/runs/20260618-220000-wonder-extend-detect-capabilities-test/request.md",
        ".wonder/runs/20260618-220000-wonder-extend-detect-capabilities-test/run.json",
      ]);

      const results = extendCapabilitiesSnapshotSchema.parse(
        JSON.parse(await readFile(join(projectRoot, ".wonder/runs", runId, "detection-results.json"), "utf8")),
      );
      const artifacts = detectCapabilitiesArtifactsSchema.parse(
        JSON.parse(await readFile(join(projectRoot, ".wonder/runs", runId, "artifacts.json"), "utf8")),
      );

      assert.deepEqual(results.capabilities, {});
      assert.deepEqual(artifacts, { updatedPaths: [".wonder/extend/capabilities.json"] });
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
