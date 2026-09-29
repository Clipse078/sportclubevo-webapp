export const SCE_SELECTOR_DISCOVER_ERROR_UNAUTHORIZED =
  "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.";

export const SCE_SELECTOR_DISCOVER_ERROR_FORBIDDEN =
  "Du hast keine Berechtigung, diese Auswahl zu sehen.";

export const SCE_SELECTOR_DISCOVER_ERROR_LOAD_FAILED = "Auswahl konnte nicht geladen werden.";

export function sceSelectorDiscoverErrorForHttpStatus(status: number, bodyError?: string | null): string {
  if (status === 401) return SCE_SELECTOR_DISCOVER_ERROR_UNAUTHORIZED;
  if (status === 403) return SCE_SELECTOR_DISCOVER_ERROR_FORBIDDEN;
  if (bodyError && bodyError !== "Forbidden" && bodyError !== "Unauthorized") {
    return bodyError;
  }
  if (status >= 500) return SCE_SELECTOR_DISCOVER_ERROR_LOAD_FAILED;
  return SCE_SELECTOR_DISCOVER_ERROR_LOAD_FAILED;
}

export function sceSelectorDiscoverApiErrorBody(status: number): string {
  if (status === 401) return SCE_SELECTOR_DISCOVER_ERROR_UNAUTHORIZED;
  if (status === 403) return SCE_SELECTOR_DISCOVER_ERROR_FORBIDDEN;
  return SCE_SELECTOR_DISCOVER_ERROR_LOAD_FAILED;
}
