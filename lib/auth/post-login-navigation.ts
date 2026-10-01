/**
 * Resolve Auth.js credentials sign-in redirect targets for same-tab navigation.
 * Uses an explicit origin so the logic stays unit-testable without jsdom.
 */
export function resolvePostLoginNavigationTarget(
  authRedirectUrl: string | null | undefined,
  origin: string,
  fallbackPath = "/dashboard",
): string {
  const trimmed = authRedirectUrl?.trim();
  if (!trimmed) return fallbackPath;

  try {
    const parsed = new URL(trimmed, origin);
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return path || fallbackPath;
  } catch {
    return fallbackPath;
  }
}

/** Client-only helper for login form hard navigation after credentials sign-in. */
export function resolvePostLoginNavigationTargetFromWindow(
  authRedirectUrl: string | null | undefined,
  fallbackPath = "/dashboard",
): string {
  if (typeof window === "undefined") return fallbackPath;
  return resolvePostLoginNavigationTarget(authRedirectUrl, window.location.origin, fallbackPath);
}
