/** @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getActorContext: vi.fn(),
  requireMeetingAccess: vi.fn(),
  getMeetingDecisionDeletionImpact: vi.fn(),
  deleteMeetingDecisionWithDependencies: vi.fn(),
  canEditMeetingDocumentation: vi.fn(),
  meetingFindFirst: vi.fn(),
  decisionFindFirst: vi.fn(),
  logAuditEvent: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/visibility/get-actor-context", () => ({
  getActorContext: mocks.getActorContext,
}));
vi.mock("@/lib/visibility/visibility-guards", () => ({
  requireMeetingAccess: mocks.requireMeetingAccess,
}));
vi.mock("@/lib/meetings/meeting-outcome-delete-service", () => ({
  getMeetingDecisionDeletionImpact: mocks.getMeetingDecisionDeletionImpact,
  deleteMeetingDecisionWithDependencies: mocks.deleteMeetingDecisionWithDependencies,
}));
vi.mock("@/lib/meetings/meeting-workspace-lock", () => ({
  canEditMeetingDocumentation: mocks.canEditMeetingDocumentation,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    meeting: { findFirst: mocks.meetingFindFirst },
    meetingDecision: { findFirst: mocks.decisionFindFirst },
  },
}));
vi.mock("@/lib/audit/audit-log", () => ({ logAuditEvent: mocks.logAuditEvent }));

import { DELETE } from "../route";

const MEETING_ID = "m1";
const DECISION_ID = "d1";

describe("DELETE /api/meetings/[id]/decisions/[decisionId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "u1", activeTenantId: "t1" } });
    mocks.getActorContext.mockResolvedValue({ userId: "u1", tenantId: "t1" });
    mocks.requireMeetingAccess.mockResolvedValue({ ok: true });
    mocks.canEditMeetingDocumentation.mockReturnValue(true);
    mocks.meetingFindFirst.mockResolvedValue({
      status: "PLANNED",
      reviewStage: null,
      protocolApprovalRequired: false,
    });
    mocks.decisionFindFirst.mockResolvedValue({ id: DECISION_ID, title: "Budget" });
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await DELETE(new NextRequest("http://localhost"), {
      params: Promise.resolve({ id: MEETING_ID, decisionId: DECISION_ID }),
    });
    expect(res.status).toBe(401);
  });

  it("returns impact preview without confirm", async () => {
    mocks.getMeetingDecisionDeletionImpact.mockResolvedValue({ linkedPendenzCount: 1, linkedTaskCount: 0 });
    const res = await DELETE(new NextRequest("http://localhost"), {
      params: Promise.resolve({ id: MEETING_ID, decisionId: DECISION_ID }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.requiresConfirmation).toBe(true);
    expect(mocks.deleteMeetingDecisionWithDependencies).not.toHaveBeenCalled();
  });

  it("performs delete only with confirm=true", async () => {
    mocks.getMeetingDecisionDeletionImpact.mockResolvedValue({ linkedPendenzCount: 0, linkedTaskCount: 0 });
    mocks.deleteMeetingDecisionWithDependencies.mockResolvedValue({ title: "Budget" });
    const res = await DELETE(
      new NextRequest("http://localhost?confirm=true"),
      { params: Promise.resolve({ id: MEETING_ID, decisionId: DECISION_ID }) },
    );
    expect(res.status).toBe(200);
    expect(mocks.deleteMeetingDecisionWithDependencies).toHaveBeenCalledWith(MEETING_ID, "t1", DECISION_ID);
  });

  it("returns 403 when meeting access guard fails", async () => {
    mocks.requireMeetingAccess.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    });
    const res = await DELETE(new NextRequest("http://localhost"), {
      params: Promise.resolve({ id: MEETING_ID, decisionId: DECISION_ID }),
    });
    expect(res.status).toBe(403);
  });
});