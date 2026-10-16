import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findFirst: vi.fn(), findFirstOrThrow: vi.fn() },
    tournamentParticipant: { findMany: vi.fn() },
    tournamentScheduleVersion: { findFirst: vi.fn() },
  },
}));

vi.mock("../tournament-pitch-service", () => ({
  listTournamentPitches: vi.fn(),
}));

vi.mock("../tournament-break-service", () => ({
  listTournamentBreaks: vi.fn(),
}));

vi.mock("@/lib/operational/tenant-operational-duration-policy-service", () => ({
  getTenantOperationalDurationPolicy: vi.fn(),
}));

vi.mock("../fixture-service", () => ({
  listTournamentFixtures: vi.fn(),
}));

vi.mock("../schedule-version-service", () => ({
  getTournamentScheduleVersion: vi.fn(),
}));

vi.mock("../internal/require-tournament", () => ({
  requireTournamentEvent: vi.fn(),
}));

import { prisma } from "@/lib/db/prisma";
import { getTenantOperationalDurationPolicy } from "@/lib/operational/tenant-operational-duration-policy-service";
import { requireTournamentEvent } from "../internal/require-tournament";
import { listTournamentFixtures } from "../fixture-service";
import { getTournamentScheduleVersion } from "../schedule-version-service";
import { listTournamentPitches } from "../tournament-pitch-service";
import { listTournamentBreaks } from "../tournament-break-service";
import {
  analyseTournamentFeasibilityForTournament,
  resolveTournamentSchedulingConfig,
} from "../feasibility-service";

const TENANT = "tenant-1";
const TOURNAMENT = "tournament-1";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("resolveTournamentSchedulingConfig", () => {
  it("uses schedule version fields when present", async () => {
    vi.mocked(getTournamentScheduleVersion).mockResolvedValue({
      id: "v1",
      eventId: TOURNAMENT,
      versionNumber: 1,
      status: "WORKING",
      revision: 0,
      matchDurationMinutes: 45,
      transitionMinutes: 10,
      minRestMinutes: 15,
      approvedAt: null,
      supersededAt: null,
    });
    vi.mocked(getTenantOperationalDurationPolicy).mockResolvedValue({
      MATCH: { durationMinutes: 90, isClubConfigured: false },
      TRAINING: { durationMinutes: 90, isClubConfigured: false },
      TOURNAMENT: { durationMinutes: 120, isClubConfigured: false },
    });

    const resolved = await resolveTournamentSchedulingConfig(TENANT, "v1");
    expect(resolved.matchDurationMinutes).toBe(45);
    expect(resolved.transitionMinutes).toBe(10);
    expect(resolved.minRestMinutes).toBe(15);
    expect(resolved.matchDurationSource).toBe("SCHEDULE_VERSION");
  });
});

describe("analyseTournamentFeasibilityForTournament", () => {
  it("returns pure engine result without persisting schedules", async () => {
    const start = new Date("2026-07-01T08:00:00.000Z");
    const end = new Date("2026-07-01T18:00:00.000Z");
    vi.mocked(requireTournamentEvent).mockResolvedValue({
      id: TOURNAMENT,
      tenantId: TENANT,
      type: "TOURNAMENT",
      startAt: start,
      endAt: end,
    } as never);
    vi.mocked(prisma.event.findFirstOrThrow).mockResolvedValue({
      startAt: start,
      endAt: end,
    } as never);
    vi.mocked(listTournamentFixtures).mockResolvedValue([
      {
        id: "fx1",
        eventId: TOURNAMENT,
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        generatorKey: null,
        sideAParticipantId: "p1",
        sideBParticipantId: "p2",
      },
    ]);
    vi.mocked(prisma.tournamentParticipant.findMany).mockResolvedValue([
      { id: "p1" },
      { id: "p2" },
    ] as never);
    vi.mocked(getTenantOperationalDurationPolicy).mockResolvedValue({
      MATCH: { durationMinutes: 90, isClubConfigured: false },
      TRAINING: { durationMinutes: 90, isClubConfigured: false },
      TOURNAMENT: { durationMinutes: 60, isClubConfigured: false },
    });
    vi.mocked(listTournamentPitches).mockResolvedValue([
      { id: "tp1", eventId: TOURNAMENT, displayOrder: 0, label: "Feld 1" },
      { id: "tp2", eventId: TOURNAMENT, displayOrder: 1, label: "Feld 2" },
    ]);
    vi.mocked(listTournamentBreaks).mockResolvedValue([]);

    const result = await analyseTournamentFeasibilityForTournament({
      tenantId: TENANT,
      tournamentId: TOURNAMENT,
    });

    expect(result.feasibility.status).not.toBe("INFEASIBLE");
    expect(result.schedulingConfig.matchDurationSource).toBe("TENANT_DEFAULT");
  });
});
