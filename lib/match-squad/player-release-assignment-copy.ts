/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01E — assignment notification copy & deep links.
 */

import { buildActivityTabHref } from "@/lib/activity-navigation/url";
import { inboundPlayerReleaseActivityHref } from "@/lib/match-squad/player-release-target-awareness-copy";

export function formatPlayerReleaseActivityScheduleLine(
  startAt: Date,
  timezone: string,
): string {
  const dateFmt = new Intl.DateTimeFormat("de-CH", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
  });
  const timeFmt = new Intl.DateTimeFormat("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });
  return `${dateFmt.format(startAt)} · ${timeFmt.format(startAt)}`;
}

export function buildPlayerReleaseAssignmentPlayerCopy(input: {
  targetTeamLabel: string;
  activityScheduleLine: string;
  activityTitle: string | null;
  eventType: "MATCH" | "TOURNAMENT";
}): { title: string; body: string } {
  const title = `Aufgebot für ${input.targetTeamLabel}`;
  const activityPart =
    input.eventType === "MATCH" && input.activityTitle?.trim()
      ? `Spiel ${input.activityTitle.trim()}`
      : input.eventType === "TOURNAMENT" && input.activityTitle?.trim()
        ? `Turnier ${input.activityTitle.trim()}`
        : "Einsatz";
  const body = `Du wurdest für ${activityPart} am ${input.activityScheduleLine} aufgeboten.`;
  return { title, body };
}

export function buildPlayerReleaseAssignmentSourceTrainerCopy(input: {
  personDisplayName: string;
  targetTeamLabel: string;
  activityScheduleLine: string;
}): { title: string; body: string } {
  return {
    title: "Spieler aufgeboten",
    body: `${input.personDisplayName} wurde für ${input.targetTeamLabel} am ${input.activityScheduleLine} aufgeboten.`,
  };
}

export function playerReleaseAssignmentParticipationHref(input: {
  eventType: "MATCH" | "TOURNAMENT";
  eventId: string;
}): string {
  const base = inboundPlayerReleaseActivityHref({
    eventType: input.eventType,
    eventId: input.eventId,
  });
  return buildActivityTabHref(base, "teilnahme");
}

export function playerReleaseAssignmentAufgebotHref(input: {
  eventType: "MATCH" | "TOURNAMENT";
  eventId: string;
}): string {
  const base = inboundPlayerReleaseActivityHref({
    eventType: input.eventType,
    eventId: input.eventId,
  });
  return buildActivityTabHref(base, "aufgebot");
}
