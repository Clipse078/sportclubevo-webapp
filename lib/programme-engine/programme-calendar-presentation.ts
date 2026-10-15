import { formatFixtureTime } from "@/components/admin/teams/upcoming-matches/team-upcoming-matches-formatters";
import type { PersonalProgrammeSourceType } from "@/lib/personal-agenda/personal-programme-types";
import { getProgrammeSourcePresentation } from "@/lib/personal-agenda/programme-source-presentation";
import { resolvePersonalCalendarDayMarkerSlots } from "@/lib/personal-agenda/personal-calendar-day-marker-slots";
import {
  buildCalendarMicroAccessibleLabel,
  resolveProgrammeCalendarMicroSemantics,
} from "@/lib/calendar/sce-calendar-engine/calendar-micro-semantics";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { sortProgrammeItems } from "./programme-sort";
import type { ProgrammeActivityKind, ProgrammeItem } from "./types";

export const PROGRAMME_CALENDAR_VISIBLE_ENTRIES = 2;

const KIND_TYPE_LABEL: Record<ProgrammeActivityKind, string> = {
  TRAINING: "TRAINING",
  MATCH: "SPIEL",
  TOURNAMENT: "TURNIER",
  CLUB_EVENT: "VERANSTALTUNG",
};

export type ProgrammeCalendarMicroEntryKind = ProgrammeActivityKind | "TASK";

export type ProgrammeCalendarMicroEntry = {
  id: string;
  kind: ProgrammeCalendarMicroEntryKind;
  typeLabel: string;
  timeLabel: string;
  /** Team / fixture / event identity (one owner). */
  identityLabel: string;
  /** Compact location / resource (one owner). */
  locationLabel?: string;
  /** @deprecated Use identityLabel — kept for transitional consumers. */
  title: string;
  /** @deprecated Use locationLabel — kept for transitional consumers. */
  contextLine?: string;
  href: string;
  accessibleLabel: string;
  paletteKey: ReturnType<typeof getProgrammeSourcePresentation>["paletteKey"];
  chipTintClass: string;
  chipBorderClass: string;
  chipTextClass: string;
  cancelled: boolean;
};

export function programmeKindToCalendarSourceType(
  kind: ProgrammeActivityKind,
): PersonalProgrammeSourceType {
  if (kind === "CLUB_EVENT") return "EVENT";
  return kind;
}

function isCancelledItem(item: ProgrammeItem): boolean {
  const status = item.presentation.status ?? item.status;
  if (typeof status === "string") {
    return status.toLowerCase() === "cancelled";
  }
  return status?.semantic === "cancelled";
}

export function buildProgrammeCalendarMicroEntry(
  item: ProgrammeItem,
  fmtCfg: TenantFormatConfig,
): ProgrammeCalendarMicroEntry {
  const sourceType = programmeKindToCalendarSourceType(item.kind);
  const palette = getProgrammeSourcePresentation(sourceType);
  const timeLabel = item.allDay
    ? "Ganztägig"
    : formatFixtureTime(item.startsAt, fmtCfg);
  const typeLabel = KIND_TYPE_LABEL[item.kind];
  const { identityLabel, locationLabel } = resolveProgrammeCalendarMicroSemantics(item);
  const accessibleLabel = buildCalendarMicroAccessibleLabel({
    typeLabel,
    timeLabel,
    identityLabel,
    locationLabel,
  });

  return {
    id: item.id,
    kind: item.kind,
    typeLabel,
    timeLabel,
    identityLabel,
    locationLabel,
    title: identityLabel,
    contextLine: locationLabel,
    href: item.navigationTarget,
    accessibleLabel,
    paletteKey: palette.paletteKey,
    chipTintClass: palette.chipTintClass,
    chipBorderClass: palette.chipBorderClass,
    chipTextClass: palette.chipTextClass,
    cancelled: isCancelledItem(item),
  };
}

export type ProgrammeCalendarDayPresentation = {
  entries: ProgrammeCalendarMicroEntry[];
  overflowCount: number;
  markerSourceTypes: readonly PersonalProgrammeSourceType[];
  activityCount: number;
};

export function buildProgrammeCalendarDayPresentation(
  dayItems: readonly ProgrammeItem[],
  fmtCfg: TenantFormatConfig,
): ProgrammeCalendarDayPresentation {
  const sorted = sortProgrammeItems([...dayItems]);
  const activityCount = sorted.length;
  const visible = sorted.slice(0, PROGRAMME_CALENDAR_VISIBLE_ENTRIES);
  const overflowCount = Math.max(0, activityCount - visible.length);
  const entries = visible.map((item) => buildProgrammeCalendarMicroEntry(item, fmtCfg));
  const sourceTypes = sorted.map((item) => programmeKindToCalendarSourceType(item.kind));
  const { markerSlots } = resolvePersonalCalendarDayMarkerSlots(sourceTypes, activityCount);

  return {
    entries,
    overflowCount,
    markerSourceTypes: markerSlots,
    activityCount,
  };
}
