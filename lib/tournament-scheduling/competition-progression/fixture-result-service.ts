/**
 * SCE-TOURNAMENT-PLANNER-01J — fixture result mutation + progression orchestration.
 */

import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import { canTenantPlanTournament } from "../planner-eligibility";
import { TournamentPlannerNotOwnedError } from "../partial-regeneration-service";
import {
  TournamentFixtureNotFoundError,
  TournamentSchedulingError,
} from "../errors";
import {
  resolveConcreteSideParticipantIds,
  validateAndResolveFixtureResult,
  TournamentFixtureResultValidationError,
} from "./fixture-result-pure";
import {
  buildGroupResultsMap,
  computeQualificationSideResolutions,
  type CompletedFixtureOutcome,
  type ProgressionFixtureRow,
} from "./qualification-resolution-pure";
import { calculateProgressionImpact } from "./progression-impact-pure";

export class TournamentFixtureResultStaleError extends TournamentSchedulingError {
  constructor(fixtureId: string) {
    super(
      "TOURNAMENT_FIXTURE_RESULT_STALE",
      `Fixture result was updated elsewhere. Refresh and try again (${fixtureId}).`,
    );
    this.name = "TournamentFixtureResultStaleError";
  }
}

export class TournamentFixtureResultProgressionBlockedError extends TournamentSchedulingError {
  readonly completedDownstreamFixtureIds: readonly string[];

  constructor(message: string, completedDownstreamFixtureIds: readonly string[]) {
    super("TOURNAMENT_FIXTURE_RESULT_PROGRESSION_BLOCKED", message);
    this.name = "TournamentFixtureResultProgressionBlockedError";
    this.completedDownstreamFixtureIds = completedDownstreamFixtureIds;
  }
}

export class TournamentFixtureResultInvalidError extends TournamentSchedulingError {
  constructor(message: string) {
    super("TOURNAMENT_FIXTURE_RESULT_INVALID", message);
    this.name = "TournamentFixtureResultInvalidError";
  }
}

async function assertPlannerOwnership(tenantId: string, tournamentId: string): Promise<void> {
  const event = await prisma.event.findFirst({
    where: { id: tournamentId, tenantId, type: "TOURNAMENT" },
    select: { id: true, homeAway: true, organizerName: true, tenant: { select: { name: true } } },
  });
  if (!event) {
    throw new TournamentSchedulingError(
      "TOURNAMENT_SCHEDULE_NOT_FOUND",
      `Tournament not found: ${tournamentId}`,
    );
  }
  if (
    !canTenantPlanTournament({
      homeAway: event.homeAway,
      organizerName: event.organizerName,
      tenantName: event.tenant?.name ?? null,
    })
  ) {
    throw new TournamentPlannerNotOwnedError(tournamentId);
  }
}

type LoadedProgressionContext = {
  fixtures: ProgressionFixtureRow[];
  qualificationSourceTypeById: Map<string, "GROUP_RANK" | "WINNER_OF_FIXTURE" | "LOSER_OF_FIXTURE">;
  qualificationSourceFixtureIdById: Map<string, string | null>;
  qualificationSourceGroupIdById: Map<string, string | null>;
  qualificationSourcesById: Map<
    string,
    {
      id: string;
      sourceType: "GROUP_RANK" | "WINNER_OF_FIXTURE" | "LOSER_OF_FIXTURE";
      sourceGroupId: string | null;
      rank: number | null;
      sourceFixtureId: string | null;
    }
  >;
  groupMemberships: { tournamentGroupId: string; participantIds: string[] }[];
  rankingConfiguration: {
    winPoints: number;
    drawPoints: number;
    lossPoints: number;
    tiebreakOrder: readonly ("POINTS" | "GOAL_DIFFERENCE" | "GOALS_SCORED" | "HEAD_TO_HEAD")[];
  };
  outcomesByFixtureId: Map<string, CompletedFixtureOutcome>;
  resultRevisionByFixtureId: Map<string, number>;
};

