import type { NormalizedCalendarItem } from "@/lib/personal-agenda/normalized-calendar-item-types";
import type { ProgrammeItem } from "@/lib/programme-engine/types";
import { buildClubIdentity, buildTournamentOrganiserClubIdentity } from "@/lib/sporting-activity-design";
import { formatSceActivityLocationHierarchy } from "@/lib/sporting-activity-presentation/canonical";
import { SCE_ACTIVITY_LOCATION_HIERARCHY_SEPARATOR } from "@/lib/sporting-activity-presentation/canonical/location-format";
import type {
  SceActivityPresentationModel,
  SceTrainingPresentationModel,
} from "@/lib/sporting-activity-presentation/canonical/types";
import { resolveTenantClubCrestUrl } from "@/lib/sporting-data/sce-club-crest-resolution";
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
import {
  formatPersonalScopeMatchMicroIdentityLabel,
  formatProgrammeMatchMicroIdentityFallback,
  formatTeamScopeMatchMicroIdentityLabel,
  resolveTeamScopeMatchOpponent,
} from "./calendar-micro-match-identity";
import {
  calendarMicroVisualIdentityFromClub,
  type CalendarMicroVisualIdentity,
} from "./calendar-micro-visual-identity";
import { formatCalendarMicroAccessibleTimePhrase } from "./calendar-micro-time-label";

/** Month-grid MICRO tiles: compact resource, no host club line. */
export const SCE_CALENDAR_MICRO_LOCATION_HIERARCHY_OPTIONS = {
  includeHostClub: false,
} as const;

export type CalendarMicroSemanticFields = {
  identityLabel: string;
  locationLabel?: string;
  visualIdentity?: CalendarMicroVisualIdentity;
  /** Screen-reader phrasing for match opponent (e.g. "gegen FC X") when distinct from visible identity. */
  accessibleIdentityPhrase?: string;
};

export type { CalendarMicroVisualIdentity } from "./calendar-micro-visual-identity";

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

function stripLeadingLocationParts(
  locationLabel: string,
  stripComparable: readonly string[],
): string {
  const sep = SCE_ACTIVITY_LOCATION_HIERARCHY_SEPARATOR;
  let parts = locationLabel
    .split(sep)
    .map((part) => part.trim())
    .filter(Boolean);
  const targets = new Set(stripComparable.map((value) => normalizeComparable(value)).filter(Boolean));
  while (parts.length > 0) {
    const head = normalizeComparable(parts[0] ?? "");
    if (targets.has(head)) {
      parts = parts.slice(1);
      continue;
    }
    break;
  }
  if (parts.length === 0) return locationLabel.trim();
  return parts.join(sep);
}

function omitLocationDuplicatingIdentity(
  identityLabel: string,
  locationLabel: string | undefined,
  options: { alsoStripLabels?: readonly string[] } = {},
): string | undefined {
  if (!locationLabel?.trim()) return undefined;
  const stripTargets = [identityLabel, ...(options.alsoStripLabels ?? [])].filter(Boolean);
  const location = stripLeadingLocationParts(locationLabel.trim(), stripTargets);
  const identityNorm = normalizeComparable(identityLabel);
  const locationNorm = normalizeComparable(location);
  if (!locationNorm || identityNorm === locationNorm) return undefined;
  if (identityNorm.includes(locationNorm)) return undefined;
  return location;
}

function resolveTrainingTenantClubFromLegacy(
  presentation: SportingActivityPresentation,
): ReturnType<typeof calendarMicroVisualIdentityFromClub> {
  const host = presentation.location.hostOrOrganiser?.trim();
  if (!host) return undefined;
  const logoUrl = resolveTenantClubCrestUrl({
    tenantLogoUrl: presentation.tenantClub?.logoUrl,
  });
  return calendarMicroVisualIdentityFromClub(
    buildClubIdentity({
      displayName: host,
      logoUrl,
    }),
  );
}

function resolveTrainingTenantClubFromModel(
  model: SceTrainingPresentationModel,
): ReturnType<typeof calendarMicroVisualIdentityFromClub> {
  return calendarMicroVisualIdentityFromClub(model.tenantClub);
}

