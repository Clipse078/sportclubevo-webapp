/**
 * SCE-TOURNAMENT-PLANNER-02D — persist predefined programme templates onto canonical TP01 structures.
 */

import { prisma } from "@/lib/db/prisma";
import { compareParticipantId } from "../fixtures/ordering";
import { TOURNAMENT_FIXTURE_STAGE_MAIN } from "../fixtures/constants";
import { requireTenantOrganisedTournament } from "../internal/require-tenant-organised-tournament";
import { TournamentSchedulingError, type TournamentSchedulingErrorCode } from "../errors";
import {
  createTournamentPitch,
  listTournamentPitches,
  updateTournamentPitch,
} from "../tournament-pitch-service";
import { createTournamentBreak, listTournamentBreaks } from "../tournament-break-service";
import {
  getOrCreateWorkingTournamentScheduleVersion,
  syncOptimisedAssignmentsToVersion,
} from "../tournament-schedule-orchestration-service";
import { listTournamentFixtureAssignmentsForVersion } from "../assignment-service";
import { buildTemplateScheduleAssignments } from "./build-template-schedule-assignments";
import {
  instantiateProgrammeTemplate,
  ProgrammeTemplateInstantiationError,
} from "./instantiate-programme-template";
import { createTemplateUnitResolver } from "./resolve-template-playing-units";
import { resolvedSideToTemplateRef } from "./template-side-ref";
import type { TournamentProgrammeTemplate } from "./types";
import type { TournamentScheduleOptimisationResult } from "../schedule-optimiser/types";

export class ProgrammeTemplateApplyError extends TournamentSchedulingError {
  constructor(code: TournamentSchedulingErrorCode, message: string) {
    super(code, message);
    this.name = "ProgrammeTemplateApplyError";
  }
}

async function assertNoLockedScheduleRows(tenantId: string, scheduleVersionId: string): Promise<void> {
  const locked = await prisma.tournamentFixtureAssignment.count({
    where: {
      tenantId,
      scheduleVersionId,
      OR: [{ scheduleLockDimension: { not: null } }, { isLocked: true }],
    },
  });
  if (locked > 0) {
    throw new ProgrammeTemplateApplyError(
      "PROGRAMME_TEMPLATE.LOCKED_SCHEDULE",
      "Vorhandene gesperrte Spielplan-Einträge verhindern das Ersetzen des vordefinierten Spielplans.",
    );
  }
}

async function syncTemplatePitches(
  tenantId: string,
  tournamentId: string,
  template: TournamentProgrammeTemplate,
): Promise<Map<string, string>> {
  const existing = await listTournamentPitches(tenantId, tournamentId);
  const sortedTemplateFields = [...template.fields].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );

  const fieldKeyToPitchId = new Map<string, string>();

  for (let i = 0; i < sortedTemplateFields.length; i += 1) {
    const field = sortedTemplateFields[i]!;
    const existingPitch = existing[i] ?? null;
    if (existingPitch) {
      await updateTournamentPitch(tenantId, tournamentId, existingPitch.id, {
        label: field.label,
        displayOrder: field.displayOrder,
        playersPerSide: field.playingFormat.playersPerSide,
      });
      fieldKeyToPitchId.set(field.fieldKey, existingPitch.id);
    } else {
      const created = await createTournamentPitch(tenantId, tournamentId, {
        label: field.label,
        displayOrder: field.displayOrder,
        playersPerSide: field.playingFormat.playersPerSide,
      });
      fieldKeyToPitchId.set(field.fieldKey, created.id);
    }
  }

  if (existing.length > sortedTemplateFields.length) {
    throw new ProgrammeTemplateApplyError(
      "PROGRAMME_TEMPLATE.PITCH_COUNT",
      `Dieser Spielplan verwendet ${sortedTemplateFields.length} Felder. Bitte überzählige Turnierfelder manuell entfernen oder ersetzen.`,
    );
  }

  return fieldKeyToPitchId;
}