async function loadProgressionContext(
  tenantId: string,
  tournamentId: string,
): Promise<LoadedProgressionContext> {
  const [fixturesRaw, memberships, rankingConfig, results, qualSources] = await Promise.all([
    prisma.tournamentFixture.findMany({
      where: { tenantId, eventId: tournamentId },
      include: {
        phase: { select: { phaseType: true } },
        sides: { orderBy: { side: "asc" } },
      },
    }),
    prisma.tournamentGroupMembership.findMany({
      where: { tenantId, eventId: tournamentId },
      select: { tournamentGroupId: true, tournamentParticipantId: true },
    }),
    prisma.tournamentRankingConfiguration.findUnique({
      where: { eventId: tournamentId },
    }),
    prisma.tournamentFixtureResult.findMany({
      where: { tenantId, fixture: { eventId: tournamentId } },
    }),
    prisma.tournamentQualificationSource.findMany({
      where: { tenantId, eventId: tournamentId },
    }),
  ]);

  const groupMembershipsMap = new Map<string, string[]>();
  for (const row of memberships) {
    const list = groupMembershipsMap.get(row.tournamentGroupId) ?? [];
    list.push(row.tournamentParticipantId);
    groupMembershipsMap.set(row.tournamentGroupId, list);
  }

  const qualificationSourcesById = new Map(qualSources.map((q) => [q.id, q]));
  const qualificationSourceTypeById = new Map(
    qualSources.map((q) => [q.id, q.sourceType]),
  );
  const qualificationSourceFixtureIdById = new Map(
    qualSources.map((q) => [q.id, q.sourceFixtureId]),
  );
  const qualificationSourceGroupIdById = new Map(
    qualSources.map((q) => [q.id, q.sourceGroupId]),
  );

  const fixtures: ProgressionFixtureRow[] = fixturesRaw.map((f) => ({
    fixtureId: f.id,
    tournamentGroupId: f.tournamentGroupId,
    phaseType: f.phase?.phaseType ?? null,
    sideAParticipantId: f.sideAParticipantId,
    sideBParticipantId: f.sideBParticipantId,
    sides: f.sides.map((s) => ({
      fixtureId: f.id,
      side: s.side,
      sourceType: s.sourceType,
      participantId: s.participantId,
      qualificationSourceId: s.qualificationSourceId,
    })),
  }));

  const outcomesByFixtureId = new Map<string, CompletedFixtureOutcome>();
  const resultRevisionByFixtureId = new Map<string, number>();

  const fixtureById = new Map(fixturesRaw.map((f) => [f.id, f]));

  for (const result of results) {
    resultRevisionByFixtureId.set(result.fixtureId, result.revision);
    if (result.state !== "COMPLETED") continue;
    const fixture = fixtureById.get(result.fixtureId);
    if (!fixture) continue;
    const sides = resolveConcreteSideParticipantIds({
      sideAParticipantId: fixture.sideAParticipantId,
      sideBParticipantId: fixture.sideBParticipantId,
      sides: fixture.sides,
    });
    if (!sides.sideA || !sides.sideB) continue;
    if (result.scoreSideA == null || result.scoreSideB == null) continue;
    outcomesByFixtureId.set(result.fixtureId, {
      fixtureId: result.fixtureId,
      state: "COMPLETED",
      sideAParticipantId: sides.sideA,
      sideBParticipantId: sides.sideB,
      scoreSideA: result.scoreSideA,
      scoreSideB: result.scoreSideB,
      winnerParticipantId: result.winnerParticipantId,
    });
  }

  const defaultTiebreak = [
    "POINTS",
    "GOAL_DIFFERENCE",
    "GOALS_SCORED",
    "HEAD_TO_HEAD",
  ] as const;
  const rankingConfiguration = {
    winPoints: rankingConfig?.winPoints ?? 3,
    drawPoints: rankingConfig?.drawPoints ?? 1,
    lossPoints: rankingConfig?.lossPoints ?? 0,
    tiebreakOrder: rankingConfig?.tiebreakOrder ?? defaultTiebreak,
  };

  return {
    fixtures,
    qualificationSourceTypeById,
    qualificationSourceFixtureIdById,
    qualificationSourceGroupIdById,
    qualificationSourcesById,
    groupMemberships: [...groupMembershipsMap.entries()].map(([tournamentGroupId, participantIds]) => ({
      tournamentGroupId,
      participantIds,
    })),
    rankingConfiguration,
    outcomesByFixtureId,
    resultRevisionByFixtureId,
  };
}

function requiresExplicitWinner(phaseType: "GROUP_MIX" | "KNOCKOUT" | null): boolean {
  return phaseType === "KNOCKOUT";
}

