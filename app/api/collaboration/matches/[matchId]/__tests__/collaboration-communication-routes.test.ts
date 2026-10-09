/**
 * SCE-COLLAB-01B-R1 — match prepare/publish API authorization (direct API).
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireApiAnyPermission: vi.fn(),
  getActiveTenant: vi.fn(),
  prepareMatchActivityChangeCommunicationDraft: vi.fn(),
  publishPreparedMatchActivityChangeCommunication: vi.fn(),
}));

vi.mock("@/lib/permissions/require-api-any-permission", () => ({
  requireApiAnyPermission: mocks.requireApiAnyPermission,
}));

vi.mock("@/lib/tenants/active-tenant", () => ({
  getActiveTenant: mocks.getActiveTenant,
}));

vi.mock("@/lib/collaboration/contextual-communication-service", () => ({
  prepareMatchActivityChangeCommunicationDraft: mocks.prepareMatchActivityChangeCommunicationDraft,
  publishPreparedMatchActivityChangeCommunication: mocks.publishPreparedMatchActivityChangeCommunication,
}));

import { POST as preparePost } from "../prepare-communication/route";
import { POST as publishPost } from "../publish-communication/route";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";

const MATCH_ID = "match-1";

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
  domain: "MATCH" as const,
  activityId: MATCH_ID,
  fingerprint: "fp1",
  entries: [
    {
      field: "START_TIME" as const,
      oldValue: "18:30",
      newValue: "19:30",
      displayOld: "18:30",
      displayNew: "19:30",
      significant: true,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getActiveTenant.mockResolvedValue({ id: "tenant-1", key: "fca" });
});

describe("match collaboration prepare-communication route", () => {
  it("denies without COMMUNICATION_TEAM_SEND", async () => {
    mocks.requireApiAnyPermission.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
      session: null,
    });
    const req = new NextRequest(
      `http://localhost/api/collaboration/matches/${MATCH_ID}/prepare-communication`,
      { method: "POST", body: JSON.stringify({ changeSet }) },
    );
    const res = await preparePost(req, { params: Promise.resolve({ matchId: MATCH_ID }) });
    expect(res.status).toBe(403);
    expect(mocks.prepareMatchActivityChangeCommunicationDraft).not.toHaveBeenCalled();
  });

  it("rejects changeSet activityId mismatch", async () => {
    mocks.requireApiAnyPermission.mockResolvedValue(authOk());
    const req = new NextRequest(
      `http://localhost/api/collaboration/matches/${MATCH_ID}/prepare-communication`,
      {
        method: "POST",
        body: JSON.stringify({
          changeSet: { ...changeSet, activityId: "other-match" },
        }),
      },
    );
    const res = await preparePost(req, { params: Promise.resolve({ matchId: MATCH_ID }) });
    expect(res.status).toBe(400);
  });

  it("uses effectiveUserId when impersonating", async () => {
    mocks.requireApiAnyPermission.mockResolvedValue(authOk("effective-9"));
    mocks.prepareMatchActivityChangeCommunicationDraft.mockResolvedValue({ draftId: "d1" });
    const req = new NextRequest(
      `http://localhost/api/collaboration/matches/${MATCH_ID}/prepare-communication`,
      {
        method: "POST",
        body: JSON.stringify({ changeSet }),
        headers: { "Content-Type": "application/json" },
      },
    );
    const res = await preparePost(req, { params: Promise.resolve({ matchId: MATCH_ID }) });
    expect(res.status).toBe(200);
    expect(mocks.prepareMatchActivityChangeCommunicationDraft).toHaveBeenCalledWith(
      expect.objectContaining({ senderUserId: "effective-9", matchId: MATCH_ID }),
    );
  });

  it("maps forbidden to 403 without leaking draft metadata", async () => {
    mocks.requireApiAnyPermission.mockResolvedValue(authOk());
    mocks.prepareMatchActivityChangeCommunicationDraft.mockRejectedValue(
      new TeamCommunicationForbiddenError("TEAM_COMMUNICATION_SEND_DENIED"),
    );
    const req = new NextRequest(
      `http://localhost/api/collaboration/matches/${MATCH_ID}/prepare-communication`,
      {
        method: "POST",
        body: JSON.stringify({ changeSet }),
        headers: { "Content-Type": "application/json" },
      },
    );
    const res = await preparePost(req, { params: Promise.resolve({ matchId: MATCH_ID }) });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.draftId).toBeUndefined();
  });
});

describe("match collaboration publish-communication route", () => {
  it("denies without COMMUNICATION_TEAM_SEND", async () => {
    mocks.requireApiAnyPermission.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
      session: null,
    });
    const req = new NextRequest(
      `http://localhost/api/collaboration/matches/${MATCH_ID}/publish-communication`,
      {
        method: "POST",
        body: JSON.stringify({ draftId: "d1", teamId: "team-1" }),
      },
    );
    const res = await publishPost(req, { params: Promise.resolve({ matchId: MATCH_ID }) });
    expect(res.status).toBe(403);
    expect(mocks.publishPreparedMatchActivityChangeCommunication).not.toHaveBeenCalled();
  });
});
