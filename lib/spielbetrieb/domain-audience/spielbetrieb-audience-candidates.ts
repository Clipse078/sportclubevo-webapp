/**
 * SCE-SPIELBETRIEB-AUDIENCE-01 — stable event-scoped Spielteilnahme audience candidate ids.
 */

import type { EventType } from "@prisma/client";
import type { ParticipationAudiencePreset } from "@/lib/participation/participation-audience-resolution";
import { getParticipationStatusLabel } from "@/lib/participation/labels";

export const SPIELBETRIEB_DOMAIN_KEY = "spielbetrieb" as const;
export const SPIELBETRIEB_TEILNAHME_SOURCE_KEY = "teilnahme" as const;
export const SPIELBETRIEB_TEILNAHME_REGISTRY_KEY =
  `${SPIELBETRIEB_DOMAIN_KEY}.${SPIELBETRIEB_TEILNAHME_SOURCE_KEY}` as const;

const CANDIDATE_ID_PREFIX = "v1";
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

export type SpielbetriebEventKind = Extract<EventType, "MATCH" | "TOURNAMENT">;

export type ParsedSpielbetriebAudienceCandidateId = {
  teamId: string;
  teamSeasonId: string;
  eventId: string;
  eventKind: SpielbetriebEventKind;
  preset: ParticipationAudiencePreset;
};

export type SpielbetriebAudienceCandidateContext = ParsedSpielbetriebAudienceCandidateId & {
  eventTitle: string;
  eventStartAt: Date;
  teamDisplayName?: string | null;
};

export function buildSpielbetriebAudienceCandidateId(
  parts: ParsedSpielbetriebAudienceCandidateId,
): string {
  const presetSegment = PRESET_SEGMENT[parts.preset];
  return [
    CANDIDATE_ID_PREFIX,
    "team",
    parts.teamId,
    "ts",
    parts.teamSeasonId,
    "ev",
    parts.eventId,
    "kind",
    parts.eventKind,
    "p",
    presetSegment,
  ].join(":");
}

export function parseSpielbetriebAudienceCandidateId(
  candidateId: string,
): ParsedSpielbetriebAudienceCandidateId | null {
  const segments = candidateId.split(":");
  if (segments.length !== 11) return null;
  if (segments[0] !== CANDIDATE_ID_PREFIX) return null;
  if (
    segments[1] !== "team" ||
    segments[3] !== "ts" ||
    segments[5] !== "ev" ||
    segments[7] !== "kind" ||
    segments[9] !== "p"
  ) {
    return null;
  }
  const teamId = segments[2];
  const teamSeasonId = segments[4];
  const eventId = segments[6];
  const eventKind = segments[8];
  const presetSegment = segments[10];
  if (!teamId || !teamSeasonId || !eventId) return null;
  if (eventKind !== "MATCH" && eventKind !== "TOURNAMENT") return null;
  const preset = PRESET_FROM_SEGMENT[presetSegment];
  if (!preset) return null;
  return { teamId, teamSeasonId, eventId, eventKind, preset };
}

const PRESET_UI_LABEL: Record<ParticipationAudiencePreset, string> = {
  ALL_INVITEES: "Alle Eingeladenen",
  ACCEPTED_ONLY: "Zugesagt",
  DECLINED_ONLY: "Abgesagt",
  MAYBE_ONLY: "Vielleicht",
  NOT_RESPONDED: "Rückmeldung ausstehend",
};

export function spielbetriebAudienceDisplayLabel(input: {
  teamDisplayName?: string | null;
  eventTitle: string;
  eventStartAt: Date;
  preset: ParticipationAudiencePreset;
}): string {
  const weekday = input.eventStartAt.toLocaleDateString("de-CH", { weekday: "long" });
  const teamPrefix = input.teamDisplayName?.trim()
    ? `${input.teamDisplayName.trim()} · `
    : "";
  return `Spielteilnahme – ${teamPrefix}${input.eventTitle} – ${weekday} – ${PRESET_UI_LABEL[input.preset]}`;
}

export function spielbetriebAudienceProvenanceLabel(candidateId: string): string {
  const parsed = parseSpielbetriebAudienceCandidateId(candidateId);
  if (!parsed) {
    return "Spielteilnahme – Unbekannte Gruppe";
  }
  return `Spielteilnahme – ${PRESET_UI_LABEL[parsed.preset]}`;
}

export function spielbetriebParticipationPresetDescription(
  preset: ParticipationAudiencePreset,
): string {
  switch (preset) {
    case "ALL_INVITEES":
      return "Alle Spieler der Saisonkader-Einladung für diese Teilnahmeanfrage.";
    case "ACCEPTED_ONLY":
      return `Spieler mit Rückmeldung «${getParticipationStatusLabel("YES")}».`;
    case "DECLINED_ONLY":
      return `Spieler mit Rückmeldung «${getParticipationStatusLabel("NO")}».`;
    case "MAYBE_ONLY":
      return `Spieler mit Rückmeldung «${getParticipationStatusLabel("MAYBE")}».`;
    case "NOT_RESPONDED":
      return "Spieler ohne abschließende Rückmeldung (Status offen).";
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}

export const SPIELBETRIEB_PARTICIPATION_PRESETS: readonly ParticipationAudiencePreset[] = [
  "ALL_INVITEES",
  "ACCEPTED_ONLY",
  "DECLINED_ONLY",
  "MAYBE_ONLY",
  "NOT_RESPONDED",
] as const;
