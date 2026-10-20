/**
 * SCE-TOURNAMENT-PLANNER-02D-R1 — applyProgrammeTemplateToTournament persistence/idempotency/locks.
 * Requires disposable local TEST_DATABASE_URL (see lib/test/safe-test-database.ts).
 */

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import {
  assertSafeTestDatabase,
  canRunDbMutatingIntegrationTests,
} from "@/lib/test/safe-test-database";
import { E_FF12_ROTATION_4_TEMPLATE } from "../catalogue/e-ff12-rotation";
import { E_FF12_ROTATION_5_TEMPLATE } from "../catalogue/e-ff12-rotation";
import { instantiateProgrammeTemplate } from "../instantiate-programme-template";
import {
  applyProgrammeTemplateToTournament,
  ProgrammeTemplateApplyError,
} from "../programme-template-service";
import { setTournamentFixtureAssignmentScheduleLock } from "../../assignment-service";
import { listTournamentFixtureAssignmentsForVersion } from "../../assignment-service";

const canRun = canRunDbMutatingIntegrationTests();
const TEMPLATE_ID = E_FF12_ROTATION_4_TEMPLATE.id;
const PARTICIPANT_COUNT = 4;

type FixtureBundle = {
  tenantId: string;
  tournamentId: string;
  participantIds: string[];
};

const createdTenantIds: string[] = [];

async function createOrganisedTournamentFixture(
  participantCount: number,
): Promise<FixtureBundle> {
  const suffix = randomUUID().slice(0, 8);
  const tenantName = `TP02D Test Club ${suffix}`;
  const tenant = await prisma.tenant.create({
    data: {
      key: `tp02d-${suffix}`,
      name: tenantName,
    },
  });
  createdTenantIds.push(tenant.id);

  const startAt = new Date("2026-07-01T08:00:00.000Z");
  const endAt = new Date("2026-07-01T14:00:00.000Z");

  const event = await prisma.event.create({
    data: {
      tenantId: tenant.id,
      type: "TOURNAMENT",
      source: "MANUAL",
      title: `TP02D programme template ${suffix}`,
      startAt,
      endAt,
      homeAway: "HOME",
      organizerName: tenantName,
    },
    select: { id: true },
  });

  const participantIds: string[] = [];
  for (let i = 0; i < participantCount; i += 1) {
    const row = await prisma.tournamentParticipant.create({
      data: {
        tenantId: tenant.id,
        eventId: event.id,
        displayOrder: i,
        manualLabel: `Team ${String.fromCharCode(65 + i)}`,
      },
      select: { id: true },
    });
    participantIds.push(row.id);
  }

  return { tenantId: tenant.id, tournamentId: event.id, participantIds };
}

async function deleteTenantCascade(tenantId: string): Promise<void> {
  await prisma.tenant.delete({ where: { id: tenantId } });
}

async function loadParticipantRows(tenantId: string, tournamentId: string) {
  return prisma.tournamentParticipant.findMany({
    where: { tenantId, eventId: tournamentId },
    select: { id: true, displayOrder: true, displayName: true, eventId: true },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
  });
}

function expectedPlan(participantRows: Awaited<ReturnType<typeof loadParticipantRows>>) {
  return instantiateProgrammeTemplate({
    templateId: TEMPLATE_ID,
    participants: participantRows,
  });
}

