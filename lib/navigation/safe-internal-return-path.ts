/**
 * Allow in-app return navigation from Person edit back to Team Cockpit flows.
 * Rejects open redirects and non-dashboard targets.
 */
export function sanitizeInternalDashboardReturnPath(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("/dashboard/")) {
    return null;
  }

  if (
    trimmed.includes("://") ||
    trimmed.includes("..") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\")
  ) {
    return null;
  }

  return trimmed;
}
