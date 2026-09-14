/** Normalizes RFC 5322 Message-ID values for deterministic matching. */
export function normalizeInternetMessageId(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
    const inner = trimmed.slice(1, -1).trim();
    return inner || null;
  }
  return trimmed;
}

export function messageIdMatchVariants(value: string | null | undefined): string[] {
  const normalized = normalizeInternetMessageId(value);
  if (!normalized) return [];
  return Array.from(new Set([normalized, `<${normalized}>`]));
}

export function parseReferencesHeader(references: string | null | undefined): string[] {
  if (!references?.trim()) return [];
  const matches = references.match(/<[^>]+>/g);
  if (!matches) return [];
  return matches
    .map((entry) => normalizeInternetMessageId(entry))
    .filter((entry): entry is string => Boolean(entry));
}

export function collectThreadCandidateMessageIds(input: {
  inReplyTo: string | null | undefined;
  referencesHeader: string | null | undefined;
}): string[] {
  const ids = new Set<string>();
  for (const variant of messageIdMatchVariants(input.inReplyTo)) {
    ids.add(variant);
  }
  for (const ref of parseReferencesHeader(input.referencesHeader)) {
    for (const variant of messageIdMatchVariants(ref)) {
      ids.add(variant);
    }
  }
  return [...ids];
}
