import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolvePlayerReleaseRouteAccess: vi.fn(),
  listPlayerReleasesForSourceTeamSeason: vi.fn(),
  createPlayerRelease: vi.fn(),
}));

vi.mock("@/lib/match-squad/player-release-route-access", () => ({
  resolvePlayerReleaseRouteAccess: mocks.resolvePlayerReleaseRouteAccess,
  mapPlayerReleaseRouteError: (error: unknown) => {
    if (error instanceof Error && "httpStatus" in error) {
      const e = error as { message: string; code: string; httpStatus: number };
      return Response.json({ error: e.message, code: e.code }, { status: e.httpStatus });
    }
    return Response.json({ error: "fail", code: "INTERNAL" }, { status: 500 });
  },
}));

vi.mock("@/lib/match-squad/player-release-service", () => ({
  listPlayerReleasesForSourceTeamSeason: mocks.listPlayerReleasesForSourceTeamSeason,
  createPlayerRelease: mocks.createPlayerRelease,
}));

import { GET, POST } from "../route";

function ctx() {
  return {
    params: Promise.resolve({
      teamId: "team-1",
      teamSeasonId: "ts-1",
    }),
  };
}

describe("player-releases route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolvePlayerReleaseRouteAccess.mockResolvedValue({
      ok: true,
      tenant: { id: "tenant-1", key: "fca", timezone: "Europe/Zurich" },
      userId: "user-1",
      access: { canManageSource: true },
    });
    mocks.listPlayerReleasesForSourceTeamSeason.mockResolvedValue({
      releases: [],
      rosterPlayers: [],
    });
  });

  it("GET returns list payload", async () => {
    const response = await GET(new NextRequest("http://localhost/api"), ctx());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.canEdit).toBe(true);
    expect(body.releases).toEqual([]);
  });

  it("POST returns forbidden for non-manager", async () => {
    mocks.resolvePlayerReleaseRouteAccess.mockResolvedValue({
      ok: true,
      tenant: { id: "tenant-1", key: "fca", timezone: "Europe/Zurich" },
      userId: "user-2",
      access: { canManageSource: false },
    });

    const response = await POST(
      new NextRequest("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ personId: "p1" }),
      }),
      ctx(),
    );
    expect(response.status).toBe(403);
  });

  it("POST creates release", async () => {
    mocks.createPlayerRelease.mockResolvedValue({ id: "release-1" });
    const response = await POST(
      new NextRequest("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({
          personId: "p1",
          targetTeamSeasonId: "ts-2",
          validFrom: "2026-10-10",
          validUntil: "2026-11-30",
          reason: "SPIELPRAXIS",
        }),
      }),
      ctx(),
    );
    expect(response.status).toBe(201);
    expect(mocks.createPlayerRelease).toHaveBeenCalled();
  });
});
