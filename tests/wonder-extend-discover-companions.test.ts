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
  companionRecommendationListSchema,
  companionSelectionChangesSchema,
  discoverCompanionArtifactsSchema,
  extendCompanionCatalogSchema,
  extendCompanionsSnapshotSchema,
} from "../tools/shared/schema/extend.ts";
import {
  assertSavedCompanionSelectionsDoNotImplyAvailability,
  buildCompanionSelectionSnapshot,
  createDiscoverCompanionsRunScaffold,
  rankCompanionRecommendations,
  requiresDiscoverCompanionsRunRecord,
} from "../tools/shared/runtime/extend-run.ts";

const root = process.cwd();

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(root, path), "utf8"));
}

describe("wonder-extend.discover-companions source", () => {
  it("defines metadata and platform-neutral instruction", async () => {
    const manifest = validateCapabilityManifestForDirectory(
      await readJson("packages/wonder-extend/capabilities/discover-companions/capability.json"),
      "discover-companions",
    );
    const instruction = validateInstructionBody(
      await readFile(
        join(root, "packages/wonder-extend/capabilities/discover-companions/instruction.md"),
        "utf8",
      ),
    );

    assert.deepEqual(manifest, {
      schemaVersion: 1,
      id: "discover-companions",
      title: "Discover Companions",
      kind: "workflow",
      description: "Recommend companion tools without installing them or claiming availability.",
      requires: ["read", "search", "write", "ask-user", "report", "manage-state"],
    });
    assert.match(instruction, /scope[\s\S]*inspect-context[\s\S]*recommend[\s\S]*optionally-save[\s\S]*report/);
    assert.match(instruction, /companion-recommendations\.json/);
    assert.match(instruction, /selection-changes\.json/);
    assert.match(instruction, /Do not install external tools/i);
    assert.match(instruction, /Do not create `?\.wonder\/reports\/extend-latest\.json`?/i);
  });

  it("keeps companion catalog purpose distinct from integration configuration", async () => {
    const catalog = extendCompanionCatalogSchema.parse(
      await readJson("packages/wonder-extend/catalog/companions.json"),
    );

    assert.ok(catalog.companions.length > 0);
    assert.equal(catalog.companions[0]?.sourceType, "companion");
    assert.ok(catalog.companions[0]?.purpose);
    assert.ok(catalog.companions[0]?.platforms.includes("codex"));
    assert.throws(
      () =>
        extendCompanionCatalogSchema.parse({
          schemaVersion: 1,
          companions: [
            {
              id: "bad-integration",
              displayName: "Bad Integration",
              sourceType: "integration",
              purpose: "Stores external connection metadata.",
              platforms: ["codex"],
            },
          ],
        }),
      /Invalid literal value/,
    );
  });
});

describe("wonder-extend.discover-companions recommendations", () => {
  it("ranks candidates for the platform and marks detected availability separately", () => {
    const catalog = extendCompanionCatalogSchema.parse({
      schemaVersion: 1,
      companions: [
        {
          id: "security-reviewer",
          displayName: "Security Reviewer",
          sourceType: "companion",
          purpose: "Review code changes for security risk.",
          platforms: ["codex"],
          tags: ["security", "review"],
          capabilityHints: ["security.scan.run"],
        },
        {
          id: "docs-helper",
          displayName: "Docs Helper",
          sourceType: "companion",
          purpose: "Look up framework documentation.",
          platforms: ["claude", "codex"],
          tags: ["docs"],
          capabilityHints: ["docs.lookup.read"],
        },
      ],
    });

    const recommendations = rankCompanionRecommendations({
      catalog,
      platform: "codex",
      userGoal: "review a security-sensitive pull request",
      projectContext: "TypeScript package",
      detectedCapabilities: {
        "security.scan.run": {
          available: true,
          confidence: "high",
        },
      },
    });

    const parsed = companionRecommendationListSchema.parse({ recommendations });

    assert.equal(parsed.recommendations[0]?.id, "security-reviewer");
    assert.equal(parsed.recommendations[0]?.rank, 1);
    assert.equal(parsed.recommendations[0]?.fit, "high");
    assert.equal(parsed.recommendations[0]?.availability, "detected-available");
    assert.equal(parsed.recommendations[1]?.availability, "recommended-only");
    assert.equal(parsed.recommendations[1]?.nextAction, "run wonder-extend.detect-capabilities");
  });

  it("requires run records only when selections or snapshots are saved", () => {
    assert.equal(requiresDiscoverCompanionsRunRecord("recommend"), false);
    assert.equal(requiresDiscoverCompanionsRunRecord("save-selections"), true);
    assert.equal(requiresDiscoverCompanionsRunRecord("refresh-snapshot"), true);
  });
});

