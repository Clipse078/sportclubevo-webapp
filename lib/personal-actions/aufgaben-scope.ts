export type AufgabenBereich = "meine" | "verwaltung" | "anforderungen";

export type PersonalInboxFilterParam = "all" | "tasks" | "attendance" | "requirements";

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

export function buildAufgabenBereichHref(
  bereich: AufgabenBereich,
  basePath = "/dashboard/aufgaben",
): string {
  if (bereich === "meine") {
    return `${basePath}?bereich=meine`;
  }
  if (bereich === "anforderungen") {
    return `${basePath}?bereich=anforderungen`;
  }
  return `${basePath}?bereich=verwaltung`;
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