async function applySideResolutionUpdates(
  tx: Prisma.TransactionClient,
  tenantId: string,
  updates: ReturnType<typeof computeQualificationSideResolutions>,
): Promise<void> {
  for (const update of updates) {
    await tx.tournamentFixtureSide.updateMany({
      where: { tenantId, fixtureId: update.fixtureId, side: update.side },
      data: { participantId: update.participantId },
    });
    const fixture = await tx.tournamentFixture.findFirst({
      where: { id: update.fixtureId, tenantId },
      select: { id: true },
    });
    if (!fixture) continue;
    const sides = await tx.tournamentFixtureSide.findMany({
      where: { fixtureId: update.fixtureId },
      select: { side: true, participantId: true, sourceType: true },
    });
    const sideA = sides.find((s) => s.side === "A");
    const sideB = sides.find((s) => s.side === "B");
    const sideAParticipantId =
      sideA?.sourceType === "CONCRETE_PARTICIPANT"
        ? sideA.participantId
        : sideA?.participantId ?? null;
    const sideBParticipantId =
      sideB?.sourceType === "CONCRETE_PARTICIPANT"
        ? sideB.participantId
        : sideB?.participantId ?? null;
    await tx.tournamentFixture.update({
      where: { id: update.fixtureId },
      data: { sideAParticipantId, sideBParticipantId },
    });
  }
}

function recomputeProgression(context: LoadedProgressionContext): {
  sideUpdates: ReturnType<typeof computeQualificationSideResolutions>;
  outcomes: Map<string, CompletedFixtureOutcome>;
} {
  const groupResults = buildGroupResultsMap(context.fixtures, context.outcomesByFixtureId);
  const sideUpdates = computeQualificationSideResolutions({
    fixtures: context.fixtures,
    qualificationSourcesById: context.qualificationSourcesById,
    groupMemberships: context.groupMemberships,
    groupResults,
    rankingConfiguration: context.rankingConfiguration,
    outcomesByFixtureId: context.outcomesByFixtureId,
  });
  return { sideUpdates, outcomes: context.outcomesByFixtureId };
}

export type RecordTournamentFixtureResultInput = {
  tenantId: string;
  tournamentId: string;
  fixtureId: string;
  expectedRevision: number | null;
  scoreSideA: number;
  scoreSideB: number;
  explicitWinnerParticipantId?: string | null;
  actorUserId: string | null;
};

export async function recordTournamentFixtureResult(
  input: RecordTournamentFixtureResultInput,
): Promise<{ fixtureId: string; revision: number }> {
  await assertPlannerOwnership(input.tenantId, input.tournamentId);

  const fixture = await prisma.tournamentFixture.findFirst({
    where: { id: input.fixtureId, tenantId: input.tenantId, eventId: input.tournamentId },
    include: { phase: { select: { phaseType: true } }, sides: true },
  });
  if (!fixture) {
    throw new TournamentFixtureNotFoundError(input.fixtureId);
  }

  const sides = resolveConcreteSideParticipantIds({
    sideAParticipantId: fixture.sideAParticipantId,
    sideBParticipantId: fixture.sideBParticipantId,
    sides: fixture.sides,
  });

  let validated;
  try {
    validated = validateAndResolveFixtureResult({
      sideAParticipantId: sides.sideA,
      sideBParticipantId: sides.sideB,
      scoreSideA: input.scoreSideA,
      scoreSideB: input.scoreSideB,
      requiresExplicitWinner: requiresExplicitWinner(fixture.phase?.phaseType ?? null),
      explicitWinnerParticipantId: input.explicitWinnerParticipantId,
    });
  } catch (err) {
    if (err instanceof TournamentFixtureResultValidationError) {
      throw new TournamentFixtureResultInvalidError(err.message);
    }
    throw err;
  }

  const existing = await prisma.tournamentFixtureResult.findUnique({
    where: { fixtureId: input.fixtureId },
  });
  if (existing && input.expectedRevision != null && existing.revision !== input.expectedRevision) {
    throw new TournamentFixtureResultStaleError(input.fixtureId);
  }

  const context = await loadProgressionContext(input.tenantId, input.tournamentId);

  const completedIds = new Set(
    [...context.outcomesByFixtureId.keys()].filter((id) => id !== input.fixtureId),
  );
  const impact = calculateProgressionImpact({
    mutatedFixtureId: input.fixtureId,
    fixtures: context.fixtures,
    qualificationSourceTypeById: context.qualificationSourceTypeById,
    qualificationSourceFixtureIdById: context.qualificationSourceFixtureIdById,
    qualificationSourceGroupIdById: context.qualificationSourceGroupIdById,
    completedFixtureIds: completedIds,
    mutatedFixtureGroupId: fixture.tournamentGroupId,
  });

  const previousSnapshot = existing
    ? {
        scoreSideA: existing.scoreSideA,
        scoreSideB: existing.scoreSideB,
        winnerParticipantId: existing.winnerParticipantId,
        state: existing.state,
      }
    : null;

  if (
    existing &&
    existing.state === "COMPLETED" &&
    impact.blocked &&
    (existing.scoreSideA !== validated.scoreSideA ||
      existing.scoreSideB !== validated.scoreSideB ||
      existing.winnerParticipantId !== validated.winnerParticipantId)
  ) {
    throw new TournamentFixtureResultProgressionBlockedError(
      impact.message ?? "Progression blocked.",
      impact.completedDownstreamFixtureIds,
    );
  }

  const nextRevision = (existing?.revision ?? 0) + 1;

  await prisma.$transaction(async (tx) => {
    await tx.tournamentFixtureResult.upsert({
      where: { fixtureId: input.fixtureId },
      create: {
        tenantId: input.tenantId,
        fixtureId: input.fixtureId,
        state: validated.state,
        scoreSideA: validated.scoreSideA,
        scoreSideB: validated.scoreSideB,
        winnerParticipantId: validated.winnerParticipantId,
        revision: nextRevision,
        lastModifiedByUserId: input.actorUserId,
        previousResultSnapshotJson: previousSnapshot ?? undefined,
      },
      update: {
        state: validated.state,
        scoreSideA: validated.scoreSideA,
        scoreSideB: validated.scoreSideB,
        winnerParticipantId: validated.winnerParticipantId,
        revision: nextRevision,
        lastModifiedByUserId: input.actorUserId,
        previousResultSnapshotJson: previousSnapshot ?? undefined,
      },
    });

    context.outcomesByFixtureId.set(input.fixtureId, {
      fixtureId: input.fixtureId,
      state: "COMPLETED",
      sideAParticipantId: sides.sideA!,
      sideBParticipantId: sides.sideB!,
      scoreSideA: validated.scoreSideA,
      scoreSideB: validated.scoreSideB,
      winnerParticipantId: validated.winnerParticipantId,
    });

    const { sideUpdates } = recomputeProgression(context);
    await applySideResolutionUpdates(tx, input.tenantId, sideUpdates);
  });

  return { fixtureId: input.fixtureId, revision: nextRevision };
}

