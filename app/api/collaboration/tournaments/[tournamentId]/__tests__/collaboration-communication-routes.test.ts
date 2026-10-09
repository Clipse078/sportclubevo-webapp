/**
 * SCE-COLLAB-01B-R1 — tournament prepare/publish API authorization (direct API).
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireApiAnyPermission: vi.fn(),
  getActiveTenant: vi.fn(),
  prepareTournamentActivityChangeCommunicationDraft: vi.fn(),
  publishPreparedTournamentActivityChangeCommunication: vi.fn(),
}));

vi.mock("@/lib/permissions/require-api-any-permission", () => ({
  requireApiAnyPermission: mocks.requireApiAnyPermission,
}));

vi.mock("@/lib/tenants/active-tenant", () => ({
  getActiveTenant: mocks.getActiveTenant,
}));

vi.mock("@/lib/collaboration/contextual-communication-service", () => ({
  prepareTournamentActivityChangeCommunicationDraft:
    mocks.prepareTournamentActivityChangeCommunicationDraft,
  publishPreparedTournamentActivityChangeCommunication:
    mocks.publishPreparedTournamentActivityChangeCommunication,
}));

import { TeamCommunicationValidationError } from "@/lib/communication/team/team-communication-errors";
import { TEAM_COMMUNICATION_NO_ELIGIBLE_RECIPIENTS_MESSAGE } from "@/lib/collaboration/contextual-communication-http";
import { POST as preparePost } from "../prepare-communication/route";
import { POST as publishPost } from "../publish-communication/route";

const TOURNAMENT_ID = "tour-1";

function authOk(effectiveUserId?: string) {
  return {
    ok: true as const,
    status: 200,
    error: null,
    session: {
      user: {
        id: "actor-1",
        effectiveUserId,
        activeTenantId: "tenant-1",
      },
    },
  };
}

const changeSet = {
  domain: "TOURNAMENT" as const,
  activityId: TOURNAMENT_ID,
  fingerprint: "fp-t",
  entries: [
    {
      field: "VENUE" as const,
      oldValue: "a",
      newValue: "b",
      displayOld: "Alt",
      displayNew: "Neu",
      significant: true,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getActiveTenant.mockResolvedValue({ id: "tenant-1", key: "fca" });
});

describe("tournament collaboration prepare-communication route", () => {
  it("denies without COMMUNICATION_TEAM_SEND", async () => {
    mocks.requireApiAnyPermission.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
      session: null,
    });
    const req = new NextRequest(
      `http://localhost/api/collaboration/tournaments/${TOURNAMENT_ID}/prepare-communication`,
      { method: "POST", body: JSON.stringify({ changeSet }) },
    );
    const res = await preparePost(req, { params: Promise.resolve({ tournamentId: TOURNAMENT_ID }) });
    expect(res.status).toBe(403);
    expect(mocks.prepareTournamentActivityChangeCommunicationDraft).not.toHaveBeenCalled();
  });

  it("requires TOURNAMENT domain changeSet", async () => {
    mocks.requireApiAnyPermission.mockResolvedValue(authOk());
    const req = new NextRequest(
      `http://localhost/api/collaboration/tournaments/${TOURNAMENT_ID}/prepare-communication`,
      {
        method: "POST",
        body: JSON.stringify({
          changeSet: { ...changeSet, domain: "MATCH" },
        }),
      },
    );
    const res = await preparePost(req, { params: Promise.resolve({ tournamentId: TOURNAMENT_ID }) });
    expect(res.status).toBe(400);
  });

  it("prepare succeeds with valid payload", async () => {
    mocks.requireApiAnyPermission.mockResolvedValue(authOk());
    mocks.prepareTournamentActivityChangeCommunicationDraft.mockResolvedValue({
      draftId: "draft-t1",
      reusedExistingDraft: false,
    });
    const req = new NextRequest(
      `http://localhost/api/collaboration/tournaments/${TOURNAMENT_ID}/prepare-communication`,
      {
        method: "POST",
        body: JSON.stringify({ changeSet }),
        headers: { "Content-Type": "application/json" },
      },
    );
    const res = await preparePost(req, { params: Promise.resolve({ tournamentId: TOURNAMENT_ID }) });
    expect(res.status).toBe(200);
    expect(mocks.prepareTournamentActivityChangeCommunicationDraft).toHaveBeenCalled();
  });
});

describe("tournament collaboration publish-communication route", () => {
  it("denies without COMMUNICATION_TEAM_SEND", async () => {
    mocks.requireApiAnyPermission.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
      session: null,
    });
    const req = new NextRequest(
      `http://localhost/api/collaboration/tournaments/${TOURNAMENT_ID}/publish-communication`,
      {
        method: "POST",
        body: JSON.stringify({ draftId: "d1", teamId: "team-1" }),
      },
    );
    const res = await publishPost(req, { params: Promise.resolve({ tournamentId: TOURNAMENT_ID }) });
    expect(res.status).toBe(403);
    expect(mocks.publishPreparedTournamentActivityChangeCommunication).not.toHaveBeenCalled();
  });

  it("R5-11/R5-13 publish zero recipients returns localized German errorCode", async () => {
    mocks.requireApiAnyPermission.mockResolvedValue(authOk());
    mocks.publishPreparedTournamentActivityChangeCommunication.mockRejectedValue(
      new TeamCommunicationValidationError(TEAM_COMMUNICATION_NO_ELIGIBLE_RECIPIENTS_MESSAGE),
    );
    const req = new NextRequest(
      `http://localhost/api/collaboration/tournaments/${TOURNAMENT_ID}/publish-communication`,
      {
        method: "POST",
        body: JSON.stringify({ draftId: "d1", teamId: "team-1" }),
        headers: { "Content-Type": "application/json" },
      },
    );
    const res = await publishPost(req, { params: Promise.resolve({ tournamentId: TOURNAMENT_ID }) });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error?: string; errorCode?: string };
    expect(body.errorCode).toBe("NO_ELIGIBLE_RECIPIENTS");
    expect(body.error).toContain("berechtigten Empfänger");
    expect(body.error).not.toMatch(/no eligible recipients/i);
  });
});
