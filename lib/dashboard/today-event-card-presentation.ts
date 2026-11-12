/**
 * SCE-DASHBOARD-V3-03 — Pure helpers for "Heute im Verein" event card labels.
 */

import type { TodayScheduleItem } from "@/lib/dashboard/command-center";
import { resolveProgrammeActivityDisplayTypeLabel } from "@/lib/personal-agenda/programme-activity-german-labels";
import type { PersonalProgrammeSourceType } from "@/lib/personal-agenda/personal-programme-types";

export function isTodayMatchCard(item: TodayScheduleItem): boolean {
  return item.eventType === "MATCH" && !!item.matchPresentation;
}

export function isTodayTournamentCard(item: TodayScheduleItem): boolean {
  return item.eventType === "TOURNAMENT";
}

export function formatTodayEventTypeBadge(
  typeLabel: string,
  options?: {
    sourceType?: PersonalProgrammeSourceType | null;
    semanticType?: string | null;
  },
): string {
  const resolved = resolveProgrammeActivityDisplayTypeLabel({
    typeLabel,
    sourceType: options?.sourceType ?? undefined,
    semanticType: options?.semanticType ?? undefined,
  });
  return resolved.trim().toUpperCase();
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
