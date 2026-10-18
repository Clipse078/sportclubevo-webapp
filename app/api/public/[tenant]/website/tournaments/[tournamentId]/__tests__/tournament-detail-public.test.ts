import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  tenantFindFirst: vi.fn(),
  loadPublic: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenant: { findFirst: mocks.tenantFindFirst },
  },
}));

class PublicTournamentNotFoundError extends Error {
  constructor() {
    super("not found");
    this.name = "PublicTournamentNotFoundError";
  }
}

vi.mock("@/lib/tournaments/public/load-public-tournament-view-model.server", () => ({
  loadPublicTournamentViewModel: mocks.loadPublic,
  PublicTournamentNotFoundError,
}));

const { GET } = await import("../route");

const ACTIVE_TENANT = {
  id: "tenant-fca",
  key: "fc-allschwil",
  name: "FC Allschwil",
  status: "ACTIVE",
  websiteEnabled: true,
  approvedDataOnly: false,
};

describe("GET /api/public/[tenant]/website/tournaments/[tournamentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantFindFirst.mockResolvedValue(ACTIVE_TENANT);
  });

  it("returns 404 when public loader rejects unpublished tournament", async () => {
    mocks.loadPublic.mockRejectedValue(new PublicTournamentNotFoundError());
    const req = new NextRequest("http://localhost/api/public/fc-allschwil/website/tournaments/hidden");
    const res = await GET(req, { params: Promise.resolve({ tenant: "fc-allschwil", tournamentId: "hidden" }) });
    expect(res.status).toBe(404);
  });

  it("returns public view model for published tournament", async () => {
    mocks.loadPublic.mockResolvedValue({
      tournament: { id: "t1", title: "Test" },
      publicPath: "/public/fc-allschwil/turniere/t1",
    });
    const req = new NextRequest("http://localhost/api/public/fc-allschwil/website/tournaments/t1");
    const res = await GET(req, { params: Promise.resolve({ tenant: "fc-allschwil", tournamentId: "t1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.tournament.publicPath).toContain("t1");
  });
});
