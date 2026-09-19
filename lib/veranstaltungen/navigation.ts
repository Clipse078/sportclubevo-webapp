export type VeranstaltungenTab = "BEVORSTEHEND" | "VERGANGEN" | "ARCHIV";

export function normalizeVeranstaltungenTab(
  value: string | null | undefined,
): VeranstaltungenTab {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "archiv") return "ARCHIV";
  if (normalized === "vergangen" || normalized === "past") return "VERGANGEN";
  return "BEVORSTEHEND";
}

export type VeranstaltungenPublicationFilter = "ALLE" | "PUBLIC" | "INTERNAL";
export type VeranstaltungenReviewFilter = "ALLE" | "DRAFT" | "APPROVED" | "PUBLISHED";

export type VeranstaltungenUrlState = {
  tab: VeranstaltungenTab;
  /** Explicit list filter — only set after user action, never implicit default month. */
  month: string | null;
  /** Calendar rail display month when browsing without list filter. */
  cal: string | null;
  search: string;
  location: string | null;
  review: VeranstaltungenReviewFilter;
  publication: VeranstaltungenPublicationFilter;
};

export function buildVeranstaltungenHref(
  basePath: string,
  state: VeranstaltungenUrlState,
): string {
  const params = new URLSearchParams();
  if (state.tab === "VERGANGEN") params.set("tab", "vergangen");
  if (state.tab === "ARCHIV") params.set("tab", "archiv");
  if (state.month) params.set("month", state.month);
  if (state.cal && !state.month) params.set("cal", state.cal);
  if (state.search.trim()) params.set("q", state.search.trim());
  if (state.location) params.set("location", state.location);
  if (state.review !== "ALLE") params.set("review", state.review.toLowerCase());
  if (state.publication !== "ALLE") params.set("pub", state.publication.toLowerCase());
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function normalizeVeranstaltungenSearch(raw: string | undefined): string {
  return raw?.trim() ?? "";
}

export function normalizeVeranstaltungenReviewFilter(
  raw: string | undefined,
): VeranstaltungenReviewFilter {
  const v = raw?.trim().toUpperCase();
  if (v === "DRAFT" || v === "APPROVED" || v === "PUBLISHED") return v;
  return "ALLE";
}

export function normalizeVeranstaltungenPublicationFilter(
  raw: string | undefined,
): VeranstaltungenPublicationFilter {
  const v = raw?.trim().toUpperCase();
  if (v === "PUBLIC" || v === "INTERNAL") return v;
  return "ALLE";
}
