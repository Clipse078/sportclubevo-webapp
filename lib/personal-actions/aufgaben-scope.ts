export type AufgabenBereich = "meine" | "verwaltung";

export type PersonalInboxFilterParam = "all" | "tasks" | "attendance";

export function parseAufgabenBereich(value: string | undefined): AufgabenBereich {
  return value === "verwaltung" ? "verwaltung" : "meine";
}

export function parsePersonalInboxFilter(value: string | undefined): PersonalInboxFilterParam {
  if (value === "tasks" || value === "attendance") {
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
