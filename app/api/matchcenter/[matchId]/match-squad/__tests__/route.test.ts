import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireApiAnyPermission: vi.fn(),
  auth: vi.fn(),
  getActiveTenant: vi.fn(),
  resolveMatchSquadEventContext: vi.fn(),
  resolveMatchSquadAccess: vi.fn(),
  buildMatchSquadViewModel: vi.fn(),
  setMatchSquadMembers: vi.fn(),
}));

vi.mock("@/lib/permissions/require-api-any-permission", () => ({
  requireApiAnyPermission: mocks.requireApiAnyPermission,
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/tenants/active-tenant", () => ({
  getActiveTenant: mocks.getActiveTenant,
}));

vi.mock("@/lib/match-squad/event-context", () => ({
  resolveMatchSquadEventContext: mocks.resolveMatchSquadEventContext,
}));

vi.mock("@/lib/match-squad/auth", () => ({
  resolveMatchSquadAccess: mocks.resolveMatchSquadAccess,
  assertMatchSquadMutationAllowed: vi.fn(),
}));

vi.mock("@/lib/match-squad/match-squad-service", () => ({
  buildMatchSquadViewModel: mocks.buildMatchSquadViewModel,
  setMatchSquadMembers: mocks.setMatchSquadMembers,
}));

import { GET } from "../route";
import { MatchSquadValidationError } from "@/lib/match-squad/errors";

function makeContext(matchId = "match-1") {
  return { params: Promise.resolve({ matchId }) };
}

describe("GET /api/matchcenter/[matchId]/match-squad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApiAnyPermission.mockResolvedValue({ ok: true, status: 200, error: null });
    mocks.auth.mockResolvedValue({ user: { id: "user-1", effectiveUserId: "user-1" } });
    mocks.getActiveTenant.mockResolvedValue({ id: "tenant-1", key: "fc-allschwil" });
    mocks.resolveMatchSquadEventContext.mockResolvedValue({
      teamId: "team-1",
      teamSeasonId: "ts-1",
    });
    mocks.resolveMatchSquadAccess.mockResolvedValue({ canEdit: true });
  });

  it("returns structured JSON for domain validation failures", async () => {
    mocks.resolveMatchSquadEventContext.mockRejectedValue(
      new MatchSquadValidationError(
        "Team-Saison für dieses Spiel konnte nicht aufgelöst werden.",
        "NO_TEAM_SEASON",
      ),
    );

    const response = await GET(new NextRequest("http://localhost/api"), makeContext());
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: "Team-Saison für dieses Spiel konnte nicht aufgelöst werden.",
      code: "NO_TEAM_SEASON",
    });
  });

  it("returns structured JSON when required tables are missing", async () => {
    mocks.buildMatchSquadViewModel.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Table does not exist", {
        code: "P2021",
        clientVersion: "test",
      }),
    );

    const response = await GET(new NextRequest("http://localhost/api"), makeContext());
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe("SCHEMA_NOT_READY");
    expect(typeof body.error).toBe("string");
  });

  it("returns structured JSON for unexpected server failures", async () => {
    mocks.buildMatchSquadViewModel.mockRejectedValue(new Error("boom"));

    const response = await GET(new NextRequest("http://localhost/api"), makeContext());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Aufgebot konnte nicht verarbeitet werden.",
      code: "INTERNAL",
    });
  });

  it("returns squad payload on success", async () => {
    mocks.buildMatchSquadViewModel.mockResolvedValue({
      version: "2026-10-10T12:00:00.000Z",
      editable: true,
      selected: [],
      remaining: [],
    });

    const response = await GET(new NextRequest("http://localhost/api"), makeContext());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.canEdit).toBe(true);
    expect(body.selected).toEqual([]);
  });
});
