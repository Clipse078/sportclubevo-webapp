/**
 * TURNIERE-UX-02 — record workspace presentation (pure, no I/O).
 */

import { assessTournamentOperationalState } from "./operational-state";
import {
  isTenantHostedTournament,
  resolveTournamentCategoryAgeLine,
  resolveTournamentPublicationPresentation,
  resolveTournamentRowCrest,
  resolveTournamentStatusPresentation,
} from "./management-view";
import { formatTournamentDatePresentation, TOURNAMENT_STATUS_LABELS } from "./presentation";
import type { TournamentDto } from "./types";
import type { TournamentOperationalAssessment } from "./operational-state";

export type TurniereRecordResourcePresentation = {
  facilityName: string | null;
  pitchCodes: string[];
  dressingRoomCodes: string[];
};

export function formatTurniereRecordDateLine(
  startAt: string,
  endAt: string | null,
  locale: string,
  timeZone: string,
): string {
  const parts = formatTournamentDatePresentation(startAt, endAt, locale, timeZone);
  const month = parts.monthShort.charAt(0) + parts.monthShort.slice(1).toLowerCase();
  return `${parts.weekdayShort}., ${parseInt(parts.day, 10)}. ${month} ${parts.timeLabel}`;
}

export function formatTurniereRecordScheduleRailLine(
  startAt: string,
  locale: string,
  timeZone: string,
): string {
  const start = new Date(startAt);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone })
    .format(start)
    .replace(/\.$/, "");
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", timeZone }).format(start);
  const month = new Intl.DateTimeFormat(locale, { month: "long", timeZone }).format(start);
  return `${weekday}., ${day}. ${month}`;
}

export function formatTurniereRecordTimeOnly(
  startAt: string,
  locale: string,
  timeZone: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(startAt));
}

export function resolveTurniereRecordHomeAwayLabel(homeAway: TournamentDto["homeAway"]): string {
  return isTenantHostedTournament({ homeAway }) ? "Eigenes Turnier" : "Externes Turnier";
}

export function resolveTurniereRecordStatusLabel(
  tournament: TournamentDto,
  assessment?: TournamentOperationalAssessment,
): string {
  const resolved = resolveTournamentStatusPresentation(
    tournament,
    assessment ?? assessTournamentOperationalState(tournament),
  );
  return resolved.label;
}

export function resolveTurniereRecordLastChangedLabel(
  tournament: Pick<TournamentDto, "updatedAt">,
  locale: string,
  timeZone: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(tournament.updatedAt));
}

export function resolveTurniereRecordResourcePresentation(
  tournament: TournamentDto,
): TurniereRecordResourcePresentation {
  const pitchCodes = tournament.resourceAllocations
    .map((a) => a.facilityResourceCode?.trim() || a.facilityResourceName.trim())
    .filter(Boolean);

  const dressingSet = new Set<string>();
  for (const participant of tournament.participants) {
    for (const allocation of participant.dressingRoomAllocations) {
      const code = allocation.facilityResourceCode?.trim() || allocation.facilityResourceName.trim();
      if (code) dressingSet.add(code);
    }
  }

  const facilityNames = new Set<string>();
  for (const allocation of tournament.resourceAllocations) {
    if (allocation.facilityName?.trim()) facilityNames.add(allocation.facilityName.trim());
  }
  for (const participant of tournament.participants) {
    for (const allocation of participant.dressingRoomAllocations) {
      if (allocation.facilityName?.trim()) facilityNames.add(allocation.facilityName.trim());
    }
  }

  const facilityName =
    facilityNames.size === 1
      ? [...facilityNames][0]!
      : facilityNames.size > 1
        ? [...facilityNames].join(" · ")
        : tournament.location?.trim() || null;

  return {
    facilityName,
    pitchCodes,
    dressingRoomCodes: [...dressingSet].sort((a, b) => a.localeCompare(b, "de")),
  };
}

export function resolveTurniereRecordVenueLine(tournament: TournamentDto): string | null {
  const location = tournament.location?.trim();
  if (location) return location;
  const resources = resolveTurniereRecordResourcePresentation(tournament);
  return resources.facilityName;
}

export function shouldShowTurniereRecordReadinessPill(
  homeAway: TournamentDto["homeAway"],
  assessment: TournamentOperationalAssessment,
): boolean {
  if (assessment.status === "NOT_APPLICABLE") return false;
  if (!isTenantHostedTournament({ homeAway })) return false;
  return true;
}

export function resolveTurniereRecordIdentity(tournament: TournamentDto, tenantLogoUrl: string | null) {
  return {
    crest: resolveTournamentRowCrest(tournament, tenantLogoUrl),
    categoryLine: resolveTournamentCategoryAgeLine(tournament),
    competitionLabel: tournament.competitionLabel?.trim() || null,
    participantCount: tournament.participants.length,
    publication: resolveTournamentPublicationPresentation(tournament),
    homeAwayLabel: resolveTurniereRecordHomeAwayLabel(tournament.homeAway),
    canonicalStatusLabel: TOURNAMENT_STATUS_LABELS[tournament.status] ?? tournament.status,
  };
}
