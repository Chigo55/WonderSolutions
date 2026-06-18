import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { ZodError } from "zod";
import {
  validateCapabilityManifestForDirectory,
  validateInstructionBody,
} from "../tools/shared/schema/capability.ts";
import {
  GOVERN_RULE_SEVERITIES,
  detectGovernRuleConflicts,
  governRuleSchema,
  governStandardsArtifactsSchema,
  runRecordSchema,
  type GovernRule,
} from "../tools/shared/schema/run.ts";
import { createGovernRunScaffold } from "../tools/shared/runtime/govern-run.ts";

const root = process.cwd();

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(root, path), "utf8"));
}

describe("wonder-govern.define-standards source", () => {
  it("defines metadata and platform-neutral instruction", async () => {
    const manifest = validateCapabilityManifestForDirectory(
      await readJson("packages/wonder-govern/capabilities/define-standards/capability.json"),
      "define-standards",
    );
    const instruction = validateInstructionBody(
      await readFile(
        join(root, "packages/wonder-govern/capabilities/define-standards/instruction.md"),
        "utf8",
      ),
    );

    assert.deepEqual(manifest, {
      schemaVersion: 1,
      id: "define-standards",
      title: "Define Standards",
      kind: "workflow",
      description: "Create and maintain project-specific standards.",
      requires: ["read", "search", "write", "edit", "ask-user", "report", "manage-state"],
    });
    assert.match(instruction, /scope[\s\S]*observe[\s\S]*propose[\s\S]*apply[\s\S]*report/);
    assert.match(instruction, /observed-conventions\.md/);
    assert.match(instruction, /proposed-standards\.md/);
    assert.match(instruction, /GOV-<DOMAIN>-<NUMBER>/);
    assert.match(instruction, /critical[\s\S]*high[\s\S]*medium[\s\S]*low[\s\S]*info/);
    assert.match(instruction, /Do not write `?\.wonder\/reports\/govern-latest\.json`?/i);
  });
});

describe("wonder-govern.define-standards rule validation", () => {
  it("accepts the documented govern rule id and severity format", () => {
    assert.deepEqual(GOVERN_RULE_SEVERITIES, ["critical", "high", "medium", "low", "info"]);

    const rule = governRuleSchema.parse({
      id: "GOV-CODING-001",
      title: "Prefer Project-Local Patterns",
      instruction: "Use existing local patterns before introducing new abstractions.",
      rationale: "Keeps generated changes consistent with the repository.",
      severity: "medium",
    });

    assert.equal(rule.id, "GOV-CODING-001");
  });

  it("rejects invalid rule ids and severities", () => {
    assert.throws(
      () =>
        governRuleSchema.parse({
          id: "CODING-001",
          title: "Bad Rule",
          instruction: "This id is missing the GOV prefix.",
          rationale: "The format is invalid.",
          severity: "medium",
        }),
      ZodError,
    );
    assert.throws(
      () =>
        governRuleSchema.parse({
          id: "GOV-CODING-001",
          title: "Bad Severity",
          instruction: "The severity is not recognized.",
          rationale: "The format is invalid.",
          severity: "blocker",
        }),
      ZodError,
    );
  });

  it("detects conflicting updates and ambiguous deletions before applying standards", () => {
    const existingRules: GovernRule[] = [
      {
        id: "GOV-CODING-001",
        title: "Prefer Project-Local Patterns",
        instruction: "Use existing local patterns before introducing new abstractions.",
        rationale: "Keeps generated changes consistent with the repository.",
        severity: "medium",
      },
    ];
    const proposedRules: GovernRule[] = [
      {
        id: "GOV-CODING-001",
        title: "Prefer New Shared Abstractions",
        instruction: "Create shared abstractions before checking local patterns.",
        rationale: "This conflicts with the existing rule.",
        severity: "high",
      },
    ];

    const conflicts = detectGovernRuleConflicts({
      existingRules,
      proposedRules,
      deletedRuleIds: ["GOV-CODING-002"],
      explicitDeletionRequested: false,
    });

    assert.deepEqual(conflicts.map((conflict) => conflict.ruleId), [
      "GOV-CODING-001",
      "GOV-CODING-002",
    ]);
    assert.equal(conflicts.every((conflict) => conflict.requiresConfirmation), true);
  });
});

describe("wonder-govern.define-standards run records", () => {
  it("creates the required define-standards run directory scaffold", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "wonder-govern-define-"));

    try {
      const runId = "20260618-150000-wonder-govern-define-standards-test";
      const result = await createGovernRunScaffold({
        projectRoot,
        runId,
        capabilityId: "define-standards",
        platform: "codex",
        userRequest: "Define standards for this repository.",
        startedAt: "2026-06-18T06:00:00.000Z",
      });

      assert.deepEqual(result.files.sort(), [
        ".wonder/runs/20260618-150000-wonder-govern-define-standards-test/artifacts.json",
        ".wonder/runs/20260618-150000-wonder-govern-define-standards-test/changes.md",
        ".wonder/runs/20260618-150000-wonder-govern-define-standards-test/observed-conventions.md",
        ".wonder/runs/20260618-150000-wonder-govern-define-standards-test/proposed-standards.md",
        ".wonder/runs/20260618-150000-wonder-govern-define-standards-test/report.md",
        ".wonder/runs/20260618-150000-wonder-govern-define-standards-test/request.md",
        ".wonder/runs/20260618-150000-wonder-govern-define-standards-test/run.json",
      ]);

      const runRecord = runRecordSchema.parse(
        JSON.parse(await readFile(join(projectRoot, ".wonder/runs", runId, "run.json"), "utf8")),
      );
      assert.equal(runRecord.packageId, "wonder-govern");
      assert.equal(runRecord.capabilityId, "define-standards");

      const artifacts = governStandardsArtifactsSchema.parse(
        JSON.parse(await readFile(join(projectRoot, ".wonder/runs", runId, "artifacts.json"), "utf8")),
      );
      assert.deepEqual(artifacts, {
        standardsCreated: [],
        standardsModified: [],
        rulesAdded: [],
        rulesUpdated: [],
        conflicts: [],
      });
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