describe("wonder-extend.discover-companions saved selections", () => {
  it("builds selection snapshots without availability or installation fields", () => {
    const catalog = extendCompanionCatalogSchema.parse({
      schemaVersion: 1,
      companions: [
        {
          id: "security-reviewer",
          displayName: "Security Reviewer",
          sourceType: "companion",
          purpose: "Review code changes for security risk.",
          platforms: ["codex"],
        },
        {
          id: "docs-helper",
          displayName: "Docs Helper",
          sourceType: "companion",
          purpose: "Look up framework documentation.",
          platforms: ["codex"],
        },
      ],
    });

    const snapshot = buildCompanionSelectionSnapshot({
      catalog,
      selectedCompanionIds: ["docs-helper"],
    });

    assert.deepEqual(extendCompanionsSnapshotSchema.parse(snapshot), {
      schemaVersion: 1,
      companions: [
        { id: "security-reviewer", enabled: false, source: "catalog" },
        { id: "docs-helper", enabled: true, source: "catalog" },
      ],
    });
    assert.equal(JSON.stringify(snapshot).includes("available"), false);
    assert.equal(JSON.stringify(snapshot).includes("installed"), false);
  });

  it("rejects saved selections that imply installation or availability", () => {
    assert.throws(
      () =>
        assertSavedCompanionSelectionsDoNotImplyAvailability({
          schemaVersion: 1,
          companions: [
            {
              id: "security-reviewer",
              enabled: true,
              source: "catalog",
              available: true,
            },
          ],
        }),
      /saved companion selections must not imply availability or installation/,
    );
  });
});

describe("wonder-extend.discover-companions run records", () => {
  it("creates the required run directory scaffold for state-changing discovery", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "wonder-extend-discover-"));

    try {
      const runId = "20260618-200000-wonder-extend-discover-companions-test";
      const result = await createDiscoverCompanionsRunScaffold({
        projectRoot,
        runId,
        platform: "codex",
        userRequest: "Recommend companion tools for code review.",
        startedAt: "2026-06-18T11:00:00.000Z",
        operation: "save-selections",
      });

      assert.deepEqual(result.files.sort(), [
        ".wonder/runs/20260618-200000-wonder-extend-discover-companions-test/artifacts.json",
        ".wonder/runs/20260618-200000-wonder-extend-discover-companions-test/companion-recommendations.json",
        ".wonder/runs/20260618-200000-wonder-extend-discover-companions-test/recommendation-context.md",
        ".wonder/runs/20260618-200000-wonder-extend-discover-companions-test/report.md",
        ".wonder/runs/20260618-200000-wonder-extend-discover-companions-test/request.md",
        ".wonder/runs/20260618-200000-wonder-extend-discover-companions-test/run.json",
        ".wonder/runs/20260618-200000-wonder-extend-discover-companions-test/selection-changes.json",
      ]);

      const recommendations = companionRecommendationListSchema.parse(
        JSON.parse(await readFile(join(projectRoot, ".wonder/runs", runId, "companion-recommendations.json"), "utf8")),
      );
      const changes = companionSelectionChangesSchema.parse(
        JSON.parse(await readFile(join(projectRoot, ".wonder/runs", runId, "selection-changes.json"), "utf8")),
      );
      const artifacts = discoverCompanionArtifactsSchema.parse(
        JSON.parse(await readFile(join(projectRoot, ".wonder/runs", runId, "artifacts.json"), "utf8")),
      );

      assert.deepEqual(recommendations, { recommendations: [] });
      assert.deepEqual(changes, { enabled: [], disabled: [], refreshed: false });
      assert.deepEqual(artifacts, { updatedPaths: [] });
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
