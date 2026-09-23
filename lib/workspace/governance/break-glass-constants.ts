/**
 * WORKSPACE-08-02 — break-glass is Workspace-domain scoped only (not platform / family privacy).
 */
export const WORKSPACE_BREAK_GLASS_DOMAIN_SENTINEL =
  "WORKSPACE_DOMAIN_ONLY_NOT_PLATFORM_PRIVACY_OVERRIDE" as const;

export const WORKSPACE_BREAK_GLASS_DEFAULT_TTL_MINUTES = 60;
export const WORKSPACE_BREAK_GLASS_MAX_TTL_MINUTES = 60;
export const WORKSPACE_BREAK_GLASS_MIN_TTL_MINUTES = 15;

export const WORKSPACE_BREAK_GLASS_MIN_REASON_LENGTH = 12;
export const WORKSPACE_BREAK_GLASS_MAX_REASON_LENGTH = 500;

/** Break-glass must not bypass future malware scan gates (W08-04). */
export const BREAK_GLASS_DOES_NOT_BYPASS_SCAN_POLICY = true as const;

const GENERIC_REASONS = new Set(
  [
    "admin",
    "needed",
    "need",
    "test",
    "support",
    "-",
    ".",
    "n/a",
    "na",
    "help",
  ].map((s) => s.toLowerCase()),
);

export function normalizeBreakGlassReason(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

export function isValidBreakGlassReason(raw: string): boolean {
  const normalized = normalizeBreakGlassReason(raw);
  if (
    normalized.length < WORKSPACE_BREAK_GLASS_MIN_REASON_LENGTH ||
    normalized.length > WORKSPACE_BREAK_GLASS_MAX_REASON_LENGTH
  ) {
    return false;
  }
  if (GENERIC_REASONS.has(normalized.toLowerCase())) {
    return false;
  }
  if (/<[^>]+>/.test(normalized)) {
    return false;
  }
  return true;
}

export function resolveBreakGlassExpiresAt(
  ttlMinutes: number,
  now: Date = new Date(),
): Date {
  return new Date(now.getTime() + ttlMinutes * 60_000);
}

export function normalizeBreakGlassTtlMinutes(raw: number): number | null {
  if (!Number.isFinite(raw)) {
    return null;
  }
  const rounded = Math.floor(raw);
  if (
    rounded < WORKSPACE_BREAK_GLASS_MIN_TTL_MINUTES ||
    rounded > WORKSPACE_BREAK_GLASS_MAX_TTL_MINUTES
  ) {
    return null;
  }
  return rounded;
}
