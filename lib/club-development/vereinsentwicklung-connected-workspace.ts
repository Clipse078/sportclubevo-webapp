/**
 * Vereinsentwicklung — five connected workspace views (single IA).
 */

import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";
import { PLANNING_ALLOCATIONS_VIEW_PERMISSIONS } from "@/lib/permissions/planning-allocation-permissions";
import {
  CD_STRATEGIE_ZIELE_BASE,
  CD_VORHABEN_UMSETZUNG_BASE,
  CD_WORKSPACE_ANSICHT_QUERY,
  buildStrategieUndZieleHref,
  buildVorhabenUndUmsetzungHref,
} from "./vereinsentwicklung-workspace-routing";

export const CD_CLUB_ENTWICKLUNG_BASE = "/vereinsleitung/club-entwicklung" as const;

/** Authorised Org-Einheit filter carried across all five views. */
export const CD_WORKSPACE_ORG_UNIT_QUERY = "orgEinheit" as const;

export const CD_CONNECTED_VIEWS = [
  "uebersicht",
  "strategien",
  "ziele",
  "aufgaben",
  "umsetzungsplanung",
] as const;

export type CdConnectedView = (typeof CD_CONNECTED_VIEWS)[number];

export const CD_CONNECTED_VIEW_LABELS: Record<CdConnectedView, string> = {
  uebersicht: "Übersicht",
  strategien: "Strategien",
  ziele: "Ziele",
  aufgaben: "Aufgaben",
  umsetzungsplanung: "Umsetzungsplanung",
};

export const CD_CONNECTED_NAV_KEYS: Record<CdConnectedView, string> = {
  uebersicht: "club-entwicklung-uebersicht",
  strategien: "club-entwicklung-strategien",
  ziele: "club-entwicklung-ziele",
  aufgaben: "club-entwicklung-aufgaben",
  umsetzungsplanung: "club-entwicklung-umsetzungsplanung",
};

const VIEW_PERMISSIONS: Record<
  CdConnectedView,
  { anyOf: PermissionKey[]; requiresPlanning?: boolean }
> = {
  uebersicht: { anyOf: [PERMISSIONS.TARGETS_VIEW, PERMISSIONS.INITIATIVES_VIEW, PERMISSIONS.MEETINGS_VIEW] },
  strategien: { anyOf: [PERMISSIONS.TARGETS_VIEW, PERMISSIONS.TARGETS_MANAGE] },
  ziele: { anyOf: [PERMISSIONS.TARGETS_VIEW, PERMISSIONS.TARGETS_MANAGE] },
  aufgaben: { anyOf: [PERMISSIONS.INITIATIVES_VIEW, PERMISSIONS.INITIATIVES_MANAGE, PERMISSIONS.TASKS_VIEW] },
  umsetzungsplanung: {
    anyOf: [...PLANNING_ALLOCATIONS_VIEW_PERMISSIONS, PERMISSIONS.INITIATIVES_VIEW, PERMISSIONS.INITIATIVES_MANAGE],
    requiresPlanning: true,
  },
};

export function canAccessConnectedView(
  view: CdConnectedView,
  permissionKeys: readonly string[],
  hasPlanningAccess: boolean,
): boolean {
  const rule = VIEW_PERMISSIONS[view];
  const hasPerm = rule.anyOf.some((key) => permissionKeys.includes(key));
  if (!hasPerm) return false;
  if (view === "umsetzungsplanung" && !hasPlanningAccess) return false;
  return true;
}

export function filterVisibleConnectedViews(
  permissionKeys: readonly string[],
  hasPlanningAccess: boolean,
): CdConnectedView[] {
  return CD_CONNECTED_VIEWS.filter((view) =>
    canAccessConnectedView(view, permissionKeys, hasPlanningAccess),
  );
}

export function buildConnectedWorkspaceHref(
  view: CdConnectedView,
  params?: Record<string, string | undefined | null>,
): string {
  switch (view) {
    case "uebersicht":
      return buildUebersichtHref(params);
    case "strategien":
      return buildStrategieUndZieleHref("strategie", params);
    case "ziele":
      return buildStrategieUndZieleHref("ziele", params);
    case "aufgaben":
      return buildVorhabenUndUmsetzungHref("aufgaben", params);
    case "umsetzungsplanung":
      return buildVorhabenUndUmsetzungHref("umsetzungsphasen", params);
    default:
      return buildUebersichtHref(params);
  }
}

export function buildUebersichtHref(params?: Record<string, string | undefined | null>): string {
  const sp = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value?.trim()) sp.set(key, value.trim());
    }
  }
  const q = sp.toString();
  return q ? `${CD_CLUB_ENTWICKLUNG_BASE}?${q}` : CD_CLUB_ENTWICKLUNG_BASE;
}

export function navHrefForConnectedView(view: CdConnectedView): string {
  return buildConnectedWorkspaceHref(view);
}

export function parseConnectedViewFromLocation(
  pathname: string,
  searchParams: URLSearchParams | Record<string, string | undefined | null>,
): CdConnectedView | null {
  const get = (key: string): string | null => {
    if (searchParams instanceof URLSearchParams) return searchParams.get(key);
    const raw = searchParams[key];
    return raw?.trim() ? raw.trim() : null;
  };

  if (pathname === CD_CLUB_ENTWICKLUNG_BASE || pathname.startsWith(`${CD_CLUB_ENTWICKLUNG_BASE}/`)) {
    return "uebersicht";
  }

  if (pathname === CD_STRATEGIE_ZIELE_BASE || pathname.startsWith(`${CD_STRATEGIE_ZIELE_BASE}/`)) {
    const ansicht = get(CD_WORKSPACE_ANSICHT_QUERY);
    return ansicht === "ziele" ? "ziele" : "strategien";
  }

  if (
    pathname === CD_VORHABEN_UMSETZUNG_BASE ||
    pathname.startsWith(`${CD_VORHABEN_UMSETZUNG_BASE}/`) ||
    pathname.startsWith("/vereinsleitung/sprints/") ||
    pathname.startsWith("/vereinsleitung/initiativen/")
  ) {
    const ansicht = get(CD_WORKSPACE_ANSICHT_QUERY);
    if (ansicht === "umsetzungsphasen") return "umsetzungsplanung";
    if (ansicht === "aufgaben") return "aufgaben";
    if (pathname.startsWith("/vereinsleitung/sprints/")) return "umsetzungsplanung";
    return "aufgaben";
  }

  if (pathname.startsWith("/vereinsleitung/targets/")) return "ziele";
  if (pathname.startsWith("/vereinsleitung/strategie/")) return "strategien";

  return null;
}

export function carryWorkspaceSearchParams(
  source: URLSearchParams | Record<string, string | undefined | null>,
  extra?: Record<string, string | undefined | null>,
): Record<string, string | undefined | null> {
  const out: Record<string, string | undefined | null> = { ...extra };
  const read = (key: string) => {
    if (source instanceof URLSearchParams) return source.get(key) ?? undefined;
    return source[key] ?? undefined;
  };
  const org = read(CD_WORKSPACE_ORG_UNIT_QUERY);
  if (org) out[CD_WORKSPACE_ORG_UNIT_QUERY] = org;
  for (const key of ["targetId", "initiativeId", "search", "returnTo"]) {
    const v = read(key);
    if (v) out[key] = v;
  }
  return out;
}