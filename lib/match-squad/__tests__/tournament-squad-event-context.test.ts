import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  eventFindFirst: vi.fn(),
  teamSeasonFindFirst: vi.fn(),
  resolveTeamSeasonId: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findFirst: mocks.eventFindFirst },
    teamSeason: { findFirst: mocks.teamSeasonFindFirst },
  },
}));

vi.mock("@/lib/planning/resolve-team-season-id", () => ({
  resolveTeamSeasonIdForTeamAndSeason: mocks.resolveTeamSeasonId,
}));

import { resolveTournamentSquadEventContext } from "../tournament-squad-event-context";
import { MatchSquadNotFoundError, MatchSquadValidationError } from "../errors";

const TENANT = "tenant-a";
const EVENT = "tournament-1";

describe("resolveTournamentSquadEventContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves Hauptteam teamSeason for a tournament event", async () => {
    mocks.eventFindFirst.mockResolvedValue({
      id: EVENT,
      tenantId: TENANT,
      teamId: "team-f3",
      teamSeasonId: "ts-f3",
      seasonId: "season-1",
      status: "SCHEDULED",
      title: "PlayMore Turnier",
      team: { id: "team-f3", name: "Junioren F3" },
    });
    mocks.teamSeasonFindFirst.mockResolvedValue({
      id: "ts-f3",
      status: "ACTIVE",
      displayName: "Junioren F3",
      teamId: "team-f3",
    });

    const ctx = await resolveTournamentSquadEventContext(TENANT, EVENT);
    expect(ctx.teamId).toBe("team-f3");
    expect(ctx.teamSeasonId).toBe("ts-f3");
    expect(mocks.eventFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: "TOURNAMENT" }),
      }),
    );
  });

  it("rejects tournaments without Hauptteam", async () => {
    mocks.eventFindFirst.mockResolvedValue({
      id: EVENT,
      tenantId: TENANT,
      teamId: null,
      teamSeasonId: null,
      seasonId: "season-1",
      status: "SCHEDULED",
      title: "Guest-only",
      team: null,
    });

    await expect(resolveTournamentSquadEventContext(TENANT, EVENT)).rejects.toBeInstanceOf(
      MatchSquadValidationError,
    );
  });

  it("returns not found for missing event", async () => {
    mocks.eventFindFirst.mockResolvedValue(null);
    await expect(resolveTournamentSquadEventContext(TENANT, EVENT)).rejects.toBeInstanceOf(
      MatchSquadNotFoundError,
    );
  });
});
