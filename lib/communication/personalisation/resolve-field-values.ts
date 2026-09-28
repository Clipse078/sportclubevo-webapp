/**
 * SCE-COMM-EVO-06 — field value resolution (data only, no substitution).
 */

import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import type {
  PersonalisationFieldDefinition,
  PersonalisationResolutionOutcome,
} from "@/lib/communication/personalisation/types";
import { getPersonalisationFieldDefinition } from "@/lib/communication/personalisation/field-registry";
import {
  buildGoogleMapsSearchUrl,
  formatDeterministicList,
  formatFullPostalAddress,
  formatPersonName,
  formatSwissDate,
  formatSwissDateTime,
  formatSwissTime,
} from "@/lib/communication/personalisation/formatters";
import {
  type LoadedPersonalisationContext,
  type LoadedRecipientPerson,
  loadActiveTeamNamesForPerson,
  formatLoadedPersonName,
} from "@/lib/communication/personalisation/load-personalisation-context";
import { getPitchDisplayLabel, getDressingRoomDisplayLabel } from "@/lib/facilities/display-helpers";
import { buildNotificationAbsoluteHref } from "@/lib/notifications/internal-href";
import { prisma } from "@/lib/db/prisma";

export type FieldResolutionResult = {
  outcome: PersonalisationResolutionOutcome;
  value: string | null;
  messageDe?: string;
};

export type PersonalisationRenderScope = {
  tenantId: string;
  context: LoadedPersonalisationContext;
  contextRef: CommunicationContextRef;
  recipient: LoadedRecipientPerson;
  deliveryPerson: LoadedRecipientPerson;
  subjectPerson: LoadedRecipientPerson;
  guardianPerson: LoadedRecipientPerson | null;
  viaGuardianSubstitution: boolean;
  senderPerson: LoadedRecipientPerson | null;
  senderDisplayName: string | null;
  senderEmail: string | null;
  communicationId: string | null;
  communicationKind: string | null;
  allowContactFields: boolean;
  at: Date;
  /** Cached per render batch */
  subjectActiveTeams?: string[];
  participationStatusLabel?: string | null;
};

function isHomeEvent(homeAway: string | null | undefined): boolean {
  const v = homeAway?.trim().toUpperCase();
  return v === "HOME" || v === "HEIM";
}

function isAwayEvent(homeAway: string | null | undefined): boolean {
  const v = homeAway?.trim().toUpperCase();
  return v === "AWAY" || v === "AUSWÄRTS" || v === "AUSWAERTS";
}

function eventTypeMatches(
  def: PersonalisationFieldDefinition,
  eventType: string | null | undefined,
): boolean {
  if (!def.requiredEventTypes?.length) return true;
  if (!eventType) return false;
  return def.requiredEventTypes.includes(eventType as "TRAINING" | "MATCH" | "TOURNAMENT" | "OTHER");
}

function contextKindMatches(
  def: PersonalisationFieldDefinition,
  contextRef: CommunicationContextRef,
): boolean {
  if (!def.requiredContextKinds?.length) return true;
  return def.requiredContextKinds.includes(contextRef.kind);
}

function unavailable(def: PersonalisationFieldDefinition, messageDe: string): FieldResolutionResult {
  return { outcome: "UNAVAILABLE", value: null, messageDe };
}

function missing(): FieldResolutionResult {
  return { outcome: "MISSING", value: null };
}

function ambiguous(messageDe: string): FieldResolutionResult {
  return { outcome: "AMBIGUOUS", value: null, messageDe };
}

function resolved(value: string | null): FieldResolutionResult {
  if (!value?.trim()) return missing();
  return { outcome: "RESOLVED", value: value.trim() };
}

function pitchLabelsFromEvent(ctx: LoadedPersonalisationContext): string[] {
  const event = ctx.event;
  if (!event) return [];
  if (event.type === "TOURNAMENT" && event.tournamentPitchLabels.length > 0) {
    return event.tournamentPitchLabels;
  }
  const single = getPitchDisplayLabel(event.pitchCode);
  return single ? [single] : [];
}

function dressingLabelsFromEvent(ctx: LoadedPersonalisationContext, side: "home" | "away" | "any"): string[] {
  const event = ctx.event;
  if (!event) return [];
  if (event.type === "TOURNAMENT" && event.tournamentDressingRoomLabels.length > 0) {
    return event.tournamentDressingRoomLabels;
  }
  const labels: string[] = [];
  if (side === "home" || side === "any") {
    const home = getDressingRoomDisplayLabel(event.homeDressingRoomCode);
    if (home) labels.push(home);
  }
  if (side === "away" || side === "any") {
    const away = getDressingRoomDisplayLabel(event.awayDressingRoomCode);
    if (away) labels.push(away);
  }
  return labels;
}

function resolveSingleFromList(labels: string[], fieldLabel: string): FieldResolutionResult {
  const unique = [...new Set(labels.filter(Boolean))];
  if (unique.length === 0) return missing();
  if (unique.length === 1) return resolved(unique[0]!);
  return ambiguous(`${fieldLabel}: mehrere Zuweisungen (${unique.join(", ")})`);
}

function eventLocationFields(ctx: LoadedPersonalisationContext): {
  name: string | null;
  address: string | null;
  fullAddress: string | null;
  mapsQuery: string | null;
} {
  const event = ctx.event;
  if (!event) {
    return { name: null, address: null, fullAddress: null, mapsQuery: null };
  }
  const freeform = event.location?.trim() || null;
  if (event.type === "MATCH" && isAwayEvent(event.homeAway)) {
    return {
      name: freeform,
      address: freeform,
      fullAddress: freeform ? formatFullPostalAddress({ freeformLine: freeform }) : null,
      mapsQuery: freeform,
    };
  }
  return {
    name: freeform,
    address: freeform,
    fullAddress: freeform ? formatFullPostalAddress({ freeformLine: freeform }) : null,
    mapsQuery: freeform,
  };
}

async function ensureSubjectTeams(scope: PersonalisationRenderScope): Promise<string[]> {
  if (scope.subjectActiveTeams) return scope.subjectActiveTeams;
  const teams = await loadActiveTeamNamesForPerson({
    tenantId: scope.tenantId,
    personId: scope.subjectPerson.id,
    seasonId: scope.context.event?.seasonId ?? null,
  });
  scope.subjectActiveTeams = teams;
  return teams;
}

async function ensureParticipationStatus(scope: PersonalisationRenderScope): Promise<string | null> {
  if (scope.participationStatusLabel !== undefined) {
    return scope.participationStatusLabel;
  }
  const eventId = scope.context.event?.eventId;
  if (!eventId) {
    scope.participationStatusLabel = null;
    return null;
  }
  const row = await prisma.participationResponse.findFirst({
    where: {
      eventId,
      personId: scope.subjectPerson.id,
    },
    select: { status: true },
  });
  const STATUS: Record<string, string> = {
    YES: "Zugesagt",
    NO: "Abgesagt",
    MAYBE: "Unsicher",
    NO_RESPONSE: "Keine Antwort",
  };
  scope.participationStatusLabel = row ? STATUS[row.status] ?? row.status : null;
  return scope.participationStatusLabel;
}

