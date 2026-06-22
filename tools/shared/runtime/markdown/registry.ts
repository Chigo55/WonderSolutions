/**
 * Strict-scaffold section registry (docs/deterministic-runtime.md sections 5, 6).
 *
 * Each entry declares the fixed H1 title and ordered `##` section headings the
 * runtime owns for a strict-scaffold Markdown file. Section content is filled by
 * the agent (section 9: the runtime does not define semantic content). Optional
 * `marker` text becomes an HTML-comment hint under the heading ("optional known
 * markers", section 5).
 *
 * The scaffold id is the unit of identity, not the file name, because the same
 * file name can carry different sections by capability context (for example
 * `plan.md` gains an "Allowed Paths" section for `modify`).
 */

export interface ScaffoldSection {
  readonly heading: string;
  readonly marker?: string;
}

export interface ScaffoldDefinition {
  readonly title: string;
  readonly sections: readonly ScaffoldSection[];
}

function section(heading: string, marker?: string): ScaffoldSection {
  return marker === undefined ? { heading } : { heading, marker };
}

export const SCAFFOLDS = {
  // wonder-build
  "build-create-plan": {
    title: "Plan",
    sections: [section("Scope"), section("Steps"), section("Validation"), section("Risks")],
  },
  "build-modify-plan": {
    title: "Plan",
    sections: [
      section("Scope"),
      section("Allowed Paths"),
      section("Steps"),
      section("Validation"),
      section("Risks"),
    ],
  },
  "build-inspect": {
    title: "Inspection",
    sections: [
      section("Files Read"),
      section("Evidence"),
      section("Commands"),
      section("Skipped Validation"),
      section("Notes"),
    ],
  },

  // shared run report
  "run-report": {
    title: "Report",
    sections: [section("Summary"), section("Outcomes")],
  },

  // wonder-govern
  "govern-inspect": {
    title: "Inspection",
    sections: [
      section("Scope"),
      section("Evidence"),
      section("Files"),
      section("Commands"),
      section("Skipped Checks"),
    ],
  },
  "observed-conventions": {
    title: "Observed Conventions",
    sections: [section("Conventions"), section("Evidence"), section("Notes")],
  },
  "proposed-standards": {
    title: "Proposed Standards",
    sections: [
      section("Summary"),
      section("Proposed Rules", "Per rule: rule id, severity, rationale, applies-to, examples"),
      section("Conflicts"),
    ],
  },
  "standards-changes": {
    title: "Changes",
    sections: [
      section("Changed Files"),
      section("Added Rules"),
      section("Updated Rules"),
      section("Conflicts"),
    ],
  },

  // wonder-reuse
  abstraction: {
    title: "Abstraction",
    sections: [
      section("Fixed Parts"),
      section("Variables"),
      section("Discarded Details"),
      section("Assumptions"),
    ],
  },

  // wonder-extend
  "recommendation-context": {
    title: "Recommendation Context",
    sections: [
      section("Current Platform"),
      section("User Goal"),
      section("Project Context"),
      section("Constraints"),
      section("Assumptions"),
    ],
  },
  "detection-plan": {
    title: "Detection Plan",
    sections: [
      section("Providers"),
      section("Local Checks"),
      section("Remote Consent"),
      section("Skipped Remote Checks"),
      section("Assumptions"),
    ],
  },
} as const satisfies Record<string, ScaffoldDefinition>;

export type ScaffoldId = keyof typeof SCAFFOLDS;

export function scaffoldDefinition(id: ScaffoldId): ScaffoldDefinition {
  return SCAFFOLDS[id];
}
