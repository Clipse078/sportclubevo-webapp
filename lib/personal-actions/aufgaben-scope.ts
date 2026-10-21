export type AufgabenBereich = "meine" | "verwaltung" | "anforderungen";

/** Legacy bereich value — redirected to Verwaltung + type filter (DS-10 R4.2). */
export const AUFGABEN_LEGACY_ANFORDERUNGEN_BEREICH = "anforderungen" as const;

export type PersonalInboxFilterParam = "all" | "tasks" | "attendance" | "requirements";

export type VerwaltungTypeFilterParam = "all" | "tasks" | "requirements";

export function parseAufgabenBereich(value: string | undefined): AufgabenBereich {
  if (value === "verwaltung") return "verwaltung";
  if (value === "anforderungen") return "anforderungen";
  return "meine";
}

export function parsePersonalInboxFilter(value: string | undefined): PersonalInboxFilterParam {
  if (value === "tasks" || value === "attendance" || value === "requirements") {
    return value;
  }
  return "all";
}

export function parseVerwaltungTypeFilter(value: string | undefined): VerwaltungTypeFilterParam {
  if (value === "tasks" || value === "requirements") {
    return value;
  }
  return "all";
}

export function buildAufgabenBereichHref(
  bereich: Exclude<AufgabenBereich, typeof AUFGABEN_LEGACY_ANFORDERUNGEN_BEREICH>,
  basePath = "/dashboard/aufgaben",
): string {
  if (bereich === "meine") {
    return `${basePath}?bereich=meine`;
  }
  return `${basePath}?bereich=verwaltung`;
}

/** Canonical Verwaltung management href with optional local type filter. */
export function buildVerwaltungManagementHref(
  typeFilter: VerwaltungTypeFilterParam,
  basePath = "/dashboard/aufgaben",
): string {
  const params = new URLSearchParams({ bereich: "verwaltung" });
  if (typeFilter !== "all") {
    params.set("type", typeFilter);
  }
  return `${basePath}?${params.toString()}`;
}

/** Maps legacy `?bereich=anforderungen` deep links into unified Verwaltung. */
export function buildLegacyAnforderungenBereichRedirectHref(
  searchParams: Record<string, string | undefined>,
  basePath = "/dashboard/aufgaben",
): string {
  const params = new URLSearchParams();
  params.set("bereich", "verwaltung");
  params.set("type", "requirements");
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "bereich" || value === undefined) continue;
    params.set(key, value);
  }
  return `${basePath}?${params.toString()}`;
}

export function buildPersonalInboxFilterHref(
  filter: PersonalInboxFilterParam,
  basePath = "/dashboard/aufgaben",
): string {
  const params = new URLSearchParams({ bereich: "meine" });
  if (filter !== "all") {
    params.set("filter", filter);
  }
  return `${basePath}?${params.toString()}`;
}

export function buildVerwaltungTypeFilterHref(
  filter: VerwaltungTypeFilterParam,
  basePath = "/dashboard/aufgaben",
): string {
  return buildVerwaltungManagementHref(filter, basePath);
}
