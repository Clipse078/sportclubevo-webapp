import { formatFixtureTime } from "@/components/admin/teams/upcoming-matches/team-upcoming-matches-formatters";
import type { ProgrammeCalendarMicroEntry } from "@/lib/programme-engine/programme-calendar-presentation";
import { getCalendarItemPresentation } from "@/lib/personal-agenda/calendar-item-presentation";
import {
  buildCalendarMicroAccessibleLabel,
  resolvePersonalCalendarMicroSemantics,
} from "@/lib/calendar/sce-calendar-engine/calendar-micro-semantics";
import type { NormalizedCalendarItem } from "@/lib/personal-agenda/normalized-calendar-item-types";
import { mapCalendarSemanticTypeToProgrammeSource } from "@/lib/personal-agenda/map-calendar-semantic-to-programme-source";
import { resolvePersonalCalendarDayMarkerSlots } from "@/lib/personal-agenda/personal-calendar-day-marker-slots";
import { sortNormalizedCalendarItems } from "@/lib/personal-agenda/calendar-item-sort";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { PROGRAMME_CALENDAR_VISIBLE_ENTRIES } from "@/lib/programme-engine/programme-calendar-presentation";

const TASK_TYPE_LABEL = "AUFGABE";

function resolvePersonalMicroTypeLabel(item: NormalizedCalendarItem): string {
  if (item.semanticType === "TASK") {
    return TASK_TYPE_LABEL;
  }
  return item.typeLabel?.trim().toUpperCase() || item.semanticType;
}

function resolvePersonalMicroTimeLabel(
  item: NormalizedCalendarItem,
  timeLabelById: Record<string, string>,
  fmtCfg: TenantFormatConfig,
): string {
  if (item.semanticType === "TASK" && item.allDay) {
    return "Fällig";
  }
  if (item.allDay) {
    return "Ganztägig";
  }
  const fromMap = timeLabelById[item.id]?.trim();
  if (fromMap) return fromMap;
  return formatFixtureTime(item.startAt, fmtCfg);
}

export function buildPersonalCalendarMicroEntry(
  item: NormalizedCalendarItem,
  fmtCfg: TenantFormatConfig,
  timeLabelById: Record<string, string>,
  options: { tenantDisplayNames?: string[] } = {},
): ProgrammeCalendarMicroEntry {
  const sourceType = mapCalendarSemanticTypeToProgrammeSource(item.semanticType);
  const palette = getCalendarItemPresentation(item.semanticType);
  const typeLabel = resolvePersonalMicroTypeLabel(item);
  const timeLabel = resolvePersonalMicroTimeLabel(item, timeLabelById, fmtCfg);
  const { identityLabel, locationLabel, visualIdentity, accessibleIdentityPhrase } =
    resolvePersonalCalendarMicroSemantics(item);
  const href = item.deepLink ?? "#";
  const accessibleLabel = buildCalendarMicroAccessibleLabel({
    typeLabel,
    timeLabel,
    identityLabel,
    accessibleIdentityPhrase,
    locationLabel,
  });
  const cancelled =
    item.status === "cancelled" || item.status === "postponed" || item.taskStatus === "CANCELLED";

  const kind =
    item.semanticType === "TRAINING"
      ? "TRAINING"
      : item.semanticType === "MATCH"
        ? "MATCH"
        : item.semanticType === "TOURNAMENT"
          ? "TOURNAMENT"
          : item.semanticType === "TASK"
            ? "TASK"
            : "CLUB_EVENT";

  return {
    id: item.id,
    kind,
    typeLabel,
    timeLabel,
    identityLabel,
    locationLabel,
    visualIdentity,
    title: identityLabel,
    contextLine: locationLabel,
    href,
    accessibleLabel,
    paletteKey: palette.paletteKey,
    chipTintClass: palette.chipTintClass,
    chipBorderClass: palette.chipBorderClass,
    chipTextClass: palette.chipTextClass,
    cancelled,
  };
}

export type PersonalCalendarDayPresentation = {
  entries: ProgrammeCalendarMicroEntry[];
  overflowCount: number;
  markerSourceTypes: ReturnType<typeof mapCalendarSemanticTypeToProgrammeSource>[];
  activityCount: number;
};

export function buildPersonalCalendarDayPresentation(
  dayItems: readonly NormalizedCalendarItem[],
  fmtCfg: TenantFormatConfig,
  timeLabelById: Record<string, string>,
  options: { tenantDisplayNames?: string[] } = {},
): PersonalCalendarDayPresentation {
  const sorted = sortNormalizedCalendarItems([...dayItems]);
  const activityCount = sorted.length;
  const visible = sorted.slice(0, PROGRAMME_CALENDAR_VISIBLE_ENTRIES);
  const overflowCount = Math.max(0, activityCount - visible.length);
  const entries = visible.map((item) =>
    buildPersonalCalendarMicroEntry(item, fmtCfg, timeLabelById, options),
  );
  const sourceTypes = sorted
    .map((item) => mapCalendarSemanticTypeToProgrammeSource(item.semanticType))
    .filter((type): type is NonNullable<typeof type> => type != null);
  const { markerSlots } = resolvePersonalCalendarDayMarkerSlots(sourceTypes, activityCount);

  return {
    entries,
    overflowCount,
    markerSourceTypes: markerSlots,
    activityCount,
  };
}
