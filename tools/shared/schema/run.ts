import { z } from "zod";
import { platformIdSchema } from "../platform/names.ts";
import { capabilityIdSchema, packageIdSchema } from "./package.ts";
import { relativePathSchema } from "./adapter.ts";

export const runStatusSchema = z.enum(["running", "succeeded", "failed"]);

export const runRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    runId: z.string().min(1),
    packageId: packageIdSchema,
    capabilityId: capabilityIdSchema,
    platform: platformIdSchema,
    status: runStatusSchema,
    startedAt: z.string().datetime(),
    finishedAt: z.string().datetime().optional(),
    inputs: z.record(z.unknown()).optional(),
    outputs: z.record(z.unknown()).optional(),
    validation: z
      .object({
        commands: z.array(
          z
            .object({
              command: z.string().min(1),
              exitCode: z.number().int(),
            })
            .strict(),
        ),
      })
      .strict()
      .optional(),
    error: z
      .object({
        code: z.string().min(1),
        message: z.string().min(1),
      })
      .strict()
      .optional(),
  })
  .strict();

export const buildArtifactsSchema = z
  .object({
    created: z.array(relativePathSchema),
    modified: z.array(relativePathSchema),
    validated: z.array(z.string().min(1)),
    reuseAssetsUsed: z.array(z.string().min(1)),
    companionCapabilitiesUsed: z.array(z.string().min(1)),
  })
  .strict();

export const buildModifyArtifactsSchema = z
  .object({
    modified: z.array(relativePathSchema),
    created: z.array(relativePathSchema),
    deleted: z.array(relativePathSchema),
    validation: z.array(z.string().min(1)),
    preservedUnrelatedChanges: z.array(relativePathSchema),
  })
  .strict();

export const modifyScopeGuardSchema = z
  .object({
    targetDescription: z.string().min(1),
    allowedPaths: z.array(relativePathSchema),
    observedRelatedPaths: z.array(relativePathSchema),
    unrelatedDirtyPaths: z.array(relativePathSchema),
  })
  .strict();

export const REVIEW_SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"] as const;

export const reviewSeveritySchema = z.enum(REVIEW_SEVERITY_ORDER);

export const reviewFindingSchema = z
  .object({
    severity: reviewSeveritySchema,
    title: z.string().min(1),
    location: z
      .object({
        path: relativePathSchema,
        line: z.number().int().positive(),
      })
      .strict(),
    evidence: z.string().min(1),
    impact: z.string().min(1),
    recommendation: z.string().min(1),
    policyRuleId: z.string().min(1).nullable(),
  })
  .strict();

export const reviewFindingsSchema = z
  .object({
    findings: z.array(reviewFindingSchema),
  })
  .strict();

export const GOVERN_RULE_SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;

export const governRuleSeveritySchema = z.enum(GOVERN_RULE_SEVERITIES);

export const governRuleSchema = z
  .object({
    id: z.string().regex(/^GOV-[A-Z]+-\d{3,}$/),
    title: z.string().min(1),
    instruction: z.string().min(1),
    rationale: z.string().min(1),
    severity: governRuleSeveritySchema,
  })
  .strict();

export const governRuleConflictSchema = z
  .object({
    ruleId: z.string().regex(/^GOV-[A-Z]+-\d{3,}$/),
    reason: z.string().min(1),
    requiresConfirmation: z.literal(true),
  })
  .strict();

export const governStandardsArtifactsSchema = z
  .object({
    standardsCreated: z.array(relativePathSchema),
    standardsModified: z.array(relativePathSchema),
    rulesAdded: z.array(z.string().regex(/^GOV-[A-Z]+-\d{3,}$/)),
    rulesUpdated: z.array(z.string().regex(/^GOV-[A-Z]+-\d{3,}$/)),
    conflicts: z.array(governRuleConflictSchema),
  })
  .strict();

export const POLICY_CONFIDENCES = ["high", "medium", "low"] as const;

export const policyConfidenceSchema = z.enum(POLICY_CONFIDENCES);

