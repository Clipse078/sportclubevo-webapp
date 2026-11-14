/**
 * Same-origin return paths for dashboard and Vereinsentwicklung flows (e.g. sprint → task → sprint).
 */
export function sanitizeInternalAppReturnPath(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const allowed =
    trimmed.startsWith("/dashboard/") || trimmed.startsWith("/vereinsleitung/");
  if (!allowed) {
    return null;
  }

  if (
    trimmed.includes("://") ||
    trimmed.includes("..") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\") ||
    trimmed.includes("?") ||
    trimmed.includes("#")
  ) {
    return null;
  }

  return trimmed;
}