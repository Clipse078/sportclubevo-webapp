/**
 * SCE-EVENTS-AUDIENCE-01 — stable event-scoped Veranstaltungsteilnahme candidate ids.
 */

import type { ParticipationAudiencePreset } from "@/lib/participation/participation-audience-resolution";
import { getParticipationStatusLabel } from "@/lib/participation/labels";

export const EVENTS_DOMAIN_KEY = "events" as const;
export const EVENTS_TEILNAHME_SOURCE_KEY = "teilnahme" as const;
export const EVENTS_TEILNAHME_REGISTRY_KEY =
  `${EVENTS_DOMAIN_KEY}.${EVENTS_TEILNAHME_SOURCE_KEY}` as const;

const CANDIDATE_ID_PREFIX = "v1";
const EVENT_KIND_SEGMENT = "CLUB_EVENT" as const;

const PRESET_SEGMENT: Record<ParticipationAudiencePreset, string> = {
  ALL_INVITEES: "all",
  ACCEPTED_ONLY: "yes",
  DECLINED_ONLY: "no",
  MAYBE_ONLY: "maybe",
  NOT_RESPONDED: "not-responded",
};

const PRESET_FROM_SEGMENT = Object.fromEntries(
  Object.entries(PRESET_SEGMENT).map(([preset, segment]) => [segment, preset]),
) as Record<string, ParticipationAudiencePreset>;

export type ParsedClubEventAudienceCandidateId = {
  eventId: string;
  preset: ParticipationAudiencePreset;
};

export function buildClubEventAudienceCandidateId(parts: ParsedClubEventAudienceCandidateId): string {
  const presetSegment = PRESET_SEGMENT[parts.preset];
  return [
    CANDIDATE_ID_PREFIX,
    "evt",
    parts.eventId,
    "kind",
    EVENT_KIND_SEGMENT,
    "p",
    presetSegment,
  ].join(":");
}

export function parseClubEventAudienceCandidateId(
  candidateId: string,
): ParsedClubEventAudienceCandidateId | null {
  const segments = candidateId.split(":");
  if (segments.length !== 7) return null;
  if (segments[0] !== CANDIDATE_ID_PREFIX) return null;
  if (segments[1] !== "evt" || segments[3] !== "kind" || segments[5] !== "p") {
    return null;
  }
  const eventId = segments[2];
  const eventKind = segments[4];
  const presetSegment = segments[6];
  if (!eventId) return null;
  if (eventKind !== EVENT_KIND_SEGMENT) return null;
  const preset = PRESET_FROM_SEGMENT[presetSegment];
  if (!preset) return null;
  return { eventId, preset };
}

const PRESET_UI_LABEL: Record<ParticipationAudiencePreset, string> = {
  ALL_INVITEES: "Alle Eingeladenen",
  ACCEPTED_ONLY: "Zugesagt",
  DECLINED_ONLY: "Abgesagt",
  MAYBE_ONLY: "Vielleicht",
  NOT_RESPONDED: "Rückmeldung ausstehend",
};

export function clubEventAudienceDisplayLabel(input: {
  eventTitle: string;
  eventStartAt: Date;
  preset: ParticipationAudiencePreset;
}): string {
  const weekday = input.eventStartAt.toLocaleDateString("de-CH", { weekday: "long" });
  const time = input.eventStartAt.toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Veranstaltungsteilnahme – ${input.eventTitle} – ${weekday} ${time} – ${PRESET_UI_LABEL[input.preset]}`;
}

export function clubEventAudienceProvenanceLabel(candidateId: string): string {
  const parsed = parseClubEventAudienceCandidateId(candidateId);
  if (!parsed) {
    return "Veranstaltungsteilnahme – Unbekannte Gruppe";
  }
  return `Veranstaltungsteilnahme – ${PRESET_UI_LABEL[parsed.preset]}`;
}

export function clubEventParticipationPresetDescription(
  preset: ParticipationAudiencePreset,
): string {
  switch (preset) {
    case "ALL_INVITEES":
      return "Alle Personen aus der konfigurierten Veranstaltungseinladung (live aufgelöst).";
    case "ACCEPTED_ONLY":
      return `Eingeladene mit Rückmeldung «${getParticipationStatusLabel("YES")}».`;
    case "DECLINED_ONLY":
      return `Eingeladene mit Rückmeldung «${getParticipationStatusLabel("NO")}».`;
    case "MAYBE_ONLY":
      return `Eingeladene mit Rückmeldung «${getParticipationStatusLabel("MAYBE")}».`;
    case "NOT_RESPONDED":
      return "Eingeladene ohne abschließende Rückmeldung (Status offen).";
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}

export const CLUB_EVENT_PARTICIPATION_PRESETS: readonly ParticipationAudiencePreset[] = [
  "ALL_INVITEES",
  "ACCEPTED_ONLY",
  "DECLINED_ONLY",
  "MAYBE_ONLY",
  "NOT_RESPONDED",
] as const;
