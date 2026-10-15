import type { NormalizedCalendarItem } from "@/lib/personal-agenda/normalized-calendar-item-types";
import type { ProgrammeItem } from "@/lib/programme-engine/types";
import { formatSceActivityLocationHierarchy } from "@/lib/sporting-activity-presentation/canonical";
import type { SceActivityPresentationModel } from "@/lib/sporting-activity-presentation/canonical/types";
import {
  isSceClubEventPresentationModel,
  isSceMatchPresentationModel,
  isSceTrainingPresentationModel,
  isSceTournamentPresentationModel,
} from "@/lib/sporting-activity-presentation/canonical/types";
import { formatSportingActivityCompactPrimaryText } from "@/lib/sporting-activity-presentation/compact";
import type {
  SportingActivityLocation,
  SportingActivityPresentation,
} from "@/lib/sporting-activity-presentation/types";

/** Month-grid MICRO tiles: compact resource, no host club line. */
export const SCE_CALENDAR_MICRO_LOCATION_HIERARCHY_OPTIONS = {
  includeHostClub: false,
} as const;

export type CalendarMicroSemanticFields = {
  identityLabel: string;
  locationLabel?: string;
};

function normalizeComparable(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isGenericSemanticLabel(value: string | undefined, semanticType: string): boolean {
  if (!value?.trim()) return true;
  const normalized = normalizeComparable(value);
  const generics: Record<string, string[]> = {
    TRAINING: ["training"],
    MATCH: ["spiel", "match"],
    TOURNAMENT: ["turnier", "tournament"],
    EVENT: ["veranstaltung", "event"],
    CLUB_EVENT: ["veranstaltung", "event"],
    TASK: ["aufgabe", "task"],
  };
  return (generics[semanticType] ?? []).includes(normalized);
}

function formatHomeAway(homeAway: string | null | undefined): string | undefined {
  if (!homeAway) return undefined;
  const normalized = homeAway.trim().toUpperCase();
  if (normalized === "HOME" || normalized === "H") return "H";
  if (normalized === "AWAY" || normalized === "A") return "A";
  return homeAway.trim();
}

function joinParts(parts: Array<string | undefined | null>, separator = " · "): string | undefined {
  const filtered = parts.map((p) => p?.trim()).filter(Boolean) as string[];
  return filtered.length > 0 ? filtered.join(separator) : undefined;
}

export function formatCalendarMicroLocationLine(
  location: SportingActivityLocation | undefined | null,
): string | undefined {
  if (!location) return undefined;
  return formatSceActivityLocationHierarchy(location, SCE_CALENDAR_MICRO_LOCATION_HIERARCHY_OPTIONS);
}

function locationFromActivityPresentation(
  model: SportingActivityPresentation | SceActivityPresentationModel | undefined,
): string | undefined {
  if (!model?.location) return undefined;
  return formatCalendarMicroLocationLine(model.location);
}

function omitLocationDuplicatingIdentity(
  identityLabel: string,
  locationLabel: string | undefined,
): string | undefined {
  if (!locationLabel?.trim()) return undefined;
  const location = locationLabel.trim();
  const identityNorm = normalizeComparable(identityLabel);
  const locationNorm = normalizeComparable(location);
  if (!locationNorm || identityNorm === locationNorm) return undefined;
  if (identityNorm.includes(locationNorm)) return undefined;
  return location;
}

function resolveProgrammeMicroIdentity(item: ProgrammeItem): string {
  const model = item.presentation;
  switch (item.kind) {
    case "MATCH":
      if (isSceMatchPresentationModel(model)) {
        return `vs ${model.fixture.away.displayName}`;
      }
      return item.kind;
    case "TRAINING":
      if (isSceTrainingPresentationModel(model)) {
        return model.team?.name?.trim() || model.trainingTitle;
      }
      return item.kind;
    case "TOURNAMENT":
      if (isSceTournamentPresentationModel(model)) {
        return model.tournamentTitle;
      }
      return item.kind;
    case "CLUB_EVENT":
      if (isSceClubEventPresentationModel(model)) {
        return model.eventTitle;
      }
      return item.kind;
    default: {
      const _exhaustive: never = item.kind;
      return _exhaustive;
    }
  }
}

function resolveNormalizedMatchIdentity(item: NormalizedCalendarItem): string {
  if (item.activityPresentation?.identity.activityKind === "MATCH") {
    const fixture = item.activityPresentation.participants?.fixtureLine?.trim();
    if (fixture) return fixture;
    return formatSportingActivityCompactPrimaryText(item.activityPresentation);
  }
  const homeAway = formatHomeAway(item.homeAway);
  const opponent = item.opponentName?.trim();
  if (opponent) {
    return joinParts([`vs ${opponent}`, homeAway]) ?? `vs ${opponent}`;
  }
  const title = item.title.trim();
  if (title && !isGenericSemanticLabel(title, "MATCH")) {
    return joinParts([title, homeAway]) ?? title;
  }
  return joinParts([item.team?.name, item.subtitle, homeAway]) ?? (item.typeLabel || "Spiel");
}

function resolveNormalizedTrainingIdentity(item: NormalizedCalendarItem): string {
  if (item.activityPresentation?.identity.activityKind === "TRAINING") {
    return formatSportingActivityCompactPrimaryText(item.activityPresentation).trim();
  }
  const team = item.team?.name?.trim() || item.subtitle?.trim();
  if (team) return team;
  const title = item.title.trim();
  if (title && !isGenericSemanticLabel(title, "TRAINING")) {
    return title;
  }
  return title || item.typeLabel || "Training";
}

function resolveNormalizedTournamentIdentity(item: NormalizedCalendarItem): string {
  if (item.activityPresentation?.identity.activityKind === "TOURNAMENT") {
    return formatSportingActivityCompactPrimaryText(item.activityPresentation).trim();
  }
  let title = item.title.trim();
  if (isGenericSemanticLabel(title, "TOURNAMENT")) {
    title = "";
  }
  return title || item.typeLabel || "Turnier";
}

function resolveNormalizedEventIdentity(item: NormalizedCalendarItem): string {
  if (item.activityPresentation) {
    return formatSportingActivityCompactPrimaryText(item.activityPresentation).trim();
  }
  return item.title.trim() || item.typeLabel || "Veranstaltung";
}

function resolveNormalizedTaskIdentity(item: NormalizedCalendarItem): string {
  return item.title.trim() || item.typeLabel || "Aufgabe";
}

function resolveNormalizedMicroIdentity(item: NormalizedCalendarItem): string {
  switch (item.semanticType) {
    case "TRAINING":
      return resolveNormalizedTrainingIdentity(item);
    case "MATCH":
      return resolveNormalizedMatchIdentity(item);
    case "TOURNAMENT":
      return resolveNormalizedTournamentIdentity(item);
    case "EVENT":
      return resolveNormalizedEventIdentity(item);
    case "TASK":
      return resolveNormalizedTaskIdentity(item);
    case "MEETING":
      return item.title.trim() || item.typeLabel || "Meeting";
    default:
      return item.title.trim() || item.typeLabel;
  }
}

function resolveNormalizedMicroLocation(
  item: NormalizedCalendarItem,
  identityLabel: string,
): string | undefined {
  if (item.semanticType === "TASK") {
    return undefined;
  }

  const fromPresentation = locationFromActivityPresentation(item.activityPresentation);
  if (fromPresentation) {
    return omitLocationDuplicatingIdentity(identityLabel, fromPresentation);
  }

  if (item.semanticType === "MATCH" || item.semanticType === "TOURNAMENT" || item.semanticType === "EVENT") {
    const raw = item.location?.trim();
    return omitLocationDuplicatingIdentity(identityLabel, raw);
  }

  if (item.semanticType === "TRAINING") {
    const raw = item.location?.trim();
    return omitLocationDuplicatingIdentity(identityLabel, raw);
  }

  return omitLocationDuplicatingIdentity(identityLabel, item.location?.trim());
}

export function resolveProgrammeCalendarMicroSemantics(
  item: ProgrammeItem,
): CalendarMicroSemanticFields {
  const identityLabel = resolveProgrammeMicroIdentity(item);
  const locationLabel = omitLocationDuplicatingIdentity(
    identityLabel,
    locationFromActivityPresentation(item.presentation),
  );
  return { identityLabel, locationLabel };
}

export function resolvePersonalCalendarMicroSemantics(
  item: NormalizedCalendarItem,
): CalendarMicroSemanticFields {
  const identityLabel = resolveNormalizedMicroIdentity(item);
  const locationLabel = resolveNormalizedMicroLocation(item, identityLabel);
  return { identityLabel, locationLabel };
}

export function buildCalendarMicroAccessibleLabel(input: {
  typeLabel: string;
  timeLabel: string;
  identityLabel: string;
  locationLabel?: string;
  statusLabel?: string;
}): string {
  return [
    input.typeLabel,
    input.timeLabel,
    input.identityLabel,
    input.locationLabel,
    input.statusLabel,
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * Collects visible semantic field values for duplication tests (excludes accessibility-only repeats).
 */
export function visibleCalendarMicroSemanticValues(entry: {
  typeLabel: string;
  timeLabel: string;
  identityLabel: string;
  locationLabel?: string;
  statusLabel?: string;
}): string[] {
  return [
    entry.typeLabel,
    entry.timeLabel,
    entry.identityLabel,
    entry.locationLabel,
    entry.statusLabel,
  ].filter((value): value is string => Boolean(value?.trim()));
}
