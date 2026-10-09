/**
 * SCE-COLLAB-01B-R1 — tournament audience (SCE participants only, deduped union).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  participantFindMany: vi.fn(),
  teamFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tournamentParticipant: { findMany: mocks.participantFindMany },
    team: { findMany: mocks.teamFindMany },
  },
}));

import { resolveTournamentAudienceContext } from "@/lib/collaboration/tournament/resolve-tournament-audience";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveTournamentAudienceContext", () => {
  it("single SCE team from Event.teamId", async () => {
    mocks.participantFindMany.mockResolvedValue([]);
    mocks.teamFindMany.mockResolvedValue([{ id: "team-1", name: "Junioren F2" }]);
    const result = await resolveTournamentAudienceContext({
      tenantId: "tenant-1",
      tournamentId: "tour-1",
      eventTeamId: "team-1",
    });
    expect(result?.teamIds).toEqual(["team-1"]);
    expect(result?.primaryTeamId).toBe("team-1");
  });

  it("union of event team and participant teams with dedupe", async () => {
    mocks.participantFindMany.mockResolvedValue([
      { teamId: "team-1", team: { id: "team-1", name: "Junioren F2" } },
      { teamId: "team-2", team: { id: "team-2", name: "Junioren F3" } },
      { teamId: "team-1", team: { id: "team-1", name: "Junioren F2" } },
    ]);
    mocks.teamFindMany.mockResolvedValue([
      { id: "team-1", name: "Junioren F2" },
      { id: "team-2", name: "Junioren F3" },
    ]);
    const result = await resolveTournamentAudienceContext({
      tenantId: "tenant-1",
      tournamentId: "tour-1",
      eventTeamId: "team-1",
    });
    expect(result?.teamIds).toEqual(["team-1", "team-2"]);
    expect(result?.teamNamesLabel).toContain(",");
  });

  it("R5-04 internal F2+F3 with external null teamId → union of SCE teams only", async () => {
    mocks.participantFindMany.mockResolvedValue([
      { teamId: "team-f2", team: { id: "team-f2", name: "Junioren F2" } },
      { teamId: "team-f3", team: { id: "team-f3", name: "Junioren F3" } },
      { teamId: null, team: null },
    ]);
    mocks.teamFindMany.mockResolvedValue([
      { id: "team-f2", name: "Junioren F2" },
      { id: "team-f3", name: "Junioren F3" },
    ]);
    const result = await resolveTournamentAudienceContext({
      tenantId: "tenant-1",
      tournamentId: "tour-playmore",
      eventTeamId: "team-f3",
    });
    expect(result?.teamIds).toEqual(["team-f2", "team-f3"]);
  });

  it("participants without teamId do not expand audience (external clubs)", async () => {
    mocks.participantFindMany.mockResolvedValue([
      { teamId: null, team: null },
      { teamId: "team-2", team: { id: "team-2", name: "Junioren F3" } },
    ]);
    mocks.teamFindMany.mockResolvedValue([{ id: "team-2", name: "Junioren F3" }]);
    const result = await resolveTournamentAudienceContext({
      tenantId: "tenant-1",
      tournamentId: "tour-1",
      eventTeamId: null,
    });
    expect(result?.teamIds).toEqual(["team-2"]);
  });

  it("returns null when no SCE team ids resolve in tenant", async () => {
    mocks.participantFindMany.mockResolvedValue([]);
    mocks.teamFindMany.mockResolvedValue([]);
    const result = await resolveTournamentAudienceContext({
      tenantId: "tenant-1",
      tournamentId: "tour-1",
      eventTeamId: "missing-team",
    });
    expect(result).toBeNull();
  });

  it("scopes participant query to tenant and tournament", async () => {
    mocks.participantFindMany.mockResolvedValue([]);
    mocks.teamFindMany.mockResolvedValue([{ id: "team-1", name: "T" }]);
    await resolveTournamentAudienceContext({
      tenantId: "tenant-1",
      tournamentId: "tour-99",
      eventTeamId: "team-1",
    });
    expect(mocks.participantFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-1",
          eventId: "tour-99",
        }),
      }),
    );
  });
});
