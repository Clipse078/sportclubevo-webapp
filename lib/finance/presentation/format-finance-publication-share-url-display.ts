/**
 * FIN-06D-R2R3 — compact share URL presentation for fast-share confirmation.
 * Full capability URL remains available for copy/open; display string may truncate.
 */

const DEFAULT_TOKEN_SUFFIX_LENGTH = 4;

function hostFromOrigin(origin: string): string {
  const trimmed = origin.replace(/\/+$/, "");
  try {
    return new URL(trimmed).host;
  } catch {
    return trimmed.replace(/^https?:\/\//, "");
  }
}

function tokenSuffixFromRelativePath(relativeSharePath: string, suffixLength: number): string {
  const segment = relativeSharePath.split("/").filter(Boolean).pop() ?? "";
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    decoded = segment;
  }
  if (decoded.length <= suffixLength) return decoded;
  return decoded.slice(-suffixLength);
}

export function buildFinancePublicationShareAbsoluteUrlFromPath(input: {
  origin: string;
  relativeSharePath: string;
}): string {
  const origin = input.origin.replace(/\/+$/, "");
  const path = input.relativeSharePath.startsWith("/")
    ? input.relativeSharePath
    : `/${input.relativeSharePath}`;
  return `${origin}${path}`;
}

/** Visual label e.g. sportclubevo.com/share/finance/…x7Kd */
export function formatCompactFinancePublicationShareUrlLabel(input: {
  origin: string;
  relativeSharePath: string;
  tokenSuffixLength?: number;
}): string {
  const host = hostFromOrigin(input.origin);
  const suffix = tokenSuffixFromRelativePath(
    input.relativeSharePath,
    input.tokenSuffixLength ?? DEFAULT_TOKEN_SUFFIX_LENGTH,
  );
  return `${host}/share/finance/…${suffix}`;
}
