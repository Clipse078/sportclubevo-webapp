import { resolveTeamEventContextLabel } from "@/lib/dashboard/personal-context/context-labels";
import type { PersonalContext } from "@/lib/dashboard/personal-context/types";
import { resolveProgrammeCalendarMicroSemantics } from "@/lib/calendar/sce-calendar-engine/calendar-micro-semantics";
import type {
  PersonalProgrammeItem,
  PersonalProgrammePresentationStatus,
  PersonalProgrammeSourceType,
} from "@/lib/personal-agenda/personal-programme-types";
import type { EventType } from "@prisma/client";
import type { ProgrammeActivityKind, ProgrammeItem } from "./types";

function programmeKindToSourceType(kind: ProgrammeActivityKind): PersonalProgrammeSourceType {
  if (kind === "CLUB_EVENT") return "EVENT";
  return kind;
}

function programmeKindToEventType(kind: ProgrammeActivityKind): EventType | undefined {
  switch (kind) {
    case "TRAINING":
      return "TRAINING";
    case "MATCH":
      return "MATCH";
    case "TOURNAMENT":
      return "TOURNAMENT";
    case "CLUB_EVENT":
      return "OTHER";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function normalizePresentationStatus(
  status: ProgrammeItem["status"],
): PersonalProgrammePresentationStatus | undefined {
  if (typeof status !== "string") return undefined;
  const normalized = status.toLowerCase();
  if (
    normalized === "scheduled" ||
    normalized === "cancelled" ||
    normalized === "postponed" ||
    normalized === "completed" ||
    normalized === "live"
  ) {
    return normalized;
  }
  return undefined;
}

/**
 * Maps canonical ProgrammeItem rows to the personal programme / calendar contract.
 * Preserves SCE presentation for MICRO rendering via `canonicalPresentation`.
 */
export function programmeItemToPersonalProgrammeItem(
  item: ProgrammeItem,
  context: PersonalContext,
): PersonalProgrammeItem {
  const sourceType = programmeKindToSourceType(item.kind);
  const semantics = resolveProgrammeCalendarMicroSemantics(item);
  const contextLabel = item.teamId
    ? resolveTeamEventContextLabel(context, item.teamId)
    : undefined;
  const typeLabel = item.presentation.typeLabel?.trim() || sourceType;
  const title = semantics.identityLabel.trim() || typeLabel;
  const venue = semantics.locationLabel;

  return {
    id: item.resourceKey,
    sourceType,
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    allDay: item.allDay,
    title,
    subtitle: undefined,
    contextLabel,
    venue,
    status: normalizePresentationStatus(item.status),
    deepLink: item.navigationTarget,
    teamName: undefined,
    typeLabel,
    eventType: programmeKindToEventType(item.kind),
    ariaLabel: `${typeLabel}: ${title}`,
    canonicalPresentation: item.presentation,
  };
}

export function programmeItemsToPersonalProgrammeItems(
  items: readonly ProgrammeItem[],
  context: PersonalContext,
): PersonalProgrammeItem[] {
  return items.map((item) => programmeItemToPersonalProgrammeItem(item, context));
}
