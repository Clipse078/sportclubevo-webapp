import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  resolveAccessForMatch: vi.fn(),
  respondToParticipation: vi.fn(),
  eventFindFirst: vi.fn(),
}));

vi.mock("@/lib/match-squad/match-squad-route-access", () => ({
  resolveAccessForMatch: mocks.resolveAccessForMatch,
}));

vi.mock("@/lib/participation/participation-service", () => ({
  respondToParticipation: mocks.respondToParticipation,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { event: { findFirst: mocks.eventFindFirst } },
}));

import { POST } from "../route";

describe("POST /api/matchcenter/[matchId]/participation-response", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAccessForMatch.mockResolvedValue({
      ok: true,
      tenant: { id: "t1" },
      userId: "u1",
      access: {
        canEdit: true,
        teamSeasonId: "ts1",
      },
    });
    mocks.eventFindFirst.mockResolvedValue({
      startAt: new Date(Date.now() + 86_400_000),
      status: "SCHEDULED",
    });
    mocks.respondToParticipation.mockResolvedValue({ id: "pr1", status: "YES" });
  });

  it("records trainer response with TRAINER source path", async () => {
    const req = new NextRequest("http://localhost/api/matchcenter/m1/participation-response", {
      method: "POST",
      body: JSON.stringify({ personId: "p1", status: "YES" }),
    });
    const res = await POST(req, { params: Promise.resolve({ matchId: "m1" }) });
    expect(res.status).toBe(200);
    expect(mocks.respondToParticipation).toHaveBeenCalledWith(
      "t1",
      "u1",
      expect.objectContaining({
        personId: "p1",
        status: "YES",
        responseSource: "TRAINER",
      }),
    );
  });
});
