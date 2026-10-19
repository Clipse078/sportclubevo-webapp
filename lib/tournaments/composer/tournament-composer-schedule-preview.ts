/**
 * Live Spielplan preview for HOME tournament composer (02D R5).
 * Reuses template instantiation, TP01 round-robin generation, and deterministic scheduling.
 */

import { generateRoundRobinFixtures } from "@/lib/tournament-scheduling/fixtures/round-robin";
import { buildTemplateScheduleAssignments } from "@/lib/tournament-scheduling/programme-templates/build-template-schedule-assignments";
import { roundPlayingOverlapsPause } from "@/lib/tournament-scheduling/programme-templates/fixed-pause-round-scheduling";
import { buildInstantiatedProgrammePlan } from "@/lib/tournament-scheduling/programme-templates/instantiate-programme-template";
import { mapParticipantsToTemplateSlots } from "@/lib/tournament-scheduling/programme-templates/participant-slot-mapping";
import type { ProgrammeTemplateCategoryContext } from "@/lib/tournament-scheduling/programme-templates/types";
import { getProgrammeTemplateById } from "@/lib/tournament-scheduling/programme-templates/template-registry";
import type { TournamentComposerDraftPayload } from "./tournament-composer-draft-types";
import type { TournamentComposerPlannerDraft } from "./tournament-composer-planner-types";
import { resolveComposerMainPauseUtcWindow } from "./tournament-composer-main-pause";
import { resolveComposerProgrammeProposal } from "./tournament-composer-programme-proposal";
import { resolveEffectiveComposerPlanner } from "./resolve-effective-composer-planner";

export type ComposerSchedulePreviewFixtureRow = {
  fixtureKey: string;
  roundIndex: number;
  roundNumber: number;
  slotIndexInRound: number;
  pitchLocalId: string;
  pitchLabel: string;
  homeParticipantId: string;
  awayParticipantId: string;
  homeDisplayName: string;
  awayDisplayName: string;
  playersPerSide: number | null;
  startUtcMs: number;
  endUtcMs: number;
};

export type ComposerSchedulePreviewRound = {
  roundNumber: number;
  roundStartUtcMs: number;
  roundStartLabel: string;
  fixtures: ComposerSchedulePreviewFixtureRow[];
};

export type ComposerSchedulePreviewResult = {
  status: "OK" | "INCOMPLETE" | "ERROR";
  path: "FULL_TEMPLATE" | "FIELD_ONLY" | "GENERIC" | "NONE";
  errorMessage: string | null;
  rounds: ComposerSchedulePreviewRound[];
  fixtureCount: number;
  roundCount: number;
  programmeEndUtcMs: number | null;
  programmeEndLabel: string | null;
  tournamentStartLabel: string | null;
  pauseLabel: string | null;
  fitStatus: "PASS" | "FAIL" | "INCOMPLETE";
  fitHeadline: string;
  fitDetail: string | null;
  reserveMinutes: number | null;
  deficitMinutes: number | null;
  /** Stable keys for preview ↔ persistence parity (generator keys / fixture keys). */
  assignmentPlan: readonly {
    fixtureKey: string;
    pitchLocalId: string;
    startUtcMs: number;
    endUtcMs: number;
  }[];
};