async function snapshotSchedule(tenantId: string, tournamentId: string, scheduleVersionId: string) {
  const [fixtures, assignments, config, pitches] = await Promise.all([
    prisma.tournamentFixture.findMany({
      where: { tenantId, eventId: tournamentId },
      select: {
        id: true,
        roundIndex: true,
        slotIndexInRound: true,
        sideAParticipantId: true,
        sideBParticipantId: true,
      },
      orderBy: [{ roundIndex: "asc" }, { slotIndexInRound: "asc" }, { id: "asc" }],
    }),
    listTournamentFixtureAssignmentsForVersion(tenantId, scheduleVersionId),
    prisma.tournamentCompetitionConfiguration.findUnique({
      where: { eventId: tournamentId },
      select: {
        programmeTemplateId: true,
        programmeTemplateVersion: true,
        programmeTemplateSlotMappingJson: true,
      },
    }),
    prisma.tournamentPitch.findMany({
      where: { tenantId, eventId: tournamentId },
      orderBy: { displayOrder: "asc" },
      select: { id: true, label: true, displayOrder: true, playersPerSide: true },
    }),
  ]);
  return { fixtures, assignments, config, pitches };
}

describe.skipIf(!canRun)(
  "SCE-TOURNAMENT-PLANNER-02D-R1 — programme template persistence",
  () => {
    beforeAll(() => {
      assertSafeTestDatabase();
    });

    afterEach(async () => {
      while (createdTenantIds.length > 0) {
        const tenantId = createdTenantIds.pop()!;
        await deleteTenantCascade(tenantId).catch(() => undefined);
      }
    });

    it("A — initial application creates canonical programme without duplicate fixtures", async () => {
      const fx = await createOrganisedTournamentFixture(PARTICIPANT_COUNT);
      const participants = await loadParticipantRows(fx.tenantId, fx.tournamentId);
      const plan = expectedPlan(participants);

      const result = await applyProgrammeTemplateToTournament({
        tenantId: fx.tenantId,
        tournamentId: fx.tournamentId,
        templateId: TEMPLATE_ID,
      });

      expect(result.fixtureCount).toBe(plan.fixtures.length);
      expect(result.template.id).toBe(TEMPLATE_ID);

      const snap = await snapshotSchedule(fx.tenantId, fx.tournamentId, result.scheduleVersionId);
      expect(snap.fixtures).toHaveLength(plan.fixtures.length);
      expect(snap.assignments).toHaveLength(plan.fixtures.length);
      expect(snap.pitches).toHaveLength(E_FF12_ROTATION_4_TEMPLATE.fields.length);

      const fixtureKeys = snap.fixtures.map(
        (f) => `${f.roundIndex}|${f.slotIndexInRound}|${f.sideAParticipantId}|${f.sideBParticipantId}`,
      );
      expect(new Set(fixtureKeys).size).toBe(fixtureKeys.length);

      expect(snap.config?.programmeTemplateId).toBe(TEMPLATE_ID);
      expect(snap.config?.programmeTemplateVersion).toBe(E_FF12_ROTATION_4_TEMPLATE.version);
      expect(snap.config?.programmeTemplateSlotMappingJson).toEqual(plan.slotMapping);

      const assignmentFixtureIds = new Set(snap.assignments.map((a) => a.fixtureId));
      expect(assignmentFixtureIds.size).toBe(snap.fixtures.length);
      for (const fixture of snap.fixtures) {
        expect(assignmentFixtureIds.has(fixture.id)).toBe(true);
      }
    });

    it("B — reapplication without replaceExisting is rejected and leaves programme unchanged", async () => {
      const fx = await createOrganisedTournamentFixture(PARTICIPANT_COUNT);
      const first = await applyProgrammeTemplateToTournament({
        tenantId: fx.tenantId,
        tournamentId: fx.tournamentId,
        templateId: TEMPLATE_ID,
      });
      const before = await snapshotSchedule(fx.tenantId, fx.tournamentId, first.scheduleVersionId);

      await expect(
        applyProgrammeTemplateToTournament({
          tenantId: fx.tenantId,
          tournamentId: fx.tournamentId,
          templateId: TEMPLATE_ID,
        }),
      ).rejects.toMatchObject({
        code: "PROGRAMME_TEMPLATE.EXISTING_FIXTURES",
      });

      const after = await snapshotSchedule(fx.tenantId, fx.tournamentId, first.scheduleVersionId);
      expect(after.fixtures.map((f) => f.id)).toEqual(before.fixtures.map((f) => f.id));
      expect(after.config).toEqual(before.config);
      expect(after.assignments.map((a) => a.id)).toEqual(before.assignments.map((a) => a.id));
    });

    it("C — explicit replaceExisting replaces unlocked programme deterministically", async () => {
      const fx = await createOrganisedTournamentFixture(PARTICIPANT_COUNT);
      const participants = await loadParticipantRows(fx.tenantId, fx.tournamentId);
      const plan = expectedPlan(participants);

      const first = await applyProgrammeTemplateToTournament({
        tenantId: fx.tenantId,
        tournamentId: fx.tournamentId,
        templateId: TEMPLATE_ID,
      });

      const second = await applyProgrammeTemplateToTournament({
        tenantId: fx.tenantId,
        tournamentId: fx.tournamentId,
        templateId: TEMPLATE_ID,
        replaceExisting: true,
        expectedRevision: first.revision,
      });

      const third = await applyProgrammeTemplateToTournament({
        tenantId: fx.tenantId,
        tournamentId: fx.tournamentId,
        templateId: TEMPLATE_ID,
        replaceExisting: true,
        expectedRevision: second.revision,
      });

      const snap = await snapshotSchedule(fx.tenantId, fx.tournamentId, third.scheduleVersionId);
      expect(snap.fixtures).toHaveLength(plan.fixtures.length);
      expect(snap.assignments).toHaveLength(plan.fixtures.length);
      expect(snap.config?.programmeTemplateSlotMappingJson).toEqual(plan.slotMapping);

      const canonicalKeys = snap.fixtures.map(
        (f) => `${f.roundIndex}|${f.slotIndexInRound}|${f.sideAParticipantId}|${f.sideBParticipantId}`,
      );
      const againPlan = expectedPlan(participants);
      const expectedKeys = againPlan.fixtures.map((row, index) => {
        const sideA =
          row.home.participantId <= row.away.participantId
            ? row.home.participantId
            : row.away.participantId;
        const sideB =
          row.home.participantId <= row.away.participantId
            ? row.away.participantId
            : row.home.participantId;
        void index;
        return `${row.roundIndex}|${row.slotIndexInRound}|${sideA}|${sideB}`;
      });
      expect(canonicalKeys.sort()).toEqual(expectedKeys.sort());
    });

    it("D — participant-slot mapping remains stable across explicit replacement", async () => {
      const fx = await createOrganisedTournamentFixture(PARTICIPANT_COUNT);
      await applyProgrammeTemplateToTournament({
        tenantId: fx.tenantId,
        tournamentId: fx.tournamentId,
        templateId: TEMPLATE_ID,
      });

      const configBefore = await prisma.tournamentCompetitionConfiguration.findUniqueOrThrow({
        where: { eventId: fx.tournamentId },
        select: { programmeTemplateSlotMappingJson: true },
      });

      const replaced = await applyProgrammeTemplateToTournament({
        tenantId: fx.tenantId,
        tournamentId: fx.tournamentId,
        templateId: TEMPLATE_ID,
        replaceExisting: true,
      });

      const configAfter = await prisma.tournamentCompetitionConfiguration.findUniqueOrThrow({
        where: { eventId: fx.tournamentId },
        select: { programmeTemplateSlotMappingJson: true },
      });

      expect(configAfter.programmeTemplateSlotMappingJson).toEqual(
        configBefore.programmeTemplateSlotMappingJson,
      );
      void replaced;
    });

    it("E — sparse E/FF12 round matrices are preserved (5-team round 5)", () => {
      const round5 = E_FF12_ROTATION_5_TEMPLATE.rounds.find((r) => r.roundNumber === 5);
      expect(round5?.assignments).toHaveLength(2);
      expect(E_FF12_ROTATION_5_TEMPLATE.fields).toHaveLength(5);
      const plan = instantiateProgrammeTemplate({
        templateId: E_FF12_ROTATION_5_TEMPLATE.id,
        participants: Array.from({ length: 5 }, (_, i) => ({
          id: `p-${i}`,
          displayOrder: i,
        })),
      });
      const round5Fixtures = plan.fixtures.filter((f) => f.roundIndex === 4);
      expect(round5Fixtures).toHaveLength(2);
    });

    it("locks — replace with predefined template blocked when schedule contains locked assignment", async () => {
      const fx = await createOrganisedTournamentFixture(PARTICIPANT_COUNT);
      const applied = await applyProgrammeTemplateToTournament({
        tenantId: fx.tenantId,
        tournamentId: fx.tournamentId,
        templateId: TEMPLATE_ID,
      });

      const before = await snapshotSchedule(fx.tenantId, fx.tournamentId, applied.scheduleVersionId);
      const targetAssignment = before.assignments[0]!;
      await setTournamentFixtureAssignmentScheduleLock(
        fx.tenantId,
        targetAssignment.id,
        "TIME_AND_PITCH",
        "test-user",
        { expectedRevision: applied.revision },
      );

      const lockedRow = await prisma.tournamentFixtureAssignment.findUniqueOrThrow({
        where: { id: targetAssignment.id },
        select: {
          scheduleLockDimension: true,
          isLocked: true,
          startAt: true,
          tournamentPitchId: true,
        },
      });

      await expect(
        applyProgrammeTemplateToTournament({
          tenantId: fx.tenantId,
          tournamentId: fx.tournamentId,
          templateId: TEMPLATE_ID,
          replaceExisting: true,
        }),
      ).rejects.toBeInstanceOf(ProgrammeTemplateApplyError);

      await expect(
        applyProgrammeTemplateToTournament({
          tenantId: fx.tenantId,
          tournamentId: fx.tournamentId,
          templateId: TEMPLATE_ID,
          replaceExisting: true,
        }),
      ).rejects.toMatchObject({ code: "PROGRAMME_TEMPLATE.LOCKED_SCHEDULE" });

      const after = await snapshotSchedule(fx.tenantId, fx.tournamentId, applied.scheduleVersionId);
      expect(after.fixtures.map((f) => f.id)).toEqual(before.fixtures.map((f) => f.id));
      expect(after.assignments.map((a) => a.id)).toEqual(before.assignments.map((a) => a.id));

      const lockedAfter = await prisma.tournamentFixtureAssignment.findUniqueOrThrow({
        where: { id: targetAssignment.id },
        select: {
          scheduleLockDimension: true,
          isLocked: true,
          startAt: true,
          tournamentPitchId: true,
        },
      });
      expect(lockedAfter).toEqual(lockedRow);

      const orphanFixtures = await prisma.tournamentFixture.count({
        where: { tenantId: fx.tenantId, eventId: fx.tournamentId },
      });
      expect(orphanFixtures).toBe(before.fixtures.length);
    });

    it("locks — unlocked replace succeeds after initial apply", async () => {
      const fx = await createOrganisedTournamentFixture(PARTICIPANT_COUNT);
      const first = await applyProgrammeTemplateToTournament({
        tenantId: fx.tenantId,
        tournamentId: fx.tournamentId,
        templateId: TEMPLATE_ID,
      });

      const second = await applyProgrammeTemplateToTournament({
        tenantId: fx.tenantId,
        tournamentId: fx.tournamentId,
        templateId: TEMPLATE_ID,
        replaceExisting: true,
        expectedRevision: first.revision,
      });

      expect(second.fixtureCount).toBe(first.fixtureCount);
      const lockedCount = await prisma.tournamentFixtureAssignment.count({
        where: {
          tenantId: fx.tenantId,
          scheduleVersionId: second.scheduleVersionId,
          OR: [{ scheduleLockDimension: { not: null } }, { isLocked: true }],
        },
      });
      expect(lockedCount).toBe(0);
    });
  },
);
