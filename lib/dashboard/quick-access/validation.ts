import { QUICK_ACCESS_MAX_PINS } from "./constants";

export type QuickAccessValidationResult =
  | { ok: true; pinnedKeys: string[] }
  | { ok: false; code: string; message: string };

export function validatePinnedKeysInput(
  pinnedKeys: unknown,
  allowedKeys: ReadonlySet<string>,
): QuickAccessValidationResult {
  if (!Array.isArray(pinnedKeys)) {
    return { ok: false, code: "malformed", message: "pinnedKeys must be an array" };
  }

  if (pinnedKeys.length === 0) {
    return {
      ok: false,
      code: "empty",
      message: "At least one shortcut is required",
    };
  }

  if (pinnedKeys.length > QUICK_ACCESS_MAX_PINS) {
    return {
      ok: false,
      code: "too_many",
      message: `Maximum ${QUICK_ACCESS_MAX_PINS} shortcuts allowed`,
    };
  }

  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const raw of pinnedKeys) {
    if (typeof raw !== "string" || raw.trim().length === 0) {
      return { ok: false, code: "malformed", message: "Invalid shortcut key" };
    }
    const key = raw.trim();
    if (!allowedKeys.has(key)) {
      return { ok: false, code: "unknown_key", message: `Unknown shortcut key: ${key}` };
    }
    if (seen.has(key)) {
      return { ok: false, code: "duplicate", message: `Duplicate shortcut key: ${key}` };
    }
    seen.add(key);
    normalized.push(key);
  }

  return { ok: true, pinnedKeys: normalized };
}

/** Preserve user order; drop keys missing from the authorized catalog (stale / revoked). */
export function filterStoredKeysToAuthorized(
  storedKeys: string[],
  authorizedKeys: ReadonlySet<string>,
): string[] {
  const result: string[] = [];
  for (const key of storedKeys) {
    if (authorizedKeys.has(key) && !result.includes(key)) {
      result.push(key);
    }
  }
  return result;
}