async function replaceTemplateFixtures(params: {
  tenantId: string;
  tournamentId: string;
  template: TournamentProgrammeTemplate;
  plan: ReturnType<typeof instantiateProgrammeTemplate>;
  fieldKeyToPitchId: Map<string, string>;
  unitResolver: Awaited<ReturnType<typeof createTemplateUnitResolver>>;
}): Promise<Array<{ id: string; planIndex: number }>> {
  await prisma.tournamentFixtureAssignment.deleteMany({
    where: { tenantId: params.tenantId, fixture: { eventId: params.tournamentId } },
  });
  await prisma.tournamentFixture.deleteMany({
    where: { tenantId: params.tenantId, eventId: params.tournamentId },
  });

  const created: Array<{ id: string; planIndex: number }> = [];
  for (let index = 0; index < params.plan.fixtures.length; index += 1) {
    const row = params.plan.fixtures[index]!;
    const homeParticipant = params.plan.slotMapping[row.home.slot as keyof typeof params.plan.slotMapping];
    const awayParticipant = params.plan.slotMapping[row.away.slot as keyof typeof params.plan.slotMapping];
    if (!homeParticipant || !awayParticipant) {
      throw new ProgrammeTemplateApplyError(
        "PROGRAMME_TEMPLATE.SLOT_MAPPING",
        "Teilnehmer-Zuordnung unvollständig.",
      );
    }

    const participantRows = await prisma.tournamentParticipant.findMany({
      where: {
        tenantId: params.tenantId,
        eventId: params.tournamentId,
        id: { in: [homeParticipant, awayParticipant] },
      },
      select: { id: true, displayName: true, eventId: true },
    });
    const byId = new Map(participantRows.map((p) => [p.id, p]));
    const homeP = byId.get(homeParticipant);
    const awayP = byId.get(awayParticipant);
    if (!homeP || !awayP) {
      throw new ProgrammeTemplateApplyError(
        "PROGRAMME_TEMPLATE.PARTICIPANT",
        "Teilnehmer für Spielplan-Zuordnung nicht gefunden.",
      );
    }

    const homeParticipantRow = {
      id: homeP.id,
      tournamentId: homeP.eventId,
      displayName: homeP.displayName ?? "",
    };
    const awayParticipantRow = {
      id: awayP.id,
      tournamentId: awayP.eventId,
      displayName: awayP.displayName ?? "",
    };
    const homeUnit = await params.unitResolver.resolve(resolvedSideToTemplateRef(row.home), homeParticipantRow);
    const awayUnit = await params.unitResolver.resolve(resolvedSideToTemplateRef(row.away), awayParticipantRow);

    const sideA =
      compareParticipantId(homeParticipant, awayParticipant) <= 0
        ? homeParticipant
        : awayParticipant;
    const sideB =
      compareParticipantId(homeParticipant, awayParticipant) <= 0
        ? awayParticipant
        : homeParticipant;
    const sideAUnit = sideA === homeParticipant ? homeUnit : awayUnit;
    const sideBUnit = sideB === homeParticipant ? homeUnit : awayUnit;

    const fixture = await prisma.tournamentFixture.create({
      data: {
        tenantId: params.tenantId,
        eventId: params.tournamentId,
        stageKey: TOURNAMENT_FIXTURE_STAGE_MAIN,
        roundIndex: row.roundIndex,
        slotIndexInRound: row.slotIndexInRound,
        generatorKey: row.generatorKey,
        sideAParticipantId: sideA,
        sideBParticipantId: sideB,
      },
    });

    await prisma.tournamentFixtureSide.createMany({
      data: [
        {
          tenantId: params.tenantId,
          fixtureId: fixture.id,
          side: "A",
          sourceType: "CONCRETE_PARTICIPANT",
          participantId: sideA,
          participantUnitId: sideAUnit.isPersisted ? sideAUnit.id : null,
        },
        {
          tenantId: params.tenantId,
          fixtureId: fixture.id,
          side: "B",
          sourceType: "CONCRETE_PARTICIPANT",
          participantId: sideB,
          participantUnitId: sideBUnit.isPersisted ? sideBUnit.id : null,
        },
      ],
    });

    created.push({ id: fixture.id, planIndex: index });
  }

  return created;
}

