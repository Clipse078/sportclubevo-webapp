import type { ClubStrategyAuthoringDto } from "./club-strategy-service";

/** True when a tenant row exists in ClubStrategy (first save creates the row). */
export function hasPersistedClubStrategy(
  dto: Pick<ClubStrategyAuthoringDto, "id">,
): boolean {
  return dto.id != null;
}

export function formatStrategyDateLabel(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatStrategyPeriodSummary(input: {
  periodLabel: string | null;
  periodStartsAt: string | null;
  periodEndsAt: string | null;
}): string {
  const label = input.periodLabel?.trim();
  const from = formatStrategyDateLabel(input.periodStartsAt);
  const to = formatStrategyDateLabel(input.periodEndsAt);
  const range =
    from !== "—" || to !== "—" ? `${from} – ${to}` : null;
  if (label && range) return `${label} (${range})`;
  if (label) return label;
  if (range) return range;
  return "—";
}