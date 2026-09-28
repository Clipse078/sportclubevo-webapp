/**
 * SCE-COMM-EVO-07 — safe link schemes for signature links.
 */

const BLOCKED_PREFIXES = [
  "javascript:",
  "data:",
  "file:",
  "blob:",
  "vbscript:",
] as const;

export function isAllowedSignatureLinkHref(href: unknown): href is string {
  if (typeof href !== "string") return false;
  const trimmed = href.trim();
  if (!trimmed || trimmed.length > 2048) return false;
  const lower = trimmed.toLowerCase();
  for (const blocked of BLOCKED_PREFIXES) {
    if (lower.startsWith(blocked)) return false;
  }
  if (lower.startsWith("data:text/html")) return false;
  return (
    lower.startsWith("https://") ||
    lower.startsWith("http://") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:")
  );
}

export function normalizeSignatureLinkHref(href: string): string {
  return href.trim();
}