export const policyStandardsIndexSchema = z
  .object({
    rules: z.array(
      z
        .object({
          ruleId: z.string().regex(/^GOV-[A-Z]+-\d{3,}$/),
          sourceFile: relativePathSchema,
          severity: governRuleSeveritySchema,
          title: z.string().min(1),
        })
        .strict(),
    ),
  })
  .strict();

export const policyViolationSchema = z
  .object({
    ruleId: z.string().regex(/^GOV-[A-Z]+-\d{3,}$/),
    severity: governRuleSeveritySchema,
    confidence: policyConfidenceSchema,
    message: z.string().min(1),
    location: z
      .object({
        path: relativePathSchema,
        line: z.number().int().positive(),
      })
      .strict(),
    remediation: z.string().min(1),
  })
  .strict();

export const policyViolationsSchema = z
  .object({
    violations: z.array(policyViolationSchema),
  })
  .strict();

export const violationCountsSchema = z
  .object({
    critical: z.number().int().nonnegative(),
    high: z.number().int().nonnegative(),
    medium: z.number().int().nonnegative(),
    low: z.number().int().nonnegative(),
    info: z.number().int().nonnegative(),
  })
  .strict();

export const governLatestReportSchema = z
  .object({
    schemaVersion: z.literal(1),
    lastCompletedRunId: z.string().min(1).optional(),
    lastRunId: z.string().min(1),
    scope: z.enum(["project", "change"]),
    status: z.enum(["completed", "failed"]),
    summary: z.string().min(1),
    violationCounts: violationCountsSchema,
    finishedAt: z.string().datetime(),
  })
  .strict();

export const buildLatestReportStatusSchema = z.enum(["completed", "failed"]);

export const buildLatestReportSchema = z
  .object({
    schemaVersion: z.literal(1),
    lastCompletedRunId: z.string().min(1).optional(),
    lastRunId: z.string().min(1),
    capability: z.string().regex(/^wonder-build\.[a-z0-9]+(?:-[a-z0-9]+)*$/),
    status: buildLatestReportStatusSchema,
    summary: z.string().min(1),
    finishedAt: z.string().datetime(),
  })
  .strict();

export type RunStatus = z.infer<typeof runStatusSchema>;
export type RunRecord = z.infer<typeof runRecordSchema>;
export type BuildArtifacts = z.infer<typeof buildArtifactsSchema>;
export type BuildModifyArtifacts = z.infer<typeof buildModifyArtifactsSchema>;
export type ModifyScopeGuard = z.infer<typeof modifyScopeGuardSchema>;
export type ReviewSeverity = z.infer<typeof reviewSeveritySchema>;
export type ReviewFinding = z.infer<typeof reviewFindingSchema>;
export type ReviewFindings = z.infer<typeof reviewFindingsSchema>;
export type GovernRuleSeverity = z.infer<typeof governRuleSeveritySchema>;
export type GovernRule = z.infer<typeof governRuleSchema>;
export type GovernRuleConflict = z.infer<typeof governRuleConflictSchema>;
export type GovernStandardsArtifacts = z.infer<typeof governStandardsArtifactsSchema>;
export type PolicyConfidence = z.infer<typeof policyConfidenceSchema>;
export type PolicyStandardsIndex = z.infer<typeof policyStandardsIndexSchema>;
export type PolicyViolation = z.infer<typeof policyViolationSchema>;
export type PolicyViolations = z.infer<typeof policyViolationsSchema>;
export type ViolationCounts = z.infer<typeof violationCountsSchema>;
export type GovernLatestReport = z.infer<typeof governLatestReportSchema>;
export type BuildLatestReport = z.infer<typeof buildLatestReportSchema>;

export interface BuildLatestReportInput {
  runId: string;
  capabilityId: string;
  summary: string;
  finishedAt: string;
}

export function buildLatestReportForCompletion(
  input: BuildLatestReportInput,
): BuildLatestReport {
  return buildLatestReportSchema.parse({
    schemaVersion: 1,
    lastCompletedRunId: input.runId,
    lastRunId: input.runId,
    capability: `wonder-build.${input.capabilityId}`,
    status: "completed",
    summary: input.summary,
    finishedAt: input.finishedAt,
  });
}

