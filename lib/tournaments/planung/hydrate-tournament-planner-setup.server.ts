/**
 * Hydrates composer planner draft + payload for existing HOME tournament setup (TP01/02 reuse).
 */
import { prisma } from "@/lib/db/prisma";
import { requireTenantOrganisedTournament } from "@/lib/tournament-scheduling/internal/require-tenant-organised-tournament";
import { utcInstantToDateTimeLocalValue } from "@/lib/events/tenant-local-datetime";
import { listTournamentPitches } from "@/lib/tournament-scheduling/tournament-pitch-service";
import { listTournamentBreaks } from "@/lib/tournament-scheduling/tournament-break-service";
import { resolveTournamentSchedulingConfig } from "@/lib/tournament-scheduling/feasibility-service";
import { createDefaultTournamentComposerPlannerDraft } from "@/lib/tournaments/composer/tournament-composer-planner-defaults";
import type { TournamentComposerDraftPayload } from "@/lib/tournaments/composer/tournament-composer-draft-types";
import type { TournamentComposerPlannerDraft } from "@/lib/tournaments/composer/tournament-composer-planner-types";
import { resolveProgrammeCategoryFromTeamAgeGroups } from "@/lib/tournament-scheduling/programme-templates/programme-template-category";
import type { ProgrammeTemplateCategoryContext } from "@/lib/tournament-scheduling/programme-templates/types";
import type { TournamentCompetitionFormat } from "@/lib/tournament-scheduling/competition-structure/types";
import type { TournamentRankingTiebreakCriterion } from "@/lib/tournament-scheduling/competition-structure/types";

function breakStartLocalTime(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  });
}

function breakDurationMinutes(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.round((end - start) / 60_000);
}