export async function resolvePersonalisationFieldValue(
  key: string,
  scope: PersonalisationRenderScope,
): Promise<FieldResolutionResult> {
  const def = getPersonalisationFieldDefinition(key);
  if (!def) {
    return { outcome: "UNAVAILABLE", value: null, messageDe: "Unbekanntes Feld" };
  }
  if (!def.implemented) {
    return unavailable(def, `"${def.labelDe}" ist noch nicht verfügbar.`);
  }
  if (!contextKindMatches(def, scope.contextRef)) {
    return unavailable(def, `"${def.labelDe}" benötigt einen passenden Kontext.`);
  }
  if (def.requiredContextKinds?.includes("EVENT") && !scope.context.event) {
    return unavailable(def, `"${def.labelDe}" benötigt einen Event-Kontext.`);
  }
  if (scope.context.event && !eventTypeMatches(def, scope.context.event.type)) {
    return unavailable(def, `"${def.labelDe}" ist für diesen Event-Typ nicht verfügbar.`);
  }

  const tz = scope.context.timeZone;
  const event = scope.context.event;
  const recipient = scope.deliveryPerson;
  const subject = scope.subjectPerson;
  const guardian = scope.guardianPerson;

  switch (key) {
    case "first_name":
      return resolved(recipient.firstName);
    case "last_name":
      return resolved(recipient.lastName);
    case "full_name":
    case "display_name":
      return resolved(formatLoadedPersonName(recipient));
    case "email":
      if (!scope.allowContactFields) return { outcome: "UNAUTHORIZED", value: null };
      return resolved(recipient.email);
    case "phone":
      if (!scope.allowContactFields) return { outcome: "UNAUTHORIZED", value: null };
      return resolved(recipient.phone);

    case "player_first_name":
      return resolved(subject.firstName);
    case "player_last_name":
      return resolved(subject.lastName);
    case "player_full_name":
      return resolved(formatLoadedPersonName(subject));
    case "child_first_name":
      return resolved(subject.firstName);
    case "child_last_name":
      return resolved(subject.lastName);
    case "child_full_name":
      return resolved(formatLoadedPersonName(subject));
    case "child_team": {
      const teams = await ensureSubjectTeams(scope);
      if (scope.context.contextTeamName) return resolved(scope.context.contextTeamName);
      return resolveSingleFromList(teams, def.labelDe);
    }
    case "guardian_first_name":
      if (!scope.viaGuardianSubstitution || !guardian) return missing();
      return resolved(guardian.firstName);
    case "guardian_last_name":
      if (!scope.viaGuardianSubstitution || !guardian) return missing();
      return resolved(guardian.lastName);
    case "guardian_full_name":
      if (!scope.viaGuardianSubstitution || !guardian) return missing();
      return resolved(formatLoadedPersonName(guardian));

    case "context_team":
    case "team_name":
      return resolved(scope.context.contextTeamName);
    case "team_short_name":
      return resolved(scope.context.contextTeamShortName);
    case "team_age_group":
      return resolved(scope.context.contextTeamAgeGroup);
    case "team_gender":
      return resolved(scope.context.contextTeamGender);
    case "active_teams": {
      const teams = await ensureSubjectTeams(scope);
      return resolved(formatDeterministicList(teams));
    }
    case "active_season_team": {
      const teams = await ensureSubjectTeams(scope);
      return resolveSingleFromList(teams, def.labelDe);
    }

    case "season":
    case "season_name": {
      const name = event?.seasonName ?? scope.context.activeSeasonName;
      return resolved(name);
    }
    case "season_start": {
      const d = event?.seasonStart ?? scope.context.activeSeasonStart;
      return d ? resolved(formatSwissDate(d, tz)) : missing();
    }
    case "season_end": {
      const d = event?.seasonEnd ?? scope.context.activeSeasonEnd;
      return d ? resolved(formatSwissDate(d, tz)) : missing();
    }

    case "club_name":
      return resolved(scope.context.tenantName);
    case "club_email":
      return resolved(scope.context.tenantEmail);
    case "org_unit_name":
      return resolved(scope.context.orgUnitName);

    case "event_name":
      return event ? resolved(event.title) : missing();
    case "event_type":
      return event ? resolved(event.type) : missing();
    case "event_date":
      return event ? resolved(formatSwissDate(event.startAt, tz)) : missing();
    case "event_start_time":
      return event ? resolved(formatSwissTime(event.startAt, tz)) : missing();
    case "event_end_time":
      return event?.endAt ? resolved(formatSwissTime(event.endAt, tz)) : missing();
    case "event_start":
      return event ? resolved(formatSwissDateTime(event.startAt, tz)) : missing();
    case "event_end":
      return event?.endAt ? resolved(formatSwissDateTime(event.endAt, tz)) : missing();
    case "event_location":
    case "event_address":
      return resolved(eventLocationFields(scope.context).name);
    case "event_meeting_time":
    case "meeting_time":
      return event?.meetingTime ? resolved(formatSwissTime(event.meetingTime, tz)) : missing();
    case "event_team":
      return resolved(event?.teamName ?? scope.context.contextTeamName);
    case "event_opponent":
      return resolved(event?.opponentName ?? null);

    case "location_name":
      return resolved(eventLocationFields(scope.context).name);
    case "location_address":
    case "location_full_address":
      return resolved(eventLocationFields(scope.context).fullAddress);
    case "location_maps_link": {
      const q = eventLocationFields(scope.context).mapsQuery;
      return q ? resolved(buildGoogleMapsSearchUrl(q)) : missing();
    }

    case "pitch_name":
    case "pitch_full_name":
    case "pitch_allocation":
      return resolveSingleFromList(pitchLabelsFromEvent(scope.context), def.labelDe);
    case "pitch_allocations":
      return resolved(formatDeterministicList(pitchLabelsFromEvent(scope.context)));

    case "dressing_room":
      return resolveSingleFromList(dressingLabelsFromEvent(scope.context, "any"), def.labelDe);
    case "dressing_rooms":
      return resolved(formatDeterministicList(dressingLabelsFromEvent(scope.context, "any")));

    case "training_date":
    case "match_date":
    case "tournament_date":
      return event ? resolved(formatSwissDate(event.startAt, tz)) : missing();
    case "training_start_time":
    case "match_kickoff":
      return event ? resolved(formatSwissTime(event.startAt, tz)) : missing();
    case "training_end_time":
      return event?.endAt ? resolved(formatSwissTime(event.endAt, tz)) : missing();
    case "match_meeting_time":
    case "tournament_meeting_time":
      return event?.meetingTime ? resolved(formatSwissTime(event.meetingTime, tz)) : missing();
    case "training_location":
    case "match_location":
    case "tournament_location":
      return resolved(eventLocationFields(scope.context).name);
    case "training_address":
    case "match_address":
    case "tournament_address":
      return resolved(eventLocationFields(scope.context).fullAddress);
    case "training_pitch":
    case "match_pitch":
    case "tournament_pitch":
      if (event?.type === "MATCH" && isAwayEvent(event.homeAway ?? null)) return missing();
      return resolveSingleFromList(pitchLabelsFromEvent(scope.context), def.labelDe);
    case "training_pitches":
    case "match_pitches":
    case "tournament_pitches":
      if (event?.type === "MATCH" && isAwayEvent(event.homeAway ?? null)) {
        return missing();
      }
      return resolved(formatDeterministicList(pitchLabelsFromEvent(scope.context)));
    case "training_dressing_room":
    case "match_dressing_room":
    case "tournament_dressing_room":
      if (event?.type === "MATCH" && isAwayEvent(event.homeAway ?? null)) return missing();
      return resolveSingleFromList(dressingLabelsFromEvent(scope.context, event?.type === "MATCH" ? "home" : "any"), def.labelDe);
    case "training_dressing_rooms":
    case "match_dressing_rooms":
    case "tournament_dressing_rooms":
      if (event?.type === "MATCH" && isAwayEvent(event.homeAway ?? null)) return missing();
      return resolved(formatDeterministicList(dressingLabelsFromEvent(scope.context, event?.type === "MATCH" ? "home" : "any")));
    case "training_team":
    case "match_team":
    case "tournament_team":
      return resolved(event?.teamName ?? scope.context.contextTeamName);
    case "match_home_team":
      return isHomeEvent(event?.homeAway ?? null)
        ? resolved(event?.teamName ?? scope.context.contextTeamName)
        : missing();
    case "match_away_team":
      return isAwayEvent(event?.homeAway ?? null)
        ? resolved(event?.teamName ?? scope.context.contextTeamName)
        : resolved(event?.opponentName ?? null);
    case "match_opponent":
      return resolved(event?.opponentName ?? null);
    case "match_competition":
      return resolved(event?.competitionLabel ?? null);
    case "tournament_name":
      return event ? resolved(event.title) : missing();
    case "tournament_start":
      return event ? resolved(formatSwissDateTime(event.startAt, tz)) : missing();
    case "tournament_end":
      return event?.endAt ? resolved(formatSwissDateTime(event.endAt, tz)) : missing();

    case "attendance_status": {
      const label = await ensureParticipationStatus(scope);
      return resolved(label);
    }
    case "response_deadline":
      return event?.participationResponseDueAt
        ? resolved(formatSwissDateTime(event.participationResponseDueAt, tz))
        : missing();
    case "participant_name":
      return resolved(formatPersonName(subject));

    case "sender_name":
      return resolved(scope.senderDisplayName);
    case "sender_email":
      return resolved(scope.senderEmail);
    case "sender_person_name":
      return scope.senderPerson ? resolved(formatLoadedPersonName(scope.senderPerson)) : missing();
    case "sender_first_name":
      return scope.senderPerson ? resolved(scope.senderPerson.firstName) : missing();
    case "sender_last_name":
      return scope.senderPerson ? resolved(scope.senderPerson.lastName) : missing();

    case "current_date":
      return resolved(formatSwissDate(scope.at, tz));
    case "current_year":
      return resolved(
        new Intl.DateTimeFormat("de-CH", { year: "numeric", timeZone: tz }).format(scope.at),
      );
    case "current_season":
      return resolved(scope.context.activeSeasonName);

    case "communication_link": {
      if (!scope.communicationId) return missing();
      const path =
        scope.communicationKind === "CAMPAIGN"
          ? `/dashboard/communication/kampagnen/${scope.communicationId}`
          : `/dashboard/communication/mitteilungen/${scope.communicationId}`;
      return resolved(buildNotificationAbsoluteHref(path));
    }

    default:
      return unavailable(def, `"${def.labelDe}" ist noch nicht verfügbar.`);
  }
}