function formatClockFromUtcMs(utcMs: number): string {
  const d = new Date(utcMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatClockRangeFromUtcMs(startUtcMs: number, endUtcMs: number): string {
  return `${formatClockFromUtcMs(startUtcMs)}–${formatClockFromUtcMs(endUtcMs)}`;
}

function participantDisplayName(
  payload: TournamentComposerDraftPayload,
  participantId: string,
): string {
  return (
    payload.participants.find((p) => p.localId === participantId)?.displayName?.trim() ||
    participantId
  );
}

function orderedPitches(planner: TournamentComposerPlannerDraft) {
  return [...planner.pitches];
}

type InternalFixture = {
  fixtureKey: string;
  roundIndex: number;
  slotIndexInRound: number;
  pitchLocalId: string;
  homeParticipantId: string;
  awayParticipantId: string;
  playersPerSide: number | null;
};

function buildTemplatePathFixtures(input: {
  payload: TournamentComposerDraftPayload;
  planner: TournamentComposerPlannerDraft;
}): InternalFixture[] | { error: string } {
  const templateId = input.planner.programmeTemplateId;
  if (!templateId) {
    return { error: "Programmvorlage fehlt." };
  }
  const template = getProgrammeTemplateById(
    templateId,
    input.planner.programmeTemplateVersion ?? undefined,
  );
  if (!template) {
    return { error: "Programmvorlage konnte nicht geladen werden." };
  }

  const participantCount = input.payload.participants.length;
  const orderingRows = input.payload.participants.map((p, index) => ({
    id: p.localId,
    displayOrder: index,
  }));
  let plan;
  try {
    const slotMapping = mapParticipantsToTemplateSlots({
      participants: orderingRows,
      participantCount,
    });
    plan = buildInstantiatedProgrammePlan({ template, slotMapping });
  } catch {
    return { error: "Mit dieser Teamkonstellation kann der Spielplan nicht erstellt werden." };
  }

  const pitchByFieldKey = new Map<string, string>();
  for (const pitch of input.planner.pitches) {
    if (pitch.templateFieldKey) {
      pitchByFieldKey.set(pitch.templateFieldKey, pitch.localId);
    }
  }
  for (const field of template.fields) {
    if (!pitchByFieldKey.has(field.fieldKey)) {
      return {
        error: "Ein Spielfeld wurde gelöscht, das noch für den gewählten Spielplan benötigt wird.",
      };
    }
  }

  return plan.fixtures.map((row) => ({
    fixtureKey: row.generatorKey,
    roundIndex: row.roundIndex,
    slotIndexInRound: row.slotIndexInRound,
    pitchLocalId: pitchByFieldKey.get(row.fieldKey)!,
    homeParticipantId: row.home.participantId,
    awayParticipantId: row.away.participantId,
    playersPerSide: row.playersPerSide,
  }));
}

function buildRoundRobinPathFixtures(input: {
  payload: TournamentComposerDraftPayload;
  planner: TournamentComposerPlannerDraft;
}): InternalFixture[] | { error: string } {
  const pitches = orderedPitches(input.planner);
  if (pitches.length < 1) {
    return { error: "Mindestens ein Spielfeld ist erforderlich." };
  }
  if (pitches.some((p) => p.playersPerSide == null)) {
    return {
      error: "Mit dieser Feldaufteilung kann der Spielplan nicht vollständig erstellt werden.",
    };
  }

  const participantIds = input.payload.participants.map((p) => p.localId);
  if (participantIds.length < 2) {
    return { error: "Mindestens zwei Teams sind erforderlich." };
  }

  let generated;
  try {
    generated = generateRoundRobinFixtures({
      participantIds,
      config: {
        format: "ROUND_ROBIN",
        stageKey: "MAIN",
        meetingsPerOpponent: input.planner.meetingsPerOpponent,
        homeAwayRelevance: input.planner.homeAwayRelevance === "ON" ? "ON" : "OFF",
      },
    });
  } catch {
    return { error: "Mit dieser Konfiguration kann der Spielplan nicht erstellt werden." };
  }

  return generated.map((row) => {
    const pitch = pitches[row.slotIndexInRound % pitches.length]!;
    return {
      fixtureKey: row.generatorKey,
      roundIndex: row.roundIndex,
      slotIndexInRound: row.slotIndexInRound,
      pitchLocalId: pitch.localId,
      homeParticipantId: row.sideAParticipantId,
      awayParticipantId: row.sideBParticipantId,
      playersPerSide: pitch.playersPerSide ?? null,
    };
  });
}

export function buildTournamentSchedulePreview(input: {
  payload: TournamentComposerDraftPayload;
  categoryContext: ProgrammeTemplateCategoryContext | null;
  planner?: TournamentComposerPlannerDraft;
}): ComposerSchedulePreviewResult {
  const emptyIncomplete = (
    path: ComposerSchedulePreviewResult["path"],
    headline: string,
  ): ComposerSchedulePreviewResult => ({
    status: "INCOMPLETE",
    path,
    errorMessage: headline,
    rounds: [],
    fixtureCount: 0,
    roundCount: 0,
    programmeEndUtcMs: null,
    programmeEndLabel: null,
    tournamentStartLabel: null,
    pauseLabel: null,
    fitStatus: "INCOMPLETE",
    fitHeadline: headline,
    fitDetail: null,
    reserveMinutes: null,
    deficitMinutes: null,
    assignmentPlan: [],
  });

  if (input.payload.homeAway !== "HOME" || !input.payload.planner) {
    return emptyIncomplete("NONE", "Turnierplanung ist nur für Heimturniere verfügbar.");
  }

  const participantCount = input.payload.participants.length;
  const planner =
    input.planner ??
    resolveEffectiveComposerPlanner({
      planner: input.payload.planner,
      participantCount,
      categoryContext: input.categoryContext,
      preserveUserPitchEdits: input.payload.planner.pitchesUserCustomized === true,
    });

  if (participantCount < 2) {
    return emptyIncomplete("NONE", "Füge mindestens zwei Teams hinzu.");
  }
  if (!input.payload.startAt?.trim()) {
    return emptyIncomplete("NONE", "Lege Start- und Endzeit im Schritt Termin fest.");
  }
  if (!input.payload.endAt?.trim()) {
    return emptyIncomplete("NONE", "Lege Start- und Endzeit im Schritt Termin fest.");
  }

  const startMs = new Date(input.payload.startAt).getTime();
  const endMs = new Date(input.payload.endAt).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    return emptyIncomplete("NONE", "Turnierzeitfenster ist unvollständig.");
  }

  const proposal = resolveComposerProgrammeProposal({
    participantCount,
    categoryContext: input.categoryContext,
  });

  let path: ComposerSchedulePreviewResult["path"] = "GENERIC";
  if (proposal.kind === "FULL_TEMPLATE") path = "FULL_TEMPLATE";
  else if (proposal.kind === "FIELD_PROPOSAL_ONLY") path = "FIELD_ONLY";

  let fixtures: InternalFixture[] | { error: string };
  if (proposal.kind === "FULL_TEMPLATE" && planner.programmeTemplateId) {
    fixtures = buildTemplatePathFixtures({ payload: input.payload, planner });
  } else {
    fixtures = buildRoundRobinPathFixtures({ payload: input.payload, planner });
  }

  if ("error" in fixtures) {
    return {
      status: "ERROR",
      path,
      errorMessage: fixtures.error,
      rounds: [],
      fixtureCount: 0,
      roundCount: 0,
      programmeEndUtcMs: null,
      programmeEndLabel: null,
      tournamentStartLabel: formatClockFromUtcMs(startMs),
      pauseLabel: null,
      fitStatus: "INCOMPLETE",
      fitHeadline: fixtures.error,
      fitDetail: null,
      reserveMinutes: null,
      deficitMinutes: null,
      assignmentPlan: [],
    };
  }

  const fixedPause = resolveComposerMainPauseUtcWindow({
    mainPause: planner.mainPause,
    tournamentStartAt: input.payload.startAt,
    tournamentEndAt: input.payload.endAt,
  });

  const scheduleFixtures = fixtures.map((f) => ({
    fixtureId: f.fixtureKey,
    tournamentPitchId: f.pitchLocalId,
    roundIndex: f.roundIndex,
  }));

  const assignments = buildTemplateScheduleAssignments({
    tournamentStartUtcMs: startMs,
    matchDurationMinutes: planner.timing.matchDurationMinutes,
    transitionMinutes: planner.timing.transitionMinutes,
    fixedPause,
    fixtures: scheduleFixtures,
  });

  const assignmentByKey = new Map(assignments.map((a) => [a.fixtureId, a]));
  const pitchLabelById = new Map(planner.pitches.map((p) => [p.localId, p.label]));

  const rows: ComposerSchedulePreviewFixtureRow[] = fixtures.map((fixture) => {
    const assignment = assignmentByKey.get(fixture.fixtureKey)!;
    return {
      fixtureKey: fixture.fixtureKey,
      roundIndex: fixture.roundIndex,
      roundNumber: fixture.roundIndex + 1,
      slotIndexInRound: fixture.slotIndexInRound,
      pitchLocalId: fixture.pitchLocalId,
      pitchLabel: pitchLabelById.get(fixture.pitchLocalId) ?? fixture.pitchLocalId,
      homeParticipantId: fixture.homeParticipantId,
      awayParticipantId: fixture.awayParticipantId,
      homeDisplayName: participantDisplayName(input.payload, fixture.homeParticipantId),
      awayDisplayName: participantDisplayName(input.payload, fixture.awayParticipantId),
      playersPerSide: fixture.playersPerSide,
      startUtcMs: assignment.startUtcMs,
      endUtcMs: assignment.resourceEndUtcMs,
    };
  });

  if (fixedPause) {
    for (const row of rows) {
      if (
        roundPlayingOverlapsPause({
          roundStartUtcMs: row.startUtcMs,
          matchDurationMinutes: planner.timing.matchDurationMinutes,
          pause: fixedPause,
        })
      ) {
        return {
          status: "ERROR",
          path,
          errorMessage: "Der Spielplan überschneidet sich mit der Turnierpause.",
          rounds: [],
          fixtureCount: rows.length,
          roundCount: 0,
          programmeEndUtcMs: null,
          programmeEndLabel: null,
          tournamentStartLabel: formatClockFromUtcMs(startMs),
          pauseLabel: formatClockRangeFromUtcMs(fixedPause.startUtcMs, fixedPause.endUtcMs),
          fitStatus: "INCOMPLETE",
          fitHeadline: "Der Spielplan überschneidet sich mit der Turnierpause.",
          fitDetail: null,
          reserveMinutes: null,
          deficitMinutes: null,
          assignmentPlan: [],
        };
      }
    }
  }

  const roundMap = new Map<number, ComposerSchedulePreviewFixtureRow[]>();
  for (const row of rows) {
    const bucket = roundMap.get(row.roundIndex) ?? [];
    bucket.push(row);
    roundMap.set(row.roundIndex, bucket);
  }

  const rounds: ComposerSchedulePreviewRound[] = [...roundMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([roundIndex, roundRows]) => {
      const sorted = [...roundRows].sort((a, b) => a.slotIndexInRound - b.slotIndexInRound);
      const roundStartUtcMs = sorted[0]!.startUtcMs;
      return {
        roundNumber: roundIndex + 1,
        roundStartUtcMs,
        roundStartLabel: formatClockFromUtcMs(roundStartUtcMs),
        fixtures: sorted,
      };
    });

  const programmeEndUtcMs = rows.reduce(
    (max, row) => Math.max(max, row.endUtcMs),
    startMs,
  );
  const availableMinutes = Math.round((endMs - startMs) / 60_000);
  const requiredMinutes = Math.round((programmeEndUtcMs - startMs) / 60_000);
  const tournamentEndLabel = formatClockFromUtcMs(endMs);
  const programmeEndLabel = formatClockFromUtcMs(programmeEndUtcMs);

  let fitStatus: ComposerSchedulePreviewResult["fitStatus"] = "PASS";
  let fitHeadline = "Der Spielplan passt in die geplante Turnierzeit.";
  let fitDetail = `Spielplan endet: ${programmeEndLabel}\nTurnierende: ${tournamentEndLabel}`;
  let reserveMinutes: number | null = availableMinutes - requiredMinutes;
  let deficitMinutes: number | null = null;

  if (requiredMinutes > availableMinutes) {
    fitStatus = "FAIL";
    deficitMinutes = requiredMinutes - availableMinutes;
    reserveMinutes = null;
    fitHeadline = `Der Spielplan benötigt ${deficitMinutes} Minuten mehr.`;
    fitDetail = `Spielplan endet: ${programmeEndLabel}\nTurnierende: ${tournamentEndLabel}\nFehlend: ${deficitMinutes} Min.`;
  } else if (reserveMinutes != null && reserveMinutes >= 0) {
    fitDetail += `\nReserve: ${reserveMinutes} Min.`;
  }

  return {
    status: "OK",
    path,
    errorMessage: null,
    rounds,
    fixtureCount: rows.length,
    roundCount: rounds.length,
    programmeEndUtcMs,
    programmeEndLabel,
    tournamentStartLabel: formatClockFromUtcMs(startMs),
    pauseLabel: fixedPause
      ? formatClockRangeFromUtcMs(fixedPause.startUtcMs, fixedPause.endUtcMs)
      : null,
    fitStatus,
    fitHeadline,
    fitDetail,
    reserveMinutes,
    deficitMinutes,
    assignmentPlan: assignments.map((a) => ({
      fixtureKey: a.fixtureId,
      pitchLocalId: a.tournamentPitchId,
      startUtcMs: a.startUtcMs,
      endUtcMs: a.resourceEndUtcMs,
    })),
  };
}

/** Convenience for template-only instantiate checks in tests. */
export function buildComposerSchedulePreviewForDraft(
  payload: TournamentComposerDraftPayload,
  categoryContext: ProgrammeTemplateCategoryContext | null,
): ComposerSchedulePreviewResult {
  return buildTournamentSchedulePreview({ payload, categoryContext });
}