export async function hydrateTournamentPlannerSetupDraft(input: {
  tenantId: string;
  tournamentId: string;
  timezone: string;
}): Promise<{
  payload: TournamentComposerDraftPayload;
  planner: TournamentComposerPlannerDraft;
  participantCount: number;
  categoryContext: ProgrammeTemplateCategoryContext | null;
  defaultMatchDurationMinutes: number;
}> {
  await requireTenantOrganisedTournament(input.tenantId, input.tournamentId);

  const event = await prisma.event.findFirstOrThrow({
    where: { id: input.tournamentId, tenantId: input.tenantId, type: "TOURNAMENT" },
    select: {
      id: true,
      seasonId: true,
      title: true,
      description: true,
      competitionLabel: true,
      resultLabel: true,
      remarks: true,
      location: true,
      homeAway: true,
      startAt: true,
      endAt: true,
      meetingTime: true,
      organizerName: true,
      websiteVisible: true,
      infoboardVisible: true,
      homepageVisible: true,
      wochenplanVisible: true,
      teamPageVisible: true,
    },
  });

  const [participants, pitches, breaks, schedulingConfig, competitionConfig, rankingConfig] =
    await Promise.all([
      prisma.tournamentParticipant.findMany({
        where: { tenantId: input.tenantId, eventId: input.tournamentId },
        orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
        include: {
          team: { select: { ageGroup: true } },
        },
      }),
      listTournamentPitches(input.tenantId, input.tournamentId),
      listTournamentBreaks(input.tenantId, input.tournamentId),
      resolveTournamentSchedulingConfig(input.tenantId, null),
      prisma.tournamentCompetitionConfiguration.findFirst({
        where: { tenantId: input.tenantId, eventId: input.tournamentId },
      }),
      prisma.tournamentRankingConfiguration.findUnique({
        where: { eventId: input.tournamentId },
      }),
    ]);

  const defaultMatchDurationMinutes = 12;

  const plannerBase = createDefaultTournamentComposerPlannerDraft({
    initialPitchCount: Math.max(1, pitches.length),
  });

  const planner: TournamentComposerPlannerDraft = {
    ...plannerBase,
    ...(competitionConfig
      ? {
          competitionFormat: competitionConfig.competitionFormat as TournamentCompetitionFormat,
          meetingsPerOpponent: competitionConfig.roundRobinMeetingsPerOpponent,
          groupCount: competitionConfig.automaticGroupCount ?? plannerBase.groupCount,
          knockoutQualifiersPerGroup:
            competitionConfig.knockoutQualifiersPerGroup ?? plannerBase.knockoutQualifiersPerGroup,
        }
      : null),
    ...(rankingConfig
      ? {
          ranking: {
            winPoints: rankingConfig.winPoints,
            drawPoints: rankingConfig.drawPoints,
            lossPoints: rankingConfig.lossPoints,
            tiebreakOrder: [...(rankingConfig.tiebreakOrder as TournamentRankingTiebreakCriterion[])],
          },
        }
      : null),
    timing: {
      matchDurationMinutes: schedulingConfig.matchDurationMinutes,
      transitionMinutes: schedulingConfig.transitionMinutes,
      minRestMinutes: schedulingConfig.minRestMinutes,
    },
    pitches:
      pitches.length > 0
        ? pitches.map((pitch, index) => ({
            localId: pitch.id,
            label: pitch.label,
            playersPerSide: pitch.playersPerSide,
            userLabelCustomized: true,
          }))
        : plannerBase.pitches,
    pitchesUserCustomized: pitches.length > 0,
    breaks: breaks.map((br, index) => ({
      localId: br.id,
      label: br.label?.trim() || `Pause ${index + 1}`,
      startLocalTime: breakStartLocalTime(br.startAt, input.timezone),
      durationMinutes: breakDurationMinutes(br.startAt, br.endAt),
      scope: br.scope,
      tournamentPitchLocalIds: [...br.tournamentPitchIds],
      fieldSelectionAdvanced:
        br.scope === "SELECTED_PITCHES" && br.tournamentPitchIds.length > 0,
    })),
  };

  const payload: TournamentComposerDraftPayload = {
    seasonId: event.seasonId ?? "",
    title: event.title,
    description: event.description ?? "",
    competitionLabel: event.competitionLabel ?? "",
    resultLabel: event.resultLabel ?? "",
    remarks: event.remarks ?? "",
    location: event.location ?? "",
    homeAway: event.homeAway?.trim().toUpperCase() === "AWAY" ? "AWAY" : "HOME",
    startAt: utcInstantToDateTimeLocalValue(event.startAt, input.timezone),
    endAt: utcInstantToDateTimeLocalValue(event.endAt, input.timezone),
    meetingTime: utcInstantToDateTimeLocalValue(event.meetingTime, input.timezone),
    organizerExternalClubId: null,
    organizerExternalClubName: event.organizerName,
    participants: participants.map((row) => ({
      localId: row.id,
      kind: row.teamId ? "TEAM" : row.externalClubId ? "EXTERNAL_CLUB" : "MANUAL",
      teamId: row.teamId ?? undefined,
      teamAgeGroup: row.team?.ageGroup ?? null,
      externalClubId: row.externalClubId ?? undefined,
      manualLabel: row.manualLabel ?? undefined,
      displayName: row.displayName?.trim() || row.manualLabel?.trim() || "Teilnehmer",
      subLabel: null,
      dressingRooms: [],
    })),
    resourceAllocations: [],
    publication: {
      websiteVisible: event.websiteVisible,
      infoboardVisible: event.infoboardVisible,
      homepageVisible: event.homepageVisible,
      wochenplanVisible: event.wochenplanVisible,
      teamPageVisible: event.teamPageVisible,
    },
    spielplanCreationEnabled: true,
    planner,
  };

  const { categoryContext } = resolveProgrammeCategoryFromTeamAgeGroups(
    participants.map((p) => p.team?.ageGroup ?? null),
  );

  return {
    payload,
    planner,
    participantCount: participants.length,
    categoryContext,
    defaultMatchDurationMinutes,
  };
}
