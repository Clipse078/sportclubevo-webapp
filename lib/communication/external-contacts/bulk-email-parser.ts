/**
 * SCE-ZIELGRUPPEN-02 — parse pasted bulk email lists.
 */

const SEPARATOR_PATTERN = /[\n,;]+/;

export function parseBulkEmailEntries(raw: string): string[] {
  if (!raw.trim()) return [];
  const parts = raw.split(SEPARATOR_PATTERN);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const token = part.trim();
    if (!token) continue;
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(token);
  }
  return out;
}
