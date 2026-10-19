/**
 * SCE-TOURNAMENT-PLANNER-01H-R1 — persist HOME tournament planner configuration after composer creation.
 */

import { parseTenantLocalDateTimeInput, resolveTenantEventTimezone } from "@/lib/events/tenant-local-datetime";
import { prisma } from "@/lib/db/prisma";
import { upsertTournamentCompetitionConfiguration } from "@/lib/tournament-scheduling/competition-structure/competition-structure-service";
import { listTournamentPhases, updateTournamentPhaseGroupMixStrategy } from "@/lib/tournament-scheduling/competition-structure/competition-structure-service";
import { formTournamentGroupsAndGenerateGroupFixtures } from "@/lib/tournament-scheduling/group-formation/group-formation-service";
import { generateKnockoutBracketForPhase } from "@/lib/tournament-scheduling/knockout-bracket/knockout-bracket-service";
import { applyGroupToKnockoutQualificationAndGenerateBracket } from "@/lib/tournament-scheduling/qualification-mapping/qualification-mapping-service";
import { generateTournamentFixturesForEvent } from "@/lib/tournament-scheduling/fixture-generation-service";
import { createTournamentBreak } from "@/lib/tournament-scheduling/tournament-break-service";
import { createTournamentPitch } from "@/lib/tournament-scheduling/tournament-pitch-service";
import { createWorkingTournamentScheduleVersion } from "@/lib/tournament-scheduling/schedule-version-service";
import { applyProgrammeTemplateToTournament } from "@/lib/tournament-scheduling/programme-templates/programme-template-service";
import { getProgrammeTemplateById } from "@/lib/tournament-scheduling/programme-templates/template-registry";
import { evaluateComposerTemplateApplicability } from "./tournament-composer-programme-proposal";
import type { TournamentComposerDraftPayload } from "./tournament-composer-draft-types";
import type { TournamentComposerPlannerDraft } from "./tournament-composer-planner-types";
import { resolveEffectiveGroupCount } from "./tournament-composer-planner-defaults";
import { resolveComposerBreakDateTimes } from "./tournament-composer-planner-breaks";
import { resolveComposerMainPauseUtcWindow } from "./tournament-composer-main-pause";
import { syncComposerValidatedScheduleFromDraft } from "./sync-composer-schedule-preview-persistence";

