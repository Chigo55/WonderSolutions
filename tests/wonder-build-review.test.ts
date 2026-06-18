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
  REVIEW_SEVERITY_ORDER,
  buildLatestReportForCompletion,
  buildLatestReportSchema,
  reviewFindingsSchema,
  sortReviewFindings,
  type ReviewFinding,
} from "../tools/shared/schema/run.ts";
import { createBuildRunScaffold } from "../tools/shared/runtime/build-run.ts";

const root = process.cwd();

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(root, path), "utf8"));
}

describe("wonder-build.review source", () => {
  it("defines wonder-build.review metadata and platform-neutral instruction", async () => {
    const manifest = validateCapabilityManifestForDirectory(
      await readJson("packages/wonder-build/capabilities/review/capability.json"),
      "review",
    );
    const instruction = validateInstructionBody(
      await readFile(join(root, "packages/wonder-build/capabilities/review/instruction.md"), "utf8"),
    );

    assert.deepEqual(manifest, {
      schemaVersion: 1,
      id: "review",
      title: "Review Work",
      kind: "workflow",
      description: "Review existing work and report findings without modifying project files.",
      requires: ["read", "search", "write", "run-command", "ask-user", "report", "manage-state"],
    });
    assert.match(instruction, /scope[\s\S]*inspect[\s\S]*judge[\s\S]*report/);
    assert.match(instruction, /findings[\s\S]*critical[\s\S]*high[\s\S]*medium[\s\S]*low[\s\S]*info/);
    assert.match(instruction, /read-only validation/i);
    assert.match(instruction, /must not modify reviewed project files/i);
    assert.match(instruction, /\.wonder\/runs\/<run-id>\/findings\.json/);
    assert.match(instruction, /Do not write `?\.wonder\/reports\/govern-latest\.json`?/i);
  });
});

describe("wonder-build.review runtime records", () => {
  it("creates a review run scaffold with findings and without plan", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "wonder-build-review-"));

    try {
      const runId = "20260618-140000-wonder-build-review-test";
      const result = await createBuildRunScaffold({
        projectRoot,
        runId,
        capabilityId: "review",
        platform: "antigravity",
        userRequest: "Review the current change.",
        startedAt: "2026-06-18T05:00:00.000Z",
      });

      assert.deepEqual(result.files.sort(), [
        ".wonder/runs/20260618-140000-wonder-build-review-test/artifacts.json",
        ".wonder/runs/20260618-140000-wonder-build-review-test/findings.json",
        ".wonder/runs/20260618-140000-wonder-build-review-test/inspect.md",
        ".wonder/runs/20260618-140000-wonder-build-review-test/report.md",
        ".wonder/runs/20260618-140000-wonder-build-review-test/request.md",
        ".wonder/runs/20260618-140000-wonder-build-review-test/run.json",
      ]);

      const findings = reviewFindingsSchema.parse(
        JSON.parse(await readFile(join(projectRoot, ".wonder/runs", runId, "findings.json"), "utf8")),
      );
      assert.deepEqual(findings, { findings: [] });
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it("defines and applies the review severity order", () => {
    assert.deepEqual(REVIEW_SEVERITY_ORDER, ["critical", "high", "medium", "low", "info"]);

    const findings: ReviewFinding[] = [
      {
        severity: "low",
        title: "Minor quality issue",
        location: { path: "src/a.ts", line: 3 },
        evidence: "Small readability problem.",
        impact: "Minor maintenance cost.",
        recommendation: "Rename the local variable.",
        policyRuleId: null,
      },
      {
        severity: "critical",
        title: "Deployment blocker",
        location: { path: "src/b.ts", line: 1 },
        evidence: "Application cannot start.",
        impact: "Deployment fails.",
        recommendation: "Fix startup path.",
        policyRuleId: null,
      },
      {
        severity: "medium",
        title: "Missing verification",
        location: { path: "src/c.ts", line: 9 },
        evidence: "No test covers the branch.",
        impact: "Regression risk.",
        recommendation: "Add a focused test.",
        policyRuleId: null,
      },
    ];

    assert.deepEqual(
      sortReviewFindings(findings).map((finding) => finding.severity),
      ["critical", "medium", "low"],
    );
  });
});

describe("wonder-build.review latest report", () => {
  it("marks a successful review run as the latest build report", () => {
    const report = buildLatestReportSchema.parse(
      buildLatestReportForCompletion({
        runId: "20260618-140000-wonder-build-review-test",
        capabilityId: "review",
        summary: "Reviewed the target and reported findings.",
        finishedAt: "2026-06-18T05:10:00.000Z",
      }),
    );

    assert.equal(report.capability, "wonder-build.review");
    assert.equal(report.lastCompletedRunId, "20260618-140000-wonder-build-review-test");
    assert.equal(report.status, "completed");
  });
});
