/**
 * WORKSPACE-08-03 — governance hold reason validation.
 */

export const WORKSPACE_GOVERNANCE_HOLD_MIN_REASON_LENGTH = 12;
export const WORKSPACE_GOVERNANCE_HOLD_MAX_REASON_LENGTH = 500;

const GENERIC_HOLD_REASONS = new Set(
  [
    "admin",
    "hold",
    "legal",
    "needed",
    "need",
    "test",
    "support",
    "-",
    ".",
    "n/a",
    "na",
    "help",
    "governance",
  ].map((s) => s.toLowerCase()),
);

export function normalizeGovernanceHoldReason(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

export function isValidGovernanceHoldReason(raw: string): boolean {
  const normalized = normalizeGovernanceHoldReason(raw);
  if (
    normalized.length < WORKSPACE_GOVERNANCE_HOLD_MIN_REASON_LENGTH ||
    normalized.length > WORKSPACE_GOVERNANCE_HOLD_MAX_REASON_LENGTH
  ) {
    return false;
  }
  if (GENERIC_HOLD_REASONS.has(normalized.toLowerCase())) {
    return false;
  }
  if (/<[^>]+>/.test(normalized)) {
    return false;
  }
  return true;
}