export async function clearTournamentFixtureResult(input: {
  tenantId: string;
  tournamentId: string;
  fixtureId: string;
  expectedRevision: number;
  actorUserId: string | null;
}): Promise<{ fixtureId: string; revision: number }> {
  await assertPlannerOwnership(input.tenantId, input.tournamentId);

  const existing = await prisma.tournamentFixtureResult.findUnique({
    where: { fixtureId: input.fixtureId },
  });
  if (!existing) {
    throw new TournamentFixtureResultInvalidError("No result to clear.");
  }
  if (existing.revision !== input.expectedRevision) {
    throw new TournamentFixtureResultStaleError(input.fixtureId);
  }

  const fixture = await prisma.tournamentFixture.findFirst({
    where: { id: input.fixtureId, tenantId: input.tenantId, eventId: input.tournamentId },
    select: { tournamentGroupId: true },
  });
  if (!fixture) {
    throw new TournamentFixtureNotFoundError(input.fixtureId);
  }

  const context = await loadProgressionContext(input.tenantId, input.tournamentId);
  const completedIds = new Set(context.outcomesByFixtureId.keys());
  const impact = calculateProgressionImpact({
    mutatedFixtureId: input.fixtureId,
    fixtures: context.fixtures,
    qualificationSourceTypeById: context.qualificationSourceTypeById,
    qualificationSourceFixtureIdById: context.qualificationSourceFixtureIdById,
    qualificationSourceGroupIdById: context.qualificationSourceGroupIdById,
    completedFixtureIds: completedIds,
    mutatedFixtureGroupId: fixture.tournamentGroupId,
  });

  if (impact.blocked) {
    throw new TournamentFixtureResultProgressionBlockedError(
      impact.message ?? "Progression blocked.",
      impact.completedDownstreamFixtureIds,
    );
  }

  const previousSnapshot = {
    scoreSideA: existing.scoreSideA,
    scoreSideB: existing.scoreSideB,
    winnerParticipantId: existing.winnerParticipantId,
    state: existing.state,
  };

  const nextRevision = existing.revision + 1;

  await prisma.$transaction(async (tx) => {
    await tx.tournamentFixtureResult.update({
      where: { fixtureId: input.fixtureId },
      data: {
        state: "UNPLAYED",
        scoreSideA: null,
        scoreSideB: null,
        winnerParticipantId: null,
        revision: nextRevision,
        lastModifiedByUserId: input.actorUserId,
        previousResultSnapshotJson: previousSnapshot,
      },
    });

    context.outcomesByFixtureId.delete(input.fixtureId);
    const { sideUpdates } = recomputeProgression(context);
    await applySideResolutionUpdates(tx, input.tenantId, sideUpdates);
  });

  return { fixtureId: input.fixtureId, revision: nextRevision };
}
