import type { WeekplannerConflict } from "./types";

export function weekplannerConflictKindLabel(conflict: WeekplannerConflict): string {
  if (conflict.resourceKind === "DRESSING_ROOM") return "Garderobenkonflikt";
  if (conflict.resourceKind === "PITCH_HALL") return "Spielfeldkonflikt";
  return "Planungskonflikt";
}

export function formatConflictTimeRange(
  start: Date | undefined,
  end: Date | undefined,
  locale: string,
  timeZone: string,
): string | null {
  if (!start || !end) return null;
  const fmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone });
  return `${fmt.format(start)}–${fmt.format(end)}`;
}

/** Operator-facing one-line summary for list/day badges. */
export function weekplannerConflictSummaryLine(
  conflict: WeekplannerConflict,
  locale: string,
  timeZone: string,
): string {
  const kind = weekplannerConflictKindLabel(conflict);
  const occupancy = formatConflictTimeRange(
    conflict.occupancyStartAt,
    conflict.occupancyEndAt,
    locale,
    timeZone,
  );
  const resource = conflict.facilityResourceName;
  const partner = conflict.partnerTitle;
  const parts = [kind, resource];
  if (occupancy) parts.push(`reserviert ${occupancy}`);
  if (partner) parts.push(`Überschneidung mit ${partner}`);
  return parts.join(" · ");
}

export function weekplannerConflictBadgeTitle(
  conflicts: WeekplannerConflict[],
  locale: string,
  timeZone: string,
): string {
  return conflicts
    .map((c) => weekplannerConflictSummaryLine(c, locale, timeZone))
    .join(" | ");
}
