/**
 * DELETE /api/meetings/[id]/permanent — route wiring tests (mocked, no live DB).
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasTenantDeletionAuthority: vi.fn(),
  logAction: vi.fn(),
  meetingFindFirst: vi.fn(),
  getMeetingDeletionImpact: vi.fn(),
  deleteMeetingPermanently: vi.fn(),
  resolveLiveTenantActor: vi.fn(),
  canSeeEntity: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));

vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    hasTenantDeletionAuthority: mocks.hasTenantDeletionAuthority,
  }),
}));

vi.mock("@/lib/audit/log-action", () => ({ logAction: mocks.logAction }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    meeting: {
      findFirst: (...args: unknown[]) => mocks.meetingFindFirst(...args),
    },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/permissions/require-strategic-api-context", () => ({
  resolveLiveTenantActor: mocks.resolveLiveTenantActor,
}));

vi.mock("@/lib/visibility/visibility-filter", () => ({
  canSeeEntity: mocks.canSeeEntity,
}));

vi.mock("@/lib/meetings/meeting-delete-service", () => ({
  getMeetingDeletionImpact: mocks.getMeetingDeletionImpact,
  deleteMeetingPermanently: mocks.deleteMeetingPermanently,
}));

import { DELETE } from "../route";

const MEETING_ID = "meet-1";
const TENANT_A = "tenant-a";
const USER_ID = "user-actor";

const MOCK_MEETING = {
  id: MEETING_ID,
  title: "Vorstandssitzung",
  slug: "vorstand",
  visibilityScope: "ORGANISATION",
  visibleRoleRefs: [],
  visibleUserRefs: [],
  visibleTeamRefs: [],
  visibleOrgUnitRefs: [],
  visiblePersonRefs: [],
  visibleTargetGroupRefs: [],
  createdByUserId: USER_ID,
};

const MOCK_IMPACT = {
  agendaItems: 2,
  decisions: 1,
  actions: 3,
  participants: 4,
};

function makeReq(confirm?: boolean) {
  const base = `http://localhost/api/meetings/${MEETING_ID}/permanent`;
  return new NextRequest(confirm ? `${base}?confirm=true` : base, { method: "DELETE" });
}

function makeParams() {
  return { params: Promise.resolve({ id: MEETING_ID }) };
}

function authSession(tenantId: string | null = TENANT_A) {
  return {
    user: {
      id: USER_ID,
      effectiveUserId: USER_ID,
      activeTenantId: tenantId,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.logAction.mockResolvedValue(undefined);
  mocks.resolveLiveTenantActor.mockResolvedValue({ userId: USER_ID, tenantId: TENANT_A });
  mocks.canSeeEntity.mockReturnValue(true);
});

describe("DELETE /api/meetings/[id]/permanent", () => {
  it("returns 401 when unauthenticated", async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await DELETE(makeReq(), makeParams());
    expect(res.status).toBe(401);
    expect(mocks.deleteMeetingPermanently).not.toHaveBeenCalled();
  });

  it("returns 403 when session lacks active tenant", async () => {
    mocks.auth.mockResolvedValue(authSession(null));
    const res = await DELETE(makeReq(), makeParams());
    expect(res.status).toBe(403);
    expect(mocks.meetingFindFirst).not.toHaveBeenCalled();
  });

  it("returns 404 for cross-tenant access (meeting not in active tenant)", async () => {
    mocks.auth.mockResolvedValue(authSession(TENANT_A));
    mocks.meetingFindFirst.mockResolvedValue(null);

    const res = await DELETE(makeReq(true), makeParams());
    expect(res.status).toBe(404);
    expect(mocks.hasTenantDeletionAuthority).not.toHaveBeenCalled();
    expect(mocks.deleteMeetingPermanently).not.toHaveBeenCalled();
  });

  it("returns 403 when caller is not authorized for meetings.delete", async () => {
    mocks.auth.mockResolvedValue(authSession());
    mocks.meetingFindFirst.mockResolvedValue(MOCK_MEETING);
    mocks.hasTenantDeletionAuthority.mockResolvedValue(false);

    const res = await DELETE(makeReq(true), makeParams());
    expect(res.status).toBe(403);
    expect(mocks.hasTenantDeletionAuthority).toHaveBeenCalledWith({
      userId: USER_ID,
      permission: PERMISSIONS.MEETINGS_DELETE,
      tenantId: TENANT_A,
    });
    expect(mocks.deleteMeetingPermanently).not.toHaveBeenCalled();
  });

  it("preview without confirm=true returns impact and never deletes", async () => {
    mocks.auth.mockResolvedValue(authSession());
    mocks.meetingFindFirst.mockResolvedValue(MOCK_MEETING);
    mocks.hasTenantDeletionAuthority.mockResolvedValue(true);
    mocks.getMeetingDeletionImpact.mockResolvedValue(MOCK_IMPACT);

    const res = await DELETE(makeReq(), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.requiresConfirmation).toBe(true);
    expect(body.impact).toEqual(MOCK_IMPACT);
    expect(mocks.getMeetingDeletionImpact).toHaveBeenCalledWith(MEETING_ID, TENANT_A);
    expect(mocks.deleteMeetingPermanently).not.toHaveBeenCalled();
  });

  it("preview with confirm=false never deletes", async () => {
    mocks.auth.mockResolvedValue(authSession());
    mocks.meetingFindFirst.mockResolvedValue(MOCK_MEETING);
    mocks.hasTenantDeletionAuthority.mockResolvedValue(true);
    mocks.getMeetingDeletionImpact.mockResolvedValue(MOCK_IMPACT);

    const res = await DELETE(
      new NextRequest(`http://localhost/api/meetings/${MEETING_ID}/permanent?confirm=false`, {
        method: "DELETE",
      }),
      makeParams(),
    );

    expect(res.status).toBe(200);
    expect(mocks.deleteMeetingPermanently).not.toHaveBeenCalled();
  });

  it("confirm=true permanently deletes when authorized", async () => {
    mocks.auth.mockResolvedValue(authSession());
    mocks.meetingFindFirst.mockResolvedValue(MOCK_MEETING);
    mocks.hasTenantDeletionAuthority.mockResolvedValue(true);
    mocks.deleteMeetingPermanently.mockResolvedValue({
      meetingId: MEETING_ID,
      title: MOCK_MEETING.title,
      impact: MOCK_IMPACT,
    });

    const res = await DELETE(makeReq(true), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toMatch(/gelöscht/);
    expect(mocks.deleteMeetingPermanently).toHaveBeenCalledWith(MEETING_ID, TENANT_A);
    expect(mocks.getMeetingDeletionImpact).not.toHaveBeenCalled();
    expect(mocks.logAction).toHaveBeenCalled();
  });
});