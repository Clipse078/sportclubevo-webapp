/**
 * SCE-COLLAB-01B-R1 — match audience resolution (SCE team only, mapping fallback).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  matchExternalMappingFindFirst: vi.fn(),
  teamFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    matchExternalMapping: { findFirst: mocks.matchExternalMappingFindFirst },
    team: { findMany: mocks.teamFindMany },
  },
}));

import { resolveMatchAudienceContext } from "@/lib/collaboration/match/resolve-match-audience";
import type { MatchActivitySnapshot } from "@/lib/collaboration/match/match-activity-snapshot";

function snap(overrides: Partial<MatchActivitySnapshot> = {}): MatchActivitySnapshot {
  return {
    matchId: "match-1",
    tenantId: "tenant-1",
    teamId: "team-sce",
    teamName: "Junioren F2",
    teamSeasonId: "ts-1",
    title: "Spiel",
    status: "SCHEDULED",
    source: "MANUAL",
    timezone: "Europe/Zurich",
    locale: "de-CH",
    dateKey: "2026-10-15",
    startTime: "18:30",
    endTime: "20:00",
    playableVenueLabel: "Im Brüel · KR2",
    dressingRoomLabel: null,
    scheduleLine: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.matchExternalMappingFindFirst.mockResolvedValue(null);
});

describe("resolveMatchAudienceContext", () => {
  it("uses canonical Event.teamId when present (no mapping lookup)", async () => {
    mocks.teamFindMany.mockResolvedValue([{ id: "team-sce", name: "Junioren F2" }]);
    const result = await resolveMatchAudienceContext({
      tenantId: "tenant-1",
      snapshot: snap({ teamId: "team-sce" }),
    });
    expect(mocks.matchExternalMappingFindFirst).not.toHaveBeenCalled();
    expect(result?.teamIds).toEqual(["team-sce"]);
    expect(result?.primaryTeamId).toBe("team-sce");
  });

  it("mapping fallback includes only same-tenant SCE side, not external opponent", async () => {
    mocks.matchExternalMappingFindFirst.mockResolvedValue({
      homeTeamId: "ext-home",
      awayTeamId: "team-sce",
      homeTeam: { id: "ext-home", name: "FC Basel", tenantId: "tenant-other" },
      awayTeam: { id: "team-sce", name: "Junioren F2", tenantId: "tenant-1" },
    });
    mocks.teamFindMany.mockResolvedValue([{ id: "team-sce", name: "Junioren F2" }]);
    const result = await resolveMatchAudienceContext({
      tenantId: "tenant-1",
      snapshot: snap({ teamId: null }),
    });
    expect(result?.teamIds).toEqual(["team-sce"]);
    expect(result?.teamIds).not.toContain("ext-home");
  });

  it("returns null when no SCE team can be resolved", async () => {
    mocks.matchExternalMappingFindFirst.mockResolvedValue({
      homeTeam: { id: "ext-home", name: "A", tenantId: "tenant-other" },
      awayTeam: { id: "ext-away", name: "B", tenantId: "tenant-other" },
    });
    const result = await resolveMatchAudienceContext({
      tenantId: "tenant-1",
      snapshot: snap({ teamId: null }),
    });
    expect(result).toBeNull();
    expect(mocks.teamFindMany).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant team ids via prisma tenant filter", async () => {
    mocks.teamFindMany.mockResolvedValue([]);
    const result = await resolveMatchAudienceContext({
      tenantId: "tenant-1",
      snapshot: snap({ teamId: "team-other-tenant" }),
    });
    expect(result).toBeNull();
    expect(mocks.teamFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "tenant-1" }),
      }),
    );
  });

  it("dedupes when mapping lists same tenant team twice", async () => {
    mocks.matchExternalMappingFindFirst.mockResolvedValue({
      homeTeam: { id: "team-sce", name: "Junioren F2", tenantId: "tenant-1" },
      awayTeam: { id: "team-sce", name: "Junioren F2", tenantId: "tenant-1" },
    });
    mocks.teamFindMany.mockResolvedValue([{ id: "team-sce", name: "Junioren F2" }]);
    const result = await resolveMatchAudienceContext({
      tenantId: "tenant-1",
      snapshot: snap({ teamId: null }),
    });
    expect(result?.teamIds).toEqual(["team-sce"]);
  });
});
