/**
 * Markdown formatting levels and normalization (docs/deterministic-runtime.md
 * sections 5 and 8).
 *
 * - `strict-scaffold`     : runtime owns fixed headings/section order (scaffold
 *                           generation lives in the Phase 1 scaffold engine);
 *                           text is LF + trailing-newline normalized.
 * - `light-normalization` : free-form content, LF + trailing-newline normalized.
 * - `preserve-content`    : evidence / rendered output, returned byte-for-byte.
 */
export type MarkdownLevel = "strict-scaffold" | "light-normalization" | "preserve-content";

/** Convert all CR / CRLF line endings to LF. */
function toLf(content: string): string {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * Normalize Markdown text for the given formatting level.
 *
 * For `preserve-content` the text is returned unchanged. For the other levels the
 * text is converted to LF line endings and given exactly one trailing newline;
 * empty content stays empty (no lone newline is synthesized).
 */
export function normalizeMarkdown(content: string, level: MarkdownLevel): string {
  if (level === "preserve-content") return content;

  const lf = toLf(content);
  if (lf.length === 0) return "";
  return lf.replace(/\n*$/, "\n");
}