function resolveTournamentOrganiserFromLegacy(
  presentation: SportingActivityPresentation,
): ReturnType<typeof calendarMicroVisualIdentityFromClub> {
  const organiserName =
    presentation.context?.organiser?.trim() || presentation.location.hostOrOrganiser?.trim();
  if (!organiserName) return undefined;
  const organiser = buildTournamentOrganiserClubIdentity({
    organizerName: organiserName,
    organizerLogoUrl: presentation.context?.organiserLogoUrl ?? null,
    organizerExternalClubId: presentation.context?.organiserExternalClubId ?? null,
    title: presentation.identity.title,
  });
  return calendarMicroVisualIdentityFromClub(organiser);
}

function resolveProgrammeMicroIdentity(item: ProgrammeItem): Pick<
  CalendarMicroSemanticFields,
  "identityLabel" | "visualIdentity" | "accessibleIdentityPhrase"
> {
  const model = item.presentation;
  switch (item.kind) {
    case "MATCH":
      if (isSceMatchPresentationModel(model)) {
        const scoped = resolveTeamScopeMatchOpponent(model.fixture, item.teamId);
        if (scoped) {
          const label = formatTeamScopeMatchMicroIdentityLabel(scoped.opponent);
          return {
            identityLabel: label,
            visualIdentity: calendarMicroVisualIdentityFromClub(scoped.opponent),
            accessibleIdentityPhrase: `gegen ${label}`,
          };
        }
        const fallback = formatProgrammeMatchMicroIdentityFallback(model.fixture);
        return {
          identityLabel: fallback,
          accessibleIdentityPhrase: fallback,
        };
      }
      return { identityLabel: item.kind };
    case "TRAINING":
      if (isSceTrainingPresentationModel(model)) {
        return {
          identityLabel: model.team?.name?.trim() || model.trainingTitle,
          visualIdentity: resolveTrainingTenantClubFromModel(model),
        };
      }
      return { identityLabel: item.kind };
    case "TOURNAMENT":
      if (isSceTournamentPresentationModel(model)) {
        const organiserName = model.organiser.displayName.trim();
        return {
          identityLabel: model.tournamentTitle,
          visualIdentity: calendarMicroVisualIdentityFromClub(model.organiser),
          accessibleIdentityPhrase: organiserName
            ? `${model.tournamentTitle}, organisiert von ${organiserName}`
            : model.tournamentTitle,
        };
      }
      return { identityLabel: item.kind };
    case "CLUB_EVENT":
      if (isSceClubEventPresentationModel(model)) {
        return {
          identityLabel: model.eventTitle,
          visualIdentity: calendarMicroVisualIdentityFromClub(model.tenantClub),
        };
      }
      return { identityLabel: item.kind };
    default: {
      const _exhaustive: never = item.kind;
      return { identityLabel: _exhaustive };
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
    const alsoStrip =
      item.semanticType === "TOURNAMENT"
        ? [
            item.activityPresentation?.context?.organiser,
            item.activityPresentation?.location.hostOrOrganiser,
          ]
        : item.semanticType === "MATCH"
          ? [item.opponentName, item.team?.name, identityLabel]
          : [];
    return omitLocationDuplicatingIdentity(identityLabel, fromPresentation, {
      alsoStripLabels: alsoStrip.filter((value): value is string => Boolean(value?.trim())),
    });
  }

  if (item.semanticType === "MATCH" || item.semanticType === "TOURNAMENT" || item.semanticType === "EVENT") {
    const raw = item.location?.trim();
    const alsoStrip =
      item.semanticType === "TOURNAMENT"
        ? [
            item.activityPresentation?.context?.organiser,
            item.activityPresentation?.location.hostOrOrganiser,
          ]
        : item.semanticType === "MATCH"
          ? [item.opponentName, item.team?.name]
          : [];
    return omitLocationDuplicatingIdentity(identityLabel, raw, {
      alsoStripLabels: alsoStrip.filter((value): value is string => Boolean(value?.trim())),
    });
  }

  if (item.semanticType === "TRAINING") {
    const raw = item.location?.trim();
    return omitLocationDuplicatingIdentity(identityLabel, raw);
  }

  return omitLocationDuplicatingIdentity(identityLabel, item.location?.trim());
}

function resolvePersonalMicroIdentityFields(
  item: NormalizedCalendarItem,
): Pick<CalendarMicroSemanticFields, "identityLabel" | "visualIdentity" | "accessibleIdentityPhrase"> {
  const presentation = item.activityPresentation;
  if (presentation?.identity.activityKind === "TRAINING") {
    const team = presentation.team?.name?.trim();
    const identityLabel = team || presentation.identity.title.trim() || resolveNormalizedTrainingIdentity(item);
    return {
      identityLabel,
      visualIdentity: resolveTrainingTenantClubFromLegacy(presentation),
    };
  }
  if (presentation?.identity.activityKind === "TOURNAMENT") {
    const identityLabel = presentation.identity.title.trim() || resolveNormalizedTournamentIdentity(item);
    const organiserName =
      presentation.context?.organiser?.trim() || presentation.location.hostOrOrganiser?.trim();
    return {
      identityLabel,
      visualIdentity: resolveTournamentOrganiserFromLegacy(presentation),
      accessibleIdentityPhrase: organiserName
        ? `${identityLabel}, organisiert von ${organiserName}`
        : identityLabel,
    };
  }
  if (presentation?.identity.activityKind === "MATCH") {
    const identityLabel = resolveNormalizedMatchIdentity(item);
    return { identityLabel };
  }
  const identityLabel = resolveNormalizedMicroIdentity(item);
  return { identityLabel };
}

export function resolveProgrammeCalendarMicroSemantics(
  item: ProgrammeItem,
): CalendarMicroSemanticFields {
  const identity = resolveProgrammeMicroIdentity(item);
  const organiserStrip =
    item.kind === "TOURNAMENT" && isSceTournamentPresentationModel(item.presentation)
      ? [item.presentation.organiser.displayName]
      : item.kind === "MATCH" && isSceMatchPresentationModel(item.presentation)
        ? [
            identity.identityLabel,
            item.presentation.fixture.home.displayName,
            item.presentation.fixture.away.displayName,
          ]
        : [];
  const locationLabel = omitLocationDuplicatingIdentity(
    identity.identityLabel,
    locationFromActivityPresentation(item.presentation),
    { alsoStripLabels: organiserStrip },
  );
  return { ...identity, locationLabel };
}

function resolvePersonalCalendarMicroSemanticsFromCanonical(
  item: NormalizedCalendarItem,
): CalendarMicroSemanticFields | null {
  const model = item.canonicalPresentation;
  if (!model) return null;

  const pseudoProgrammeItem: ProgrammeItem = {
    id: item.id,
    kind:
      item.semanticType === "TRAINING"
        ? "TRAINING"
        : item.semanticType === "MATCH"
          ? "MATCH"
          : item.semanticType === "TOURNAMENT"
            ? "TOURNAMENT"
            : "CLUB_EVENT",
    domainId: item.sourceId,
    resourceKey: item.id,
    startsAt: item.startAt,
    endsAt: item.endAt ?? null,
    allDay: item.allDay,
    presentation: model,
    teamId: item.programmeScopeTeamId ?? null,
    teamSeasonId: null,
    orgUnitId: null,
    navigationTarget: item.deepLink ?? "#",
  };

  return resolveProgrammeCalendarMicroSemantics(pseudoProgrammeItem);
}

export function resolvePersonalCalendarMicroSemantics(
  item: NormalizedCalendarItem,
): CalendarMicroSemanticFields {
  const fromCanonical = resolvePersonalCalendarMicroSemanticsFromCanonical(item);
  if (fromCanonical) {
    return fromCanonical;
  }

  const identity = resolvePersonalMicroIdentityFields(item);
  const locationLabel = resolveNormalizedMicroLocation(item, identity.identityLabel);
  return { ...identity, locationLabel };
}

export function buildCalendarMicroAccessibleLabel(input: {
  typeLabel: string;
  timeLabel: string;
  identityLabel: string;
  accessibleIdentityPhrase?: string;
  locationLabel?: string;
  statusLabel?: string;
}): string {
  const identityForA11y = input.accessibleIdentityPhrase?.trim() || input.identityLabel;
  const timeForA11y = formatCalendarMicroAccessibleTimePhrase(input.timeLabel);
  return [
    input.typeLabel,
    identityForA11y,
    timeForA11y,
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
    entry.identityLabel,
    entry.timeLabel,
    entry.locationLabel,
    entry.statusLabel,
  ].filter((value): value is string => Boolean(value?.trim()));
}
