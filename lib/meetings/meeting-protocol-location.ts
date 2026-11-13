/**
 * Safe presentation of meeting location strings for protocol export.
 * Strips conferencing secrets and normalises known import artefacts.
 */

const CODEC_PREFIX_RE = /^@sce:[a-z0-9_-]+:/i;

/** Removes password, token and other sensitive query parameters from URLs embedded in text. */
export function redactConferencingSecretsInText(value: string): string {
  return value.replace(/https?:\/\/[^\s<>"']+/gi, (rawUrl) => redactConferencingUrl(rawUrl));
}

export function redactConferencingUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const sensitive = new Set([
      "password",
      "pwd",
      "pass",
      "token",
      "auth",
      "key",
      "secret",
      "access_token",
      "meeting",
      "mtid",
    ]);
    for (const key of [...parsed.searchParams.keys()]) {
      if (sensitive.has(key.toLowerCase())) {
        parsed.searchParams.set(key, "[ausgeblendet]");
      }
    }
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

export function decodeMeetingLocationForProtocol(location: string | null | undefined): string | null {
  const trimmed = location?.trim();
  if (!trimmed) return null;
  const withoutCodec = trimmed.replace(CODEC_PREFIX_RE, "").trim();
  const redacted = redactConferencingSecretsInText(withoutCodec);
  return redacted || null;
}
