/**
 * SCE-DASHBOARD-V3-03 — Pure helpers for "Heute im Verein" event card labels.
 */

import type { TodayScheduleItem } from "@/lib/dashboard/command-center";

export function isTodayMatchCard(item: TodayScheduleItem): boolean {
  return item.eventType === "MATCH" && !!item.matchPresentation;
}

export function isTodayTournamentCard(item: TodayScheduleItem): boolean {
  return item.eventType === "TOURNAMENT";
}

export function formatTodayEventTypeBadge(typeLabel: string): string {
  return typeLabel.trim().toUpperCase();
}

export function buildTodayMatchMetaLine(input: {
  competitionLabel?: string;
  meta?: string;
}): { competition?: string; location?: string } {
  return {
    competition: input.competitionLabel?.trim() || undefined,
    location: input.meta?.trim() || undefined,
  };
}

export function buildTodayTournamentParticipantSummary(count: number): string | undefined {
  if (count <= 0) return undefined;
  return count === 1 ? "1 Teilnehmer" : `${count} Teilnehmer`;
}
