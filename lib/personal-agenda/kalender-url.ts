import { resolveMatchcenterMonthWindow } from "@/lib/matchcenter/month-range";

export type PersonalKalenderSourceFilter = "alle" | "termine" | "aufgaben";

export type PersonalKalenderUrlState = {
  month: string;
  quelle: PersonalKalenderSourceFilter;
};

export function parsePersonalKalenderUrlState(
  searchParams: Record<string, string | string[] | undefined>,
  now: Date,
  timeZone?: string,
): PersonalKalenderUrlState {
  const monthRaw = searchParams.monat;
  const defaultMonth = timeZone
    ? resolveMatchcenterMonthWindow({ now, timeZone }).param
    : `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}`;
  const month =
    typeof monthRaw === "string" && /^\d{4}-\d{2}$/.test(monthRaw)
      ? monthRaw
      : defaultMonth;

  const quelleRaw = searchParams.quelle;
  let quelle: PersonalKalenderSourceFilter = "alle";
  if (quelleRaw === "aufgaben" || quelleRaw === "termine") {
    quelle = quelleRaw;
  }

  return { month, quelle };
}

export function buildPersonalKalenderHref(
  base: string,
  state: Partial<PersonalKalenderUrlState>,
  current: PersonalKalenderUrlState,
): string {
  const next = { ...current, ...state };
  const params = new URLSearchParams();
  if (next.month) params.set("monat", next.month);
  if (next.quelle && next.quelle !== "alle") params.set("quelle", next.quelle);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
