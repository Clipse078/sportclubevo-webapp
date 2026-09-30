/**
 * SCE-TRAINING-AUDIENCE-01 — stable session-scoped Trainingsteilnahme audience candidate ids.
 */

import type { ParticipationAudiencePreset } from "@/lib/participation/participation-audience-resolution";
import { getParticipationStatusLabel } from "@/lib/participation/labels";

export const TRAINING_DOMAIN_KEY = "training" as const;
export const TRAINING_TEILNAHME_SOURCE_KEY = "teilnahme" as const;
export const TRAINING_TEILNAHME_REGISTRY_KEY =
  `${TRAINING_DOMAIN_KEY}.${TRAINING_TEILNAHME_SOURCE_KEY}` as const;

const CANDIDATE_ID_PREFIX = "v1";
const EVENT_KIND_SEGMENT = "TRAINING" as const;

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

export type ParsedTrainingAudienceCandidateId = {
  teamId: string;
  teamSeasonId: string;
  trainingSessionId: string;
  preset: ParticipationAudiencePreset;
};

export function buildTrainingAudienceCandidateId(parts: ParsedTrainingAudienceCandidateId): string {
  const presetSegment = PRESET_SEGMENT[parts.preset];
  return [
    CANDIDATE_ID_PREFIX,
    "team",
    parts.teamId,
    "ts",
    parts.teamSeasonId,
    "sess",
    parts.trainingSessionId,
    "kind",
    EVENT_KIND_SEGMENT,
    "p",
    presetSegment,
  ].join(":");
}

export function parseTrainingAudienceCandidateId(
  candidateId: string,
): ParsedTrainingAudienceCandidateId | null {
  const segments = candidateId.split(":");
  if (segments.length !== 11) return null;
  if (segments[0] !== CANDIDATE_ID_PREFIX) return null;
  if (
    segments[1] !== "team" ||
    segments[3] !== "ts" ||
    segments[5] !== "sess" ||
    segments[7] !== "kind" ||
    segments[9] !== "p"
  ) {
    return null;
  }
  const teamId = segments[2];
  const teamSeasonId = segments[4];
  const trainingSessionId = segments[6];
  const eventKind = segments[8];
  const presetSegment = segments[10];
  if (!teamId || !teamSeasonId || !trainingSessionId) return null;
  if (eventKind !== EVENT_KIND_SEGMENT) return null;
  const preset = PRESET_FROM_SEGMENT[presetSegment];
  if (!preset) return null;
  return { teamId, teamSeasonId, trainingSessionId, preset };
}

const PRESET_UI_LABEL: Record<ParticipationAudiencePreset, string> = {
  ALL_INVITEES: "Alle Eingeladenen",
  ACCEPTED_ONLY: "Zugesagt",
  DECLINED_ONLY: "Abgesagt",
  MAYBE_ONLY: "Vielleicht",
  NOT_RESPONDED: "Rückmeldung ausstehend",
};

export function trainingAudienceDisplayLabel(input: {
  teamDisplayName?: string | null;
  sessionTitle: string;
  sessionStartAt: Date;
  preset: ParticipationAudiencePreset;
}): string {
  const weekday = input.sessionStartAt.toLocaleDateString("de-CH", { weekday: "long" });
  const time = input.sessionStartAt.toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const teamPrefix = input.teamDisplayName?.trim()
    ? `${input.teamDisplayName.trim()} · `
    : "";
  return `Trainingsteilnahme – ${teamPrefix}${input.sessionTitle} – ${weekday} ${time} – ${PRESET_UI_LABEL[input.preset]}`;
}

export function trainingAudienceProvenanceLabel(candidateId: string): string {
  const parsed = parseTrainingAudienceCandidateId(candidateId);
  if (!parsed) {
    return "Trainingsteilnahme – Unbekannte Gruppe";
  }
  return `Trainingsteilnahme – ${PRESET_UI_LABEL[parsed.preset]}`;
}

export function trainingParticipationPresetDescription(
  preset: ParticipationAudiencePreset,
): string {
  switch (preset) {
    case "ALL_INVITEES":
      return "Alle Spieler der Saisonkader-Einladung für diese Trainingsteilnahmeanfrage.";
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

export const TRAINING_PARTICIPATION_PRESETS: readonly ParticipationAudiencePreset[] = [
  "ALL_INVITEES",
  "ACCEPTED_ONLY",
  "DECLINED_ONLY",
  "MAYBE_ONLY",
  "NOT_RESPONDED",
] as const;
