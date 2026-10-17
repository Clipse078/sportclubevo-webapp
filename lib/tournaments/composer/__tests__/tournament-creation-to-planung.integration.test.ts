import { describe, expect, it, vi, beforeEach } from "vitest";
import { persistTournamentPlannerFromComposer } from "../persist-tournament-planner-from-composer";
import { createEmptyTournamentComposerDraft } from "../tournament-composer-draft-types";
import { createDefaultTournamentComposerPlannerDraft } from "../tournament-composer-planner-defaults";

vi.mock("@/lib/tournament-scheduling/competition-structure/competition-structure-service", () => ({
  upsertTournamentCompetitionConfiguration: vi.fn(),
  listTournamentPhases: vi.fn().mockResolvedValue([
    { id: "phase-g", phaseType: "GROUP_MIX", stageKey: "MAIN" },
  ]),
  updateTournamentPhaseGroupMixStrategy: vi.fn(),
}));

vi.mock("@/lib/tournament-scheduling/fixture-generation-service", () => ({
  generateTournamentFixturesForEvent: vi.fn().mockResolvedValue([{ id: "f1" }]),
}));

vi.mock("@/lib/tournament-scheduling/tournament-pitch-service", () => ({
  createTournamentPitch: vi.fn().mockResolvedValue({ id: "pitch-1" }),
}));

vi.mock("@/lib/tournament-scheduling/tournament-break-service", () => ({
  createTournamentBreak: vi.fn(),
}));

vi.mock("@/lib/tournament-scheduling/schedule-version-service", () => ({
  createWorkingTournamentScheduleVersion: vi.fn().mockResolvedValue({ id: "sv-1" }),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenant: { findUnique: vi.fn().mockResolvedValue({ timezone: "Europe/Zurich" }) },
    tournamentCompetitionConfiguration: { update: vi.fn() },
    tournamentRankingConfiguration: { upsert: vi.fn() },
    tournamentParticipant: {
      findMany: vi.fn().mockResolvedValue([{ id: "p1" }, { id: "p2" }]),
    },
  },
}));

describe("CREATION_TO_PLANUNG_INTEGRATION_TEST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists competition, fixtures, pitches, timing version for HOME composer payload", async () => {
    const payload = createEmptyTournamentComposerDraft();
    payload.homeAway = "HOME";
    payload.startAt = "2026-06-01T09:00";
    payload.planner = createDefaultTournamentComposerPlannerDraft();

    await persistTournamentPlannerFromComposer({
      tenantId: "tenant-1",
      tournamentId: "event-1",
      payload,
      planner: payload.planner!,
    });

    const { createWorkingTournamentScheduleVersion } = await import(
      "@/lib/tournament-scheduling/schedule-version-service"
    );
    const { createTournamentPitch } = await import("@/lib/tournament-scheduling/tournament-pitch-service");
    const { generateTournamentFixturesForEvent } = await import(
      "@/lib/tournament-scheduling/fixture-generation-service"
    );

    expect(generateTournamentFixturesForEvent).toHaveBeenCalled();
    expect(createTournamentPitch).toHaveBeenCalled();
    expect(createWorkingTournamentScheduleVersion).toHaveBeenCalledWith(
      "tenant-1",
      "event-1",
      expect.objectContaining({ matchDurationMinutes: expect.any(Number) }),
    );
  });
});
