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
  POLICY_CONFIDENCES,
  governLatestReportForCompletion,
  governLatestReportForFailure,
  governLatestReportSchema,
  policyStandardsIndexSchema,
  policyViolationSchema,
  policyViolationsSchema,
} from "../tools/shared/schema/run.ts";
import { createGovernRunScaffold } from "../tools/shared/runtime/govern-run.ts";

const root = process.cwd();

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(root, path), "utf8"));
}

describe("wonder-govern.check-policy source", () => {
  it("defines metadata and platform-neutral instruction", async () => {
    const manifest = validateCapabilityManifestForDirectory(
      await readJson("packages/wonder-govern/capabilities/check-policy/capability.json"),
      "check-policy",
    );
    const instruction = validateInstructionBody(
      await readFile(
        join(root, "packages/wonder-govern/capabilities/check-policy/instruction.md"),
        "utf8",
      ),
    );

    assert.deepEqual(manifest, {
      schemaVersion: 1,
      id: "check-policy",
      title: "Check Policy",
      kind: "workflow",
      description: "Evaluate project or change compliance against Wonder Govern standards.",
      requires: ["read", "search", "write", "run-command", "ask-user", "report", "manage-state"],
    });
    assert.match(instruction, /scope[\s\S]*index-standards[\s\S]*inspect[\s\S]*evaluate[\s\S]*report/);
    assert.match(instruction, /standards-index\.json/);
    assert.match(instruction, /violations\.json/);
    assert.match(instruction, /govern-latest\.json/);
    assert.match(instruction, /confidence[\s\S]*high[\s\S]*medium[\s\S]*low/);
    assert.match(instruction, /Do not modify `?\.wonder\/standards\/`?/i);
  });
});

describe("wonder-govern.check-policy schemas", () => {
  it("validates standards index and violation confidence", () => {
    assert.deepEqual(POLICY_CONFIDENCES, ["high", "medium", "low"]);

    const index = policyStandardsIndexSchema.parse({
      rules: [
        {
          ruleId: "GOV-DOCS-001",
          sourceFile: ".wonder/standards/docs.md",
          severity: "medium",
          title: "Documentation must include failure handling",
        },
      ],
    });
    assert.equal(index.rules[0]?.ruleId, "GOV-DOCS-001");

    const violation = policyViolationSchema.parse({
      ruleId: "GOV-DOCS-001",
      severity: "medium",
      confidence: "high",
      message: "Design document is missing a failure handling section.",
      location: {
        path: "docs/system-design.md",
        line: 12,
      },
      remediation: "Add failure handling details.",
    });
    assert.equal(violation.confidence, "high");
  });

  it("rejects invalid policy confidence", () => {
    assert.throws(
      () =>
        policyViolationSchema.parse({
          ruleId: "GOV-DOCS-001",
          severity: "medium",
          confidence: "certain",
          message: "Invalid confidence.",
          location: {
            path: "docs/system-design.md",
            line: 12,
          },
          remediation: "Use high, medium, or low.",
        }),
      ZodError,
    );
  });
});

describe("wonder-govern.check-policy run records", () => {
  it("creates the required check-policy run directory scaffold", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "wonder-govern-check-"));

    try {
      const runId = "20260618-160000-wonder-govern-check-policy-test";
      const result = await createGovernRunScaffold({
        projectRoot,
        runId,
        capabilityId: "check-policy",
        platform: "claude",
        userRequest: "Check policy for the current change.",
        startedAt: "2026-06-18T07:00:00.000Z",
      });

      assert.deepEqual(result.files.sort(), [
        ".wonder/runs/20260618-160000-wonder-govern-check-policy-test/artifacts.json",
        ".wonder/runs/20260618-160000-wonder-govern-check-policy-test/inspect.md",
        ".wonder/runs/20260618-160000-wonder-govern-check-policy-test/report.md",
        ".wonder/runs/20260618-160000-wonder-govern-check-policy-test/request.md",
        ".wonder/runs/20260618-160000-wonder-govern-check-policy-test/run.json",
        ".wonder/runs/20260618-160000-wonder-govern-check-policy-test/standards-index.json",
        ".wonder/runs/20260618-160000-wonder-govern-check-policy-test/violations.json",
      ]);

      const standardsIndex = policyStandardsIndexSchema.parse(
        JSON.parse(await readFile(join(projectRoot, ".wonder/runs", runId, "standards-index.json"), "utf8")),
      );
      const violations = policyViolationsSchema.parse(
        JSON.parse(await readFile(join(projectRoot, ".wonder/runs", runId, "violations.json"), "utf8")),
      );
      assert.deepEqual(standardsIndex, { rules: [] });
      assert.deepEqual(violations, { violations: [] });
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});

describe("wonder-govern.check-policy latest report", () => {
  it("summarizes a completed policy check", () => {
    const report = governLatestReportSchema.parse(
      governLatestReportForCompletion({
        runId: "20260618-160000-wonder-govern-check-policy-test",
        scope: "project",
        summary: "Policy check completed with one medium violation.",
        violationCounts: {
          critical: 0,
          high: 0,
          medium: 1,
          low: 0,
          info: 0,
        },
        finishedAt: "2026-06-18T07:10:00.000Z",
      }),
    );

    assert.equal(report.lastCompletedRunId, "20260618-160000-wonder-govern-check-policy-test");
    assert.equal(report.status, "completed");
    assert.equal(report.violationCounts.medium, 1);
  });

  it("preserves the previous completed run when recording a failed check", () => {
    const previous = governLatestReportSchema.parse({
      schemaVersion: 1,
      lastCompletedRunId: "20260618-150000-wonder-govern-check-policy-ok",
      lastRunId: "20260618-150000-wonder-govern-check-policy-ok",
      scope: "project",
      status: "completed",
      summary: "Policy check completed.",
      violationCounts: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
      },
      finishedAt: "2026-06-18T06:10:00.000Z",
    });
    const failed = governLatestReportSchema.parse(
      governLatestReportForFailure(previous, {
        runId: "20260618-160000-wonder-govern-check-policy-failed",
        scope: "project",
        summary: "No standards could be loaded.",
        finishedAt: "2026-06-18T07:10:00.000Z",
      }),
    );

    assert.equal(failed.lastCompletedRunId, "20260618-150000-wonder-govern-check-policy-ok");
    assert.equal(failed.lastRunId, "20260618-160000-wonder-govern-check-policy-failed");
    assert.equal(failed.status, "failed");
  });
});
