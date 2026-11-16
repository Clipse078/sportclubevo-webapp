/**
 * Vereinsentwicklung IA consolidation — canonical workspace routes and legacy aliases.
 */

export const CD_STRATEGIE_ZIELE_BASE = "/vereinsleitung/strategie-und-ziele" as const;
export const CD_VORHABEN_UMSETZUNG_BASE = "/vereinsleitung/vorhaben-und-umsetzung" as const;

export const CD_WORKSPACE_ANSICHT_QUERY = "ansicht" as const;
export const CD_WORKSPACE_PRIORITAETEN_QUERY = "prioritaeten" as const;
/** Expanded Vorhaben card in consolidated Vorhaben & Umsetzung workspace lists. */
export const CD_WORKSPACE_VORHABEN_EXPAND_QUERY = "vorhabenExpand" as const;
/** Deep-link focus for Umsetzungsplanung workspace sections (laufend | geplant | ungeplant | abgeschlossen). */
export const CD_UMSETZUNGSPLANUNG_SECTION_QUERY = "umsetzungsabschnitt" as const;

export const CD_STRATEGIE_ZIELE_VIEWS = ["strategie", "ziele"] as const;
export type CdStrategieZieleView = (typeof CD_STRATEGIE_ZIELE_VIEWS)[number];

export const CD_VORHABEN_UMSETZUNG_VIEWS = ["vorhaben", "aufgaben", "umsetzungsphasen"] as const;
export type CdVorhabenUmsetzungView = (typeof CD_VORHABEN_UMSETZUNG_VIEWS)[number];

export const CD_NAV_WORKSPACE_LABELS = {
  strategieUndZiele: "Strategie & Ziele",
  vorhabenUndUmsetzung: "Vorhaben & Umsetzung",
} as const;

export const CD_STRATEGIE_ZIELE_VIEW_LABELS: Record<CdStrategieZieleView, string> = {
  strategie: "Strategie",
  ziele: "Alle Ziele",
};

export const CD_VORHABEN_UMSETZUNG_VIEW_LABELS: Record<CdVorhabenUmsetzungView, string> = {
  vorhaben: "Vorhaben",
  aufgaben: "Aufgaben",
  umsetzungsphasen: "Umsetzungsphasen",
};

export function parseStrategieZieleView(raw: string | undefined | null): CdStrategieZieleView {
  if (raw === "ziele") return "ziele";
  return "strategie";
}

export function parseVorhabenUmsetzungView(raw: string | undefined | null): CdVorhabenUmsetzungView {
  if (raw === "aufgaben") return "aufgaben";
  if (raw === "umsetzungsphasen") return "umsetzungsphasen";
  return "vorhaben";
}

export function buildStrategieUndZieleHref(
  view: CdStrategieZieleView,
  params?: Record<string, string | undefined | null>,
): string {
  const sp = new URLSearchParams();
  sp.set(CD_WORKSPACE_ANSICHT_QUERY, view);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value?.trim()) sp.set(key, value.trim());
    }
  }
  const q = sp.toString();
  return q ? `${CD_STRATEGIE_ZIELE_BASE}?${q}` : CD_STRATEGIE_ZIELE_BASE;
}

export function buildVorhabenUndUmsetzungHref(
  view: CdVorhabenUmsetzungView,
  params?: Record<string, string | undefined | null>,
): string {
  const sp = new URLSearchParams();
  sp.set(CD_WORKSPACE_ANSICHT_QUERY, view);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value?.trim()) sp.set(key, value.trim());
    }
  }
  const q = sp.toString();
  return q ? `${CD_VORHABEN_UMSETZUNG_BASE}?${q}` : CD_VORHABEN_UMSETZUNG_BASE;
}

/** Preserve filters when routing legacy list URLs into consolidated workspaces. */
export function legacyStrategieListRedirect(search: Record<string, string | undefined>): string {
  return buildStrategieUndZieleHref("strategie", search);
}

export function legacyTargetsListRedirect(search: Record<string, string | undefined>): string {
  return buildStrategieUndZieleHref("ziele", search);
}

export function legacyVorhabenRedirect(search: Record<string, string | undefined>): string {
  return buildVorhabenUndUmsetzungHref("aufgaben", search);
}

export function legacyBacklogRedirect(search: Record<string, string | undefined>): string {
  return buildVorhabenUndUmsetzungHref("vorhaben", {
    ...search,
    [CD_WORKSPACE_PRIORITAETEN_QUERY]: "1",
  });
}

export function legacySprintsRedirect(search: Record<string, string | undefined>): string {
  return buildVorhabenUndUmsetzungHref("umsetzungsphasen", search);
}

export const CD_LEGACY_ROUTE_ALIASES = [
  { legacy: "/vereinsleitung/strategie", workspace: CD_STRATEGIE_ZIELE_BASE, defaultView: "strategie" },
  { legacy: "/vereinsleitung/targets", workspace: CD_STRATEGIE_ZIELE_BASE, defaultView: "ziele" },
  { legacy: "/vereinsleitung/vorhaben", workspace: CD_VORHABEN_UMSETZUNG_BASE, defaultView: "aufgaben" },
  { legacy: "/vereinsleitung/initiativen/backlog", workspace: CD_VORHABEN_UMSETZUNG_BASE, defaultView: "vorhaben" },
  { legacy: "/vereinsleitung/sprints", workspace: CD_VORHABEN_UMSETZUNG_BASE, defaultView: "umsetzungsphasen" },
  { legacy: "/vereinsleitung/initiativen", workspace: CD_VORHABEN_UMSETZUNG_BASE, defaultView: "vorhaben" },
] as const;