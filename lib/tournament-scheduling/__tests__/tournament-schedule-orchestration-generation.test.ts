/**
 * Automatic initial schedule generation — infeasible path must not persist assignments.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findFirstOrThrow: vi.fn(), findFirst: vi.fn() },
    tournamentParticipant: { count: vi.fn() },
    tournamentPitch: { count: vi.fn() },
    tournamentFixture: { count: vi.fn() },
    tournamentScheduleVersion: { findFirst: vi.fn() },
  },
}));

vi.mock("../internal/require-tenant-organised-tournament", () => ({
  requireTenantOrganisedTournament: vi.fn(),
}));

vi.mock("../feasibility-service", () => ({
  loadTournamentScheduleOptimisationContext: vi.fn(),
}));

vi.mock("../schedule-engine-load-service", () => ({
  listTournamentScheduleEngineFixtures: vi.fn(),
}));

vi.mock("../assignment-service", () => ({
  listTournamentFixtureAssignmentsForVersion: vi.fn(),
  persistTournamentFixtureAssignment: vi.fn(),
  updateTournamentFixtureAssignment: vi.fn(),
}));

vi.mock("../schedule-version-service", () => ({
  getTournamentScheduleVersion: vi.fn(),
  createWorkingTournamentScheduleVersion: vi.fn(),
}));

vi.mock("../schedule-optimiser/optimise", () => ({
  optimiseTournamentSchedule: vi.fn(),
}));

import { prisma } from "@/lib/db/prisma";
import { optimiseTournamentSchedule } from "../schedule-optimiser/optimise";
import { listTournamentScheduleEngineFixtures } from "../schedule-engine-load-service";
import { loadTournamentScheduleOptimisationContext } from "../feasibility-service";
import { listTournamentFixtureAssignmentsForVersion, persistTournamentFixtureAssignment } from "../assignment-service";
import { getTournamentScheduleVersion } from "../schedule-version-service";
import { runInitialTournamentScheduleGeneration } from "../tournament-schedule-orchestration-service";

const TENANT = "tenant-home";
const TOURNAMENT = "tournament-1";

describe("runInitialTournamentScheduleGeneration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.event.findFirstOrThrow).mockResolvedValue({
      startAt: new Date("2026-08-01T08:00:00.000Z"),
      endAt: new Date("2026-08-01T10:00:00.000Z"),
    } as never);
    vi.mocked(prisma.tournamentParticipant.count).mockResolvedValue(4);
    vi.mocked(prisma.tournamentPitch.count).mockResolvedValue(1);
    vi.mocked(prisma.tournamentFixture.count).mockResolvedValue(2);
    vi.mocked(prisma.tournamentScheduleVersion.findFirst).mockResolvedValue({
      id: "sv-working",
      revision: 3,
    } as never);
    vi.mocked(loadTournamentScheduleOptimisationContext).mockResolvedValue({
      tournamentWindow: { startUtcMs: 0, endUtcMs: 120 * 60_000 },
      schedulingConfig: { matchDurationMinutes: 30, transitionMinutes: 5, minRestMinutes: 10 },
      participants: [{ participantId: "p1" }],
      tournamentPitches: [{ tournamentPitchId: "pitch-1", displayOrder: 0, label: "Feld 1" }],
      breaks: [],
    } as never);
    vi.mocked(listTournamentScheduleEngineFixtures).mockResolvedValue([
      { fixtureId: "f1", stageKey: "MAIN" },
      { fixtureId: "f2", stageKey: "MAIN" },
    ] as never);
    vi.mocked(getTournamentScheduleVersion).mockResolvedValue({
      id: "sv-working",
      revision: 3,
      eventId: TOURNAMENT,
    } as never);
    vi.mocked(listTournamentFixtureAssignmentsForVersion).mockResolvedValue([]);
  });

  it("executes optimiser but skips persistence when proven infeasible", async () => {
    vi.mocked(optimiseTournamentSchedule).mockReturnValue({
      status: "INFEASIBLE_PROVEN",
      assignments: [],
      diagnostics: [{ code: "CAPACITY.PITCH_MINUTES_SHORT" }],
      metrics: {} as never,
    });

    const result = await runInitialTournamentScheduleGeneration({
      tenantId: TENANT,
      tournamentId: TOURNAMENT,
      expectedRevision: 3,
    });

    expect(optimiseTournamentSchedule).toHaveBeenCalled();
    expect(persistTournamentFixtureAssignment).not.toHaveBeenCalled();
    expect(result.optimisation.status).toBe("INFEASIBLE_PROVEN");
    expect(result.revision).toBe(3);
  });

  it("persists assignments when optimisation succeeds", async () => {
    vi.mocked(optimiseTournamentSchedule).mockReturnValue({
      status: "FEASIBLE_NOT_PROVEN_OPTIMAL",
      assignments: [
        {
          fixtureId: "f1",
          tournamentPitchId: "pitch-1",
          startUtcMs: 0,
          resourceEndUtcMs: 30 * 60_000,
        },
      ],
      diagnostics: [],
      metrics: {} as never,
    });
    vi.mocked(persistTournamentFixtureAssignment).mockResolvedValue({
      revision: 4,
    } as never);

    const result = await runInitialTournamentScheduleGeneration({
      tenantId: TENANT,
      tournamentId: TOURNAMENT,
    });

    expect(persistTournamentFixtureAssignment).toHaveBeenCalled();
    expect(result.revision).toBe(4);
  });
});