export function buildLatestReportForFailure(
  previous: BuildLatestReport | undefined,
  input: BuildLatestReportInput,
): BuildLatestReport {
  const report = {
    schemaVersion: 1,
    ...(previous?.lastCompletedRunId
      ? { lastCompletedRunId: previous.lastCompletedRunId }
      : {}),
    lastRunId: input.runId,
    capability: `wonder-build.${input.capabilityId}`,
    status: "failed",
    summary: input.summary,
    finishedAt: input.finishedAt,
  };

  return buildLatestReportSchema.parse(report);
}

export function sortReviewFindings(findings: readonly ReviewFinding[]): ReviewFinding[] {
  const severityRank = new Map<ReviewSeverity, number>(
    REVIEW_SEVERITY_ORDER.map((severity, index) => [severity, index]),
  );

  return [...findings].sort(
    (left, right) =>
      (severityRank.get(left.severity) ?? Number.MAX_SAFE_INTEGER) -
      (severityRank.get(right.severity) ?? Number.MAX_SAFE_INTEGER),
  );
}

export interface DetectGovernRuleConflictsOptions {
  existingRules: readonly GovernRule[];
  proposedRules: readonly GovernRule[];
  deletedRuleIds?: readonly string[];
  explicitDeletionRequested?: boolean;
}

export function detectGovernRuleConflicts(
  options: DetectGovernRuleConflictsOptions,
): GovernRuleConflict[] {
  const conflicts: GovernRuleConflict[] = [];
  const existingById = new Map(options.existingRules.map((rule) => [rule.id, rule]));

  for (const proposedRule of options.proposedRules) {
    const existingRule = existingById.get(proposedRule.id);
    if (!existingRule) continue;

    if (existingRule.instruction.trim() !== proposedRule.instruction.trim()) {
      conflicts.push(
        governRuleConflictSchema.parse({
          ruleId: proposedRule.id,
          reason: "same id with materially different instruction",
          requiresConfirmation: true,
        }),
      );
      continue;
    }

    if (existingRule.severity !== proposedRule.severity) {
      conflicts.push(
        governRuleConflictSchema.parse({
          ruleId: proposedRule.id,
          reason: "severity change affects enforcement",
          requiresConfirmation: true,
        }),
      );
    }
  }

  if (options.explicitDeletionRequested !== true) {
    for (const deletedRuleId of options.deletedRuleIds ?? []) {
      conflicts.push(
        governRuleConflictSchema.parse({
          ruleId: deletedRuleId,
          reason: "deletion requires explicit user request",
          requiresConfirmation: true,
        }),
      );
    }
  }

  return conflicts;
}

export interface GovernLatestReportCompletionInput {
  runId: string;
  scope: "project" | "change";
  summary: string;
  violationCounts: ViolationCounts;
  finishedAt: string;
}

export interface GovernLatestReportFailureInput {
  runId: string;
  scope: "project" | "change";
  summary: string;
  finishedAt: string;
}

const EMPTY_VIOLATION_COUNTS: ViolationCounts = {
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
  info: 0,
};

export function governLatestReportForCompletion(
  input: GovernLatestReportCompletionInput,
): GovernLatestReport {
  return governLatestReportSchema.parse({
    schemaVersion: 1,
    lastCompletedRunId: input.runId,
    lastRunId: input.runId,
    scope: input.scope,
    status: "completed",
    summary: input.summary,
    violationCounts: input.violationCounts,
    finishedAt: input.finishedAt,
  });
}

export function governLatestReportForFailure(
  previous: GovernLatestReport | undefined,
  input: GovernLatestReportFailureInput,
): GovernLatestReport {
  return governLatestReportSchema.parse({
    schemaVersion: 1,
    ...(previous?.lastCompletedRunId
      ? { lastCompletedRunId: previous.lastCompletedRunId }
      : {}),
    lastRunId: input.runId,
    scope: input.scope,
    status: "failed",
    summary: input.summary,
    violationCounts: previous?.violationCounts ?? EMPTY_VIOLATION_COUNTS,
    finishedAt: input.finishedAt,
  });
}
