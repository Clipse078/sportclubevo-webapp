/**
 * SCE-COLLAB-01A-R1 — prepare/publish API authorization (direct API, server enforcement).
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireApiAnyPermission: vi.fn(),
  getActiveTenant: vi.fn(),
  prepareTrainingActivityChangeCommunicationDraft: vi.fn(),
  publishPreparedTrainingActivityChangeCommunication: vi.fn(),
}));

vi.mock("@/lib/permissions/require-api-any-permission", () => ({
  requireApiAnyPermission: mocks.requireApiAnyPermission,
}));

vi.mock("@/lib/tenants/active-tenant", () => ({
  getActiveTenant: mocks.getActiveTenant,
}));

vi.mock("@/lib/collaboration/contextual-communication-service", () => ({
  prepareTrainingActivityChangeCommunicationDraft: mocks.prepareTrainingActivityChangeCommunicationDraft,
  publishPreparedTrainingActivityChangeCommunication:
    mocks.publishPreparedTrainingActivityChangeCommunication,
}));

import { POST as preparePost } from "../prepare-communication/route";
import { POST as publishPost } from "../publish-communication/route";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";

const SESSION_ID = "sess-1";

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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getActiveTenant.mockResolvedValue({ id: "tenant-1", key: "fca" });
});

describe("collaboration prepare-communication route", () => {
  it("denies without COMMUNICATION_TEAM_SEND at API boundary", async () => {
    mocks.requireApiAnyPermission.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
      session: null,
    });
    const req = new NextRequest(
      `http://localhost/api/collaboration/training-sessions/${SESSION_ID}/prepare-communication`,
      {
        method: "POST",
        body: JSON.stringify({ changeSet: { domain: "TRAINING", activityId: SESSION_ID, fingerprint: "fp", entries: [] } }),
      },
    );
    const res = await preparePost(req, { params: Promise.resolve({ sessionId: SESSION_ID }) });
    expect(res.status).toBe(403);
    expect(mocks.prepareTrainingActivityChangeCommunicationDraft).not.toHaveBeenCalled();
  });

  it("uses effectiveUserId for prepare when impersonating", async () => {
    mocks.requireApiAnyPermission.mockResolvedValue(authOk("effective-7"));
    mocks.prepareTrainingActivityChangeCommunicationDraft.mockResolvedValue({ draftId: "d1" });
    const changeSet = {
      domain: "TRAINING" as const,
      activityId: SESSION_ID,
      fingerprint: "abc",
      entries: [{ field: "VENUE" as const, oldValue: "a", newValue: "b", displayOld: "a", displayNew: "b", significant: true }],
    };
    const req = new NextRequest(
      `http://localhost/api/collaboration/training-sessions/${SESSION_ID}/prepare-communication`,
      {
        method: "POST",
        body: JSON.stringify({ changeSet }),
        headers: { "Content-Type": "application/json" },
      },
    );
    const res = await preparePost(req, { params: Promise.resolve({ sessionId: SESSION_ID }) });
    expect(res.status).toBe(200);
    expect(mocks.prepareTrainingActivityChangeCommunicationDraft).toHaveBeenCalledWith(
      expect.objectContaining({ senderUserId: "effective-7" }),
    );
  });

  it("maps service forbidden to 403 without leaking recipient data", async () => {
    mocks.requireApiAnyPermission.mockResolvedValue(authOk());
    mocks.prepareTrainingActivityChangeCommunicationDraft.mockRejectedValue(
      new TeamCommunicationForbiddenError("TEAM_COMMUNICATION_SEND_DENIED"),
    );
    const changeSet = {
      domain: "TRAINING" as const,
      activityId: SESSION_ID,
      fingerprint: "abc",
      entries: [],
    };
    const req = new NextRequest(
      `http://localhost/api/collaboration/training-sessions/${SESSION_ID}/prepare-communication`,
      {
        method: "POST",
        body: JSON.stringify({ changeSet }),
        headers: { "Content-Type": "application/json" },
      },
    );
    const res = await preparePost(req, { params: Promise.resolve({ sessionId: SESSION_ID }) });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Communication not permitted");
    expect(json.draftId).toBeUndefined();
  });
});

describe("collaboration publish-communication route", () => {
  it("denies without COMMUNICATION_TEAM_SEND at API boundary", async () => {
    mocks.requireApiAnyPermission.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
      session: null,
    });
    const req = new NextRequest(
      `http://localhost/api/collaboration/training-sessions/${SESSION_ID}/publish-communication`,
      {
        method: "POST",
        body: JSON.stringify({ draftId: "d1", teamId: "team-1" }),
      },
    );
    const res = await publishPost(req, { params: Promise.resolve({ sessionId: SESSION_ID }) });
    expect(res.status).toBe(403);
    expect(mocks.publishPreparedTrainingActivityChangeCommunication).not.toHaveBeenCalled();
  });
});
