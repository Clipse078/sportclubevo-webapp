/**
 * SCE-OPS-01 — canonical Veranstaltung (club event) admin routes.
 *
 * The product uses the edit surface as the canonical destination for an
 * existing Veranstaltung. List/overview links and Planning Hub navigation
 * must never target a bare `/dashboard/veranstaltungen/[id]` path without
 * `/edit` unless that route explicitly redirects (see detail page).
 */

export const VERANSTALTUNGEN_LIST_PATH = "/dashboard/veranstaltungen";
export const VERANSTALTUNGEN_CREATE_PATH = "/dashboard/veranstaltungen/new";

/** Canonical admin destination for an existing Veranstaltung record. */
export function getVeranstaltungHref(eventId: string): string {
  const id = eventId.trim();
  return `${VERANSTALTUNGEN_LIST_PATH}/${encodeURIComponent(id)}/edit`;
}

/** Alias for callers that conceptually navigate to "detail" (same as edit). */
export function getVeranstaltungDetailHref(eventId: string): string {
  return getVeranstaltungHref(eventId);
}
