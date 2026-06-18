export function normalizeText(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function stableJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => stableJson(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableJson(entry)]),
    );
  }

  return value;
}

export function stableStringify(value: unknown): string {
  return `${JSON.stringify(stableJson(value), null, 2)}\n`;
}

export function canonicalSourceText(path: string, content: string): string {
  const normalized = normalizeText(content);
  if (!path.endsWith(".json")) {
    return normalized;
  }

  return stableStringify(JSON.parse(normalized));
}
