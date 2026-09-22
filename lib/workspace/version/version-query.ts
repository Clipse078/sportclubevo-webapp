export type WorkspaceVersionIdQueryResolution =
  | { mode: "current" }
  | { mode: "historical"; versionId: string }
  | { mode: "invalid" };

/**
 * Parses ?versionId= for historical download/preview.
 * Explicit invalid values must never fall back to the current version.
 */
export function resolveWorkspaceVersionIdQuery(
  searchParams: URLSearchParams,
): WorkspaceVersionIdQueryResolution {
  if (!searchParams.has("versionId")) {
    return { mode: "current" };
  }

  const values = searchParams.getAll("versionId");
  if (values.length !== 1) {
    return { mode: "invalid" };
  }

  const trimmed = values[0]?.trim() ?? "";
  if (!trimmed) {
    return { mode: "invalid" };
  }

  return { mode: "historical", versionId: trimmed };
}

/**
 * Normalizes service-level versionId: omitted/null means current; explicit
 * empty/whitespace is invalid and must not resolve to current.
 */
export function normalizeWorkspaceHistoricalVersionId(
  versionId: string | null | undefined,
): string | null | undefined {
  if (versionId === undefined || versionId === null) {
    return null;
  }

  const trimmed = versionId.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed;
}
