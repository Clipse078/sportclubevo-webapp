import { formatFixtureTime } from "@/components/admin/teams/upcoming-matches/team-upcoming-matches-formatters";
import type { PersonalProgrammeSourceType } from "@/lib/personal-agenda/personal-programme-types";
import { getProgrammeSourcePresentation } from "@/lib/personal-agenda/programme-source-presentation";
import { resolvePersonalCalendarDayMarkerSlots } from "@/lib/personal-agenda/personal-calendar-day-marker-slots";
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

export type ProgrammeCalendarMicroEntry = {
  id: string;
  kind: ProgrammeActivityKind;
  typeLabel: string;
  timeLabel: string;
  title: string;
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

function resolveMicroTitle(item: ProgrammeItem): string {
  const model = item.presentation;
  switch (item.kind) {
    case "MATCH":
      if (model.kind !== "MATCH") return item.kind;
      return `vs ${model.fixture.away.displayName}`;
    case "TRAINING":
      if (model.kind !== "TRAINING") return item.kind;
      return model.team?.name?.trim() || model.trainingTitle;
    case "TOURNAMENT":
      if (model.kind !== "TOURNAMENT") return item.kind;
      return model.tournamentTitle;
    case "CLUB_EVENT":
      if (model.kind !== "CLUB_EVENT") return item.kind;
      return model.eventTitle;
    default: {
      const _exhaustive: never = item.kind;
      return _exhaustive;
    }
  }
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
  const title = resolveMicroTitle(item);
  const accessibleLabel = `${typeLabel}, ${timeLabel}, ${title}`;

  return {
    id: item.id,
    kind: item.kind,
    typeLabel,
    timeLabel,
    title,
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