export async function persistTournamentPlannerFromComposer(input: {
  tenantId: string;
  tournamentId: string;
  payload: TournamentComposerDraftPayload;
  planner: TournamentComposerPlannerDraft;
}): Promise<void> {
  const { tenantId, tournamentId, payload, planner } = input;
  if (payload.homeAway !== "HOME") {
    return;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { timezone: true },
  });
  const tenantTimeZone = resolveTenantEventTimezone(tenant?.timezone);

  await createWorkingTournamentScheduleVersion(tenantId, tournamentId, {
    matchDurationMinutes: planner.timing.matchDurationMinutes,
    transitionMinutes: planner.timing.transitionMinutes,
    minRestMinutes: planner.timing.minRestMinutes,
  });

  if (planner.programmeTemplateId) {
    const template = getProgrammeTemplateById(
      planner.programmeTemplateId,
      planner.programmeTemplateVersion ?? undefined,
    );
    const applicability =
      template != null
        ? evaluateComposerTemplateApplicability({ template, pitches: planner.pitches })
        : "INCOMPATIBLE";
    if (template && applicability !== "INCOMPATIBLE") {
      const pitchOverrides =
        planner.pitchesUserCustomized || applicability === "CUSTOM_COMPATIBLE"
          ? new Map(
              planner.pitches
                .filter((p) => p.templateFieldKey)
                .map((p, index) => [
                  p.templateFieldKey!,
                  {
                    label: p.label,
                    playersPerSide: p.playersPerSide ?? null,
                    displayOrder: index,
                  },
                ]),
            )
          : undefined;
      const mainPause = planner.mainPause;
      const pauseWindow =
        mainPause?.enabled === true
          ? resolveComposerMainPauseUtcWindow({
              mainPause,
              tournamentStartAt: payload.startAt,
              tournamentEndAt: payload.endAt,
              timeZone: tenantTimeZone,
            })
          : null;
      await applyProgrammeTemplateToTournament({
        tenantId,
        tournamentId,
        templateId: planner.programmeTemplateId,
        templateVersion: planner.programmeTemplateVersion ?? undefined,
        replaceExisting: true,
        pitchOverrides,
        mainBreakDurationMinutes:
          mainPause?.enabled === true ? mainPause.durationMinutes : 0,
        mainBreakAfterRoundNumbers: pauseWindow ? [] : mainPause?.enabled === true ? [mainPause.afterRoundNumber ?? 1] : [],
        mainBreakStartAt:
          pauseWindow != null ? new Date(pauseWindow.startUtcMs) : null,
      });
      return;
    }
  }

  const groupCount = resolveEffectiveGroupCount(planner);

  await upsertTournamentCompetitionConfiguration(
    tenantId,
    tournamentId,
    planner.competitionFormat,
  );

  await prisma.tournamentCompetitionConfiguration.update({
    where: { eventId: tournamentId },
    data: {
      fixtureHomeAwayRelevance: "OFF",
      roundRobinMeetingsPerOpponent: planner.meetingsPerOpponent,
      automaticGroupCount: groupCount,
      knockoutQualifiersPerGroup:
        planner.competitionFormat === "GROUP_PLUS_KNOCKOUT"
          ? planner.knockoutQualifiersPerGroup
          : null,
    },
  });

  await prisma.tournamentRankingConfiguration.upsert({
    where: { eventId: tournamentId },
    create: {
      tenantId,
      eventId: tournamentId,
      winPoints: planner.ranking.winPoints,
      drawPoints: planner.ranking.drawPoints,
      lossPoints: planner.ranking.lossPoints,
      tiebreakOrder: [...planner.ranking.tiebreakOrder],
    },
    update: {
      winPoints: planner.ranking.winPoints,
      drawPoints: planner.ranking.drawPoints,
      lossPoints: planner.ranking.lossPoints,
      tiebreakOrder: [...planner.ranking.tiebreakOrder],
    },
  });

  const phases = await listTournamentPhases(tenantId, tournamentId);
  const groupPhase = phases.find((p) => p.phaseType === "GROUP_MIX") ?? null;
  const knockoutPhase = phases.find((p) => p.phaseType === "KNOCKOUT") ?? null;

  if (groupPhase) {
    await updateTournamentPhaseGroupMixStrategy(tenantId, tournamentId, groupPhase.id, {
      groupMixStrategy: planner.groupMixStrategy,
      smartMixTargetMatchesPerParticipant:
        planner.groupMixStrategy === "SMART_MIX"
          ? planner.smartMixTargetMatchesPerParticipant
          : null,
    });
  }

  const participantRows = await prisma.tournamentParticipant.findMany({
    where: { tenantId, eventId: tournamentId },
    select: { id: true },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
  });
  const participantIds = participantRows.map((p) => p.id);

  const generationOptions = {
    meetingsPerOpponent: planner.meetingsPerOpponent,
    homeAwayRelevance: planner.homeAwayRelevance,
    targetMatchesPerParticipant:
      planner.groupMixStrategy === "SMART_MIX"
        ? (planner.smartMixTargetMatchesPerParticipant ?? undefined)
        : undefined,
    strategy: planner.groupMixStrategy,
  } as const;

  if (planner.competitionFormat === "KNOCKOUT_ONLY" && knockoutPhase) {
    await generateKnockoutBracketForPhase(tenantId, {
      tournamentId,
      phaseId: knockoutPhase.id,
      entrants: participantIds.map((participantId) => ({
        kind: "CONCRETE_PARTICIPANT" as const,
        participantId,
      })),
    });
  } else if (planner.competitionFormat === "GROUP_MIX_ONLY" && groupPhase) {
    if (groupCount <= 1) {
      await generateTournamentFixturesForEvent(tenantId, tournamentId, {
        phaseId: groupPhase.id,
        ...generationOptions,
      });
    } else {
      await formTournamentGroupsAndGenerateGroupFixtures(tenantId, {
        tournamentId,
        phaseId: groupPhase.id,
        participantIds,
        groupCount,
        ...generationOptions,
      });
    }
  } else if (
    planner.competitionFormat === "GROUP_PLUS_KNOCKOUT" &&
    groupPhase &&
    knockoutPhase
  ) {
    await formTournamentGroupsAndGenerateGroupFixtures(tenantId, {
      tournamentId,
      phaseId: groupPhase.id,
      participantIds,
      groupCount,
      ...generationOptions,
    });
    await applyGroupToKnockoutQualificationAndGenerateBracket(tenantId, {
      tournamentId,
      groupPhaseId: groupPhase.id,
      knockoutPhaseId: knockoutPhase.id,
      mapping: {
        mode: "DEFAULT",
        qualifiersPerGroup: planner.knockoutQualifiersPerGroup,
      },
    });
  }

  const pitchIdByLocal = new Map<string, string>();
  for (let i = 0; i < planner.pitches.length; i += 1) {
    const pitch = planner.pitches[i]!;
    const created = await createTournamentPitch(tenantId, tournamentId, {
      label: pitch.label,
      displayOrder: i,
      playersPerSide: pitch.playersPerSide ?? null,
    });
    pitchIdByLocal.set(pitch.localId, created.id);
  }

  for (const br of planner.breaks) {
    const interval = resolveComposerBreakDateTimes(br, payload.startAt, tenantTimeZone);
    if (!interval) {
      throw new Error("Ungültige Pausenzeit.");
    }
    const startAt = parseTenantLocalDateTimeInput(interval.startAt, tenantTimeZone);
    const endAt = parseTenantLocalDateTimeInput(interval.endAt, tenantTimeZone);
    if (!startAt || !endAt) {
      throw new Error("Ungültige Pausenzeit.");
    }
    const scope =
      br.fieldSelectionAdvanced && br.scope === "SELECTED_PITCHES"
        ? "SELECTED_PITCHES"
        : "ALL_PITCHES";
    await createTournamentBreak(tenantId, tournamentId, {
      label: br.label,
      startAt,
      endAt,
      scope,
      tournamentPitchIds:
        scope === "SELECTED_PITCHES"
          ? br.tournamentPitchLocalIds
              .map((localId) => pitchIdByLocal.get(localId))
              .filter((id): id is string => !!id)
          : undefined,
    });
  }

  await syncComposerValidatedScheduleFromDraft({
    tenantId,
    tournamentId,
    payload,
    planner,
    pitchIdByLocalId: pitchIdByLocal,
    tenantTimeZone,
  });
}