async function ensureTemplateBreaks(
  tenantId: string,
  tournamentId: string,
  template: TournamentProgrammeTemplate,
  tournamentStart: Date,
  matchDurationMinutes: number,
  transitionMinutes: number,
  breakDurationMinutes: number,
): Promise<void> {
  const existing = await listTournamentBreaks(tenantId, tournamentId);
  if (existing.length > 0) {
    return;
  }
  const slotMs = (matchDurationMinutes + transitionMinutes) * 60_000;
  for (const hint of template.breakHints) {
    const startAt = new Date(
      tournamentStart.getTime() + hint.afterRoundNumber * slotMs,
    );
    const endAt = new Date(startAt.getTime() + breakDurationMinutes * 60_000);
    await createTournamentBreak(tenantId, tournamentId, {
      label: hint.label ?? "Pause",
      startAt,
      endAt,
      scope: "ALL_PITCHES",
    });
  }
}

export async function applyProgrammeTemplateToTournament(input: {
  tenantId: string;
  tournamentId: string;
  templateId: string;
  templateVersion?: number;
  replaceExisting?: boolean;
  expectedRevision?: number;
}): Promise<{
  template: TournamentProgrammeTemplate;
  scheduleVersionId: string;
  revision: number;
  fixtureCount: number;
}> {
  await requireTenantOrganisedTournament(input.tenantId, input.tournamentId);

  const participants = await prisma.tournamentParticipant.findMany({
    where: { tenantId: input.tenantId, eventId: input.tournamentId },
    select: { id: true, displayOrder: true, displayName: true, eventId: true },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
  });

  let plan;
  try {
    plan = instantiateProgrammeTemplate({
      templateId: input.templateId,
      templateVersion: input.templateVersion,
      participants,
    });
  } catch (err) {
    if (err instanceof ProgrammeTemplateInstantiationError) {
      throw new ProgrammeTemplateApplyError("PROGRAMME_TEMPLATE.INVALID", err.message);
    }
    throw err;
  }

  const event = await prisma.event.findFirstOrThrow({
    where: { id: input.tournamentId, tenantId: input.tenantId, type: "TOURNAMENT" },
    select: { startAt: true, endAt: true },
  });
  if (!event.startAt || !event.endAt) {
    throw new ProgrammeTemplateApplyError(
      "PROGRAMME_TEMPLATE.INCOMPLETE",
      "Zeitfenster fehlt für die Turnierplanung.",
    );
  }

  const working = await getOrCreateWorkingTournamentScheduleVersion(
    input.tenantId,
    input.tournamentId,
  );
  if (
    input.expectedRevision !== undefined &&
    input.expectedRevision !== working.revision
  ) {
    throw new TournamentSchedulingError(
      "SCHEDULE.STALE_VERSION",
      `Schedule revision mismatch: expected ${input.expectedRevision}, actual ${working.revision}`,
    );
  }

  const existingFixtureCount = await prisma.tournamentFixture.count({
    where: { tenantId: input.tenantId, eventId: input.tournamentId },
  });
  if (existingFixtureCount > 0 && !input.replaceExisting) {
    throw new ProgrammeTemplateApplyError(
      "PROGRAMME_TEMPLATE.EXISTING_FIXTURES",
      "Es existiert bereits ein Spielplan. Erneutes Anwenden erfordert explizite Ersetzung.",
    );
  }

  await assertNoLockedScheduleRows(input.tenantId, working.id);

  const fieldKeyToPitchId = await syncTemplatePitches(
    input.tenantId,
    input.tournamentId,
    plan.template,
  );

  const participantsById = new Map(
    participants.map((p) => [
      p.id,
      {
        id: p.id,
        tournamentId: p.eventId,
        displayName: p.displayName ?? "",
      },
    ]),
  );
  const unitResolver = await createTemplateUnitResolver({
    tenantId: input.tenantId,
    tournamentId: input.tournamentId,
    participantsById,
  });

  const createdFixtures = await replaceTemplateFixtures({
    tenantId: input.tenantId,
    tournamentId: input.tournamentId,
    template: plan.template,
    plan,
    fieldKeyToPitchId,
    unitResolver,
  });

  const scheduleVersion = await prisma.tournamentScheduleVersion.findFirstOrThrow({
    where: { id: working.id, tenantId: input.tenantId },
    select: {
      matchDurationMinutes: true,
      transitionMinutes: true,
    },
  });
  const matchDurationMinutes = scheduleVersion.matchDurationMinutes ?? 12;
  const transitionMinutes = scheduleVersion.transitionMinutes ?? 3;

  await ensureTemplateBreaks(
    input.tenantId,
    input.tournamentId,
    plan.template,
    event.startAt,
    matchDurationMinutes,
    transitionMinutes,
    10,
  );

  const fixturesForSchedule = createdFixtures.map((created, index) => {
    const row = plan.fixtures[index]!;
    return {
      ...row,
      fixtureId: created.id,
      tournamentPitchId: fieldKeyToPitchId.get(row.fieldKey)!,
    };
  });

  const assignments = buildTemplateScheduleAssignments({
    tournamentStartUtcMs: event.startAt.getTime(),
    matchDurationMinutes,
    transitionMinutes,
    breakAfterRoundNumbers: plan.template.breakHints.map((b) => b.afterRoundNumber),
    breakDurationMinutes: 10,
    fixtures: fixturesForSchedule,
  });

  const optimisation: TournamentScheduleOptimisationResult = {
    status: "OPTIMAL",
    participantRestProofStatus: "UNRESOLVED",
    assignments: assignments.map((a) => ({
      fixtureId: a.fixtureId,
      tournamentPitchId: a.tournamentPitchId,
      startUtcMs: a.startUtcMs,
      endUtcMs: a.resourceEndUtcMs,
      resourceEndUtcMs: a.resourceEndUtcMs,
    })),
    hardConstraintValidationOk: true,
    objectiveMetrics: null,
    objectiveScore: null,
    feasibilityMetrics: null,
    diagnostics: [],
    baselineObjectiveMetrics: null,
    changeMetrics: null,
    searchStats: {
      candidateSlotCount: assignments.length,
      completeAssignmentsExplored: 1,
      nodesVisited: 1,
    },
    optimalityNote: "Predefined programme template (02D) — deterministic round schedule.",
  };

  const synced = await syncOptimisedAssignmentsToVersion({
    tenantId: input.tenantId,
    scheduleVersionId: working.id,
    optimisation,
    expectedRevision: working.revision,
    removeAssignmentsNotInResult: true,
  });

  await prisma.tournamentCompetitionConfiguration.upsert({
    where: { eventId: input.tournamentId },
    create: {
      tenantId: input.tenantId,
      eventId: input.tournamentId,
      competitionFormat: "GROUP_MIX_ONLY",
      programmeTemplateId: plan.template.id,
      programmeTemplateVersion: plan.template.version,
      programmeTemplateSlotMappingJson: plan.slotMapping,
    },
    update: {
      programmeTemplateId: plan.template.id,
      programmeTemplateVersion: plan.template.version,
      programmeTemplateSlotMappingJson: plan.slotMapping,
    },
  });

  return {
    template: plan.template,
    scheduleVersionId: working.id,
    revision: synced.revision,
    fixtureCount: createdFixtures.length,
  };
}
