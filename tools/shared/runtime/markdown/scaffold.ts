import { RuntimeAbortError, runtimeError } from "../result.ts";
import { normalizeMarkdown } from "../io/markdown.ts";
import { scaffoldDefinition, type ScaffoldDefinition, type ScaffoldId } from "./registry.ts";

/**
 * Strict-scaffold creation and repair (docs/deterministic-runtime.md sections 5, 8).
 *
 * Creation emits the fixed headings; repair implements the regeneration policy:
 * empty file -> replace with scaffold; known scaffold -> add missing sections
 * only; content outside known sections is always preserved; a full destructive
 * rewrite requires explicit confirmation.
 */

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function headingPresent(content: string, heading: string): boolean {
  return new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "m").test(content);
}

function renderSectionBlock(heading: string, marker: string | undefined): string {
  return marker === undefined ? `## ${heading}` : `## ${heading}\n\n<!-- ${marker} -->`;
}

function renderScaffold(definition: ScaffoldDefinition): string {
  const blocks = definition.sections.map((section) => renderSectionBlock(section.heading, section.marker));
  return normalizeMarkdown(`# ${definition.title}\n\n${blocks.join("\n\n")}\n`, "strict-scaffold");
}

/** Render the full strict scaffold for a scaffold id. */
export function createScaffold(id: ScaffoldId): string {
  return renderScaffold(scaffoldDefinition(id));
}

export interface RepairScaffoldResult {
  readonly content: string;
  /** Headings appended because they were missing (canonical order). */
  readonly addedSections: readonly string[];
  /** True when an empty file was replaced with the full scaffold. */
  readonly replacedEmpty: boolean;
}

/**
 * Repair an existing strict-scaffold file.
 *
 * - Empty (whitespace-only) content -> replaced with the full scaffold.
 * - Otherwise -> existing content is preserved (LF + trailing-newline
 *   normalized) and any missing known sections are appended in canonical order.
 */
export function repairScaffold(id: ScaffoldId, existing: string): RepairScaffoldResult {
  const definition = scaffoldDefinition(id);

  if (existing.trim().length === 0) {
    return {
      content: createScaffold(id),
      addedSections: definition.sections.map((section) => section.heading),
      replacedEmpty: true,
    };
  }

  const base = normalizeMarkdown(existing, "strict-scaffold");
  const missing = definition.sections.filter((section) => !headingPresent(base, section.heading));

  if (missing.length === 0) {
    return { content: base, addedSections: [], replacedEmpty: false };
  }

  const appended = missing.map((section) => renderSectionBlock(section.heading, section.marker)).join("\n\n");
  return {
    content: `${base}\n${appended}\n`,
    addedSections: missing.map((section) => section.heading),
    replacedEmpty: false,
  };
}

/**
 * Guard a destructive Markdown rewrite. A full rewrite that discards existing
 * content requires explicit user confirmation (sections 5 and 8); otherwise it
 * aborts with a repair hint.
 */
export function assertScaffoldRewriteAllowed(options: { confirmed: boolean; path?: string }): true {
  if (options.confirmed) return true;
  throw new RuntimeAbortError(
    runtimeError("runtime-destructive-rewrite", "destructive Markdown rewrite requires explicit user confirmation", {
      ...(options.path !== undefined ? { path: options.path } : {}),
      hint: "rerun with explicit user confirmation to overwrite existing content",
    }),
  );
}
