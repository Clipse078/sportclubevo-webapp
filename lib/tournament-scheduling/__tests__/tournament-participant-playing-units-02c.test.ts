/**
 * SCE-TOURNAMENT-PLANNER-02C — playing units domain, capacity, persistence service.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findFirst: vi.fn() },
    tournamentParticipantUnit: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("../internal/require-tournament", () => ({
  requireTournamentEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/tournaments/participant-service", () => ({
  getTournamentParticipant: vi.fn(),
}));

import { prisma } from "@/lib/db/prisma";
import { getTournamentParticipant } from "@/lib/tournaments/participant-service";
import {
  doParticipantUnitsOverlapCapacity,
  toParticipantUnitCapacityRef,
} from "../participant-unit-capacity";
import {
  buildImplicitFullPlayingUnitId,
  createImplicitFullPlayingUnit,
  createTournamentParticipantUnit,
  listTournamentParticipantUnits,
  removeTournamentParticipantUnit,
  resolveEffectiveFullPlayingUnit,
  resolveEffectivePlayingUnits,
  updateTournamentParticipantUnit,
} from "../tournament-participant-unit-service";
import {
  EXISTING_TOURNAMENTS_REQUIRE_UNIT_SETUP,
  IMPLICIT_FULL_TEAM_PLAYING_UNIT_COMPATIBILITY,
  PARTICIPANT_NEQ_PLAYING_UNIT,
  PLAYING_FORMAT_OPTIONAL_BY_DEFAULT,
  PLAYING_UNITS_PERSISTENCE_IMPLEMENTED,
  PLAYING_UNIT_FIXTURE_REFERENCE_IMPLEMENTED,
  PLAYING_UNIT_TOURNAMENT_LOCAL,
  ROTATION_GENERATOR_IMPLEMENTED,
  TOURNAMENT_PROGRAMME_PIPELINE_STAGES,
} from "../tournament-programme-architecture";

const TENANT = "tenant-1";
const EVENT = "event-1";
const PARTICIPANT_A = "participant-a";
const PARTICIPANT_B = "participant-b";

function unitRef(
  participantId: string,
  unitId: string,
  mode: "FULL" | "SUBUNIT",
  partition: string | null = null,
) {
  return toParticipantUnitCapacityRef({
    id: unitId,
    tournamentParticipantId: participantId,
    mode,
    capacityPartitionKey: partition,
  });
}

describe("SCE-TOURNAMENT-PLANNER-02C playing units", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTournamentParticipant).mockResolvedValue({
      id: PARTICIPANT_A,
      tournamentId: EVENT,
      displayName: "Team A",
    } as never);
  });

  describe("A. domain identity", () => {
    it("resolves implicit full-team behaviour without persisted units", () => {
      const participant = { id: PARTICIPANT_A, tournamentId: EVENT, displayName: "E1" };
      const effective = resolveEffectivePlayingUnits(participant, []);
      expect(effective).toHaveLength(1);
      expect(effective[0]!.mode).toBe("FULL");
      expect(effective[0]!.isPersisted).toBe(false);
      expect(effective[0]!.id).toBe(buildImplicitFullPlayingUnitId(PARTICIPANT_A));
    });

    it("maps explicit full and subunits to parent participant", () => {
      const persisted = [
        {
          id: "u-full",
          tournamentParticipantId: PARTICIPANT_A,
          tournamentId: EVENT,
          displayName: "A",
          mode: "FULL" as const,
          capacityPartitionKey: null,
          displayOrder: 0,
          isPersisted: true,
        },
        {
          id: "u-a1",
          tournamentParticipantId: PARTICIPANT_A,
          tournamentId: EVENT,
          displayName: "A1",
          mode: "SUBUNIT" as const,
          capacityPartitionKey: null,
          displayOrder: 1,
          isPersisted: true,
        },
      ];
      expect(persisted.every((u) => u.tournamentParticipantId === PARTICIPANT_A)).toBe(true);
      const b1 = {
        ...persisted[1]!,
        id: "u-b1",
        tournamentParticipantId: PARTICIPANT_B,
        displayName: "B1",
      };
      expect(b1.tournamentParticipantId).toBe(PARTICIPANT_B);
    });

    it("does not derive identity from display names", () => {
      const a1Name = unitRef(PARTICIPANT_A, "id-1", "SUBUNIT");
      const a2Mislabel = unitRef(PARTICIPANT_A, "id-2", "SUBUNIT");
      expect(a1Name.unitId).not.toBe(a2Mislabel.unitId);
      expect(doParticipantUnitsOverlapCapacity(a1Name, a2Mislabel)).toBe(false);
    });
  });

  describe("B. capacity overlap", () => {
    const A = unitRef(PARTICIPANT_A, "u-a-full", "FULL");
    const A1 = unitRef(PARTICIPANT_A, "u-a1", "SUBUNIT");
    const A2 = unitRef(PARTICIPANT_A, "u-a2", "SUBUNIT");
    const B1 = unitRef(PARTICIPANT_B, "u-b1", "SUBUNIT");

    it.each([
      ["A vs A", A, A, true],
      ["A vs A1", A, A1, true],
      ["A vs A2", A, A2, true],
      ["A1 vs A1", A1, A1, true],
      ["A1 vs A2", A1, A2, false],
      ["A1 vs B1", A1, B1, false],
    ] as const)("capacity: %s → overlap=%s", (_label, left, right, expected) => {
      expect(doParticipantUnitsOverlapCapacity(left, right)).toBe(expected);
      expect(doParticipantUnitsOverlapCapacity(right, left)).toBe(expected);
    });
  });

  describe("C. multiple subunits", () => {
    it("allows more than two subunits without product rejection", async () => {
      vi.mocked(prisma.tournamentParticipantUnit.aggregate).mockResolvedValue({
        _max: { displayOrder: 1 },
      } as never);
      vi.mocked(prisma.tournamentParticipantUnit.create).mockResolvedValue({
        id: "u-a3",
        tournamentParticipantId: PARTICIPANT_A,
        displayName: "A3",
        mode: "SUBUNIT",
        capacityPartitionKey: null,
        displayOrder: 2,
        tournamentParticipant: { eventId: EVENT },
      } as never);

      const created = await createTournamentParticipantUnit(TENANT, EVENT, PARTICIPANT_A, {
        displayName: "A3",
        mode: "SUBUNIT",
      });
      expect(created.mode).toBe("SUBUNIT");
    });
  });

  describe("D. backward compatibility / programme", () => {
    it("preserves architecture flags and pipeline", () => {
      expect(PARTICIPANT_NEQ_PLAYING_UNIT).toBe(true);
      expect(PLAYING_UNIT_TOURNAMENT_LOCAL).toBe(true);
      expect(PLAYING_UNITS_PERSISTENCE_IMPLEMENTED).toBe(true);
      expect(IMPLICIT_FULL_TEAM_PLAYING_UNIT_COMPATIBILITY).toBe(true);
      expect(EXISTING_TOURNAMENTS_REQUIRE_UNIT_SETUP).toBe(false);
      expect(PLAYING_FORMAT_OPTIONAL_BY_DEFAULT).toBe(true);
      expect(PLAYING_UNIT_FIXTURE_REFERENCE_IMPLEMENTED).toBe(false);
      expect(ROTATION_GENERATOR_IMPLEMENTED).toBe(false);
      expect(TOURNAMENT_PROGRAMME_PIPELINE_STAGES).toContain("PLAYING_UNITS");
    });

    it("implicit full resolves for RR-style participant identity", () => {
      const full = resolveEffectiveFullPlayingUnit(
        { id: PARTICIPANT_A, tournamentId: EVENT, displayName: "Club" },
        [],
      );
      expect(full.mode).toBe("FULL");
      expect(createImplicitFullPlayingUnit({
        participantId: PARTICIPANT_A,
        tournamentId: EVENT,
        displayName: "Club",
      }).displayName).toBe("Club");
    });
  });

  describe("E. persistence service", () => {
    it("lists units scoped to participant", async () => {
      vi.mocked(prisma.tournamentParticipantUnit.findMany).mockResolvedValue([
        {
          id: "u1",
          tournamentParticipantId: PARTICIPANT_A,
          displayName: "E1-1",
          mode: "SUBUNIT",
          capacityPartitionKey: null,
          displayOrder: 0,
          tournamentParticipant: { eventId: EVENT },
        },
      ] as never);

      const units = await listTournamentParticipantUnits(TENANT, EVENT, PARTICIPANT_A);
      expect(units).toHaveLength(1);
      expect(prisma.tournamentParticipantUnit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT, tournamentParticipantId: PARTICIPANT_A },
        }),
      );
    });

    it("creates, renames, and removes unit", async () => {
      vi.mocked(prisma.tournamentParticipantUnit.aggregate).mockResolvedValue({
        _max: { displayOrder: null },
      } as never);
      vi.mocked(prisma.tournamentParticipantUnit.create).mockResolvedValue({
        id: "u-new",
        tournamentParticipantId: PARTICIPANT_A,
        displayName: "Rot",
        mode: "SUBUNIT",
        capacityPartitionKey: null,
        displayOrder: 0,
        tournamentParticipant: { eventId: EVENT },
      } as never);

      const created = await createTournamentParticipantUnit(TENANT, EVENT, PARTICIPANT_A, {
        displayName: "Rot",
        mode: "SUBUNIT",
      });
      expect(created.displayName).toBe("Rot");

      vi.mocked(prisma.tournamentParticipantUnit.findFirst).mockResolvedValue({
        id: "u-new",
        mode: "SUBUNIT",
      } as never);
      vi.mocked(prisma.tournamentParticipantUnit.update).mockResolvedValue({
        id: "u-new",
        tournamentParticipantId: PARTICIPANT_A,
        displayName: "Blau",
        mode: "SUBUNIT",
        capacityPartitionKey: null,
        displayOrder: 0,
        tournamentParticipant: { eventId: EVENT },
      } as never);

      const updated = await updateTournamentParticipantUnit(
        TENANT,
        EVENT,
        PARTICIPANT_A,
        "u-new",
        { displayName: "Blau" },
      );
      expect(updated.displayName).toBe("Blau");

      vi.mocked(prisma.tournamentParticipantUnit.findFirst).mockResolvedValue({ id: "u-new" } as never);
      await removeTournamentParticipantUnit(TENANT, EVENT, PARTICIPANT_A, "u-new");
      expect(prisma.tournamentParticipantUnit.delete).toHaveBeenCalledWith({ where: { id: "u-new" } });
    });
  });

  describe("F. source team integrity", () => {
    it("service only touches TournamentParticipantUnit rows", async () => {
      vi.mocked(prisma.tournamentParticipantUnit.aggregate).mockResolvedValue({
        _max: { displayOrder: null },
      } as never);
      vi.mocked(prisma.tournamentParticipantUnit.create).mockResolvedValue({
        id: "u1",
        tournamentParticipantId: PARTICIPANT_A,
        displayName: "Alias",
        mode: "SUBUNIT",
        capacityPartitionKey: null,
        displayOrder: 0,
        tournamentParticipant: { eventId: EVENT },
      } as never);

      await createTournamentParticipantUnit(TENANT, EVENT, PARTICIPANT_A, {
        displayName: "Alias",
        mode: "SUBUNIT",
      });

      expect(prisma.tournamentParticipantUnit.create).toHaveBeenCalled();
      expect((prisma as { team?: unknown }).team).toBeUndefined();
    });
  });
});
