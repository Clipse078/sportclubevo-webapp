import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  requireApiActorTenantPermission: vi.fn(),
  startImpersonationSession: vi.fn(),
  stopImpersonationSession: vi.fn(),
  assertCanImpersonateTenantMember: vi.fn(),
  logSecurityAction: vi.fn(),
  userFindUnique: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth,
  startImpersonationSession: mocks.startImpersonationSession,
  stopImpersonationSession: mocks.stopImpersonationSession,
}));

vi.mock("@/lib/permissions/require-api-actor-tenant-permission", () => ({
  requireApiActorTenantPermission: mocks.requireApiActorTenantPermission,
}));

vi.mock("@/lib/admin/users/tenant-impersonation", () => ({
  assertCanImpersonateTenantMember: mocks.assertCanImpersonateTenantMember,
}));

vi.mock("@/lib/audit/log-action", () => ({
  logSecurityAction: mocks.logSecurityAction,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { user: { findUnique: mocks.userFindUnique } },
}));

import { POST as startImpersonation } from "@/app/api/users/[userId]/impersonate/route";
import { POST as stopImpersonation } from "@/app/api/auth/stop-impersonation/route";

const actorUser = {
  id: "actor-1",
  actorUserId: "actor-1",
  effectiveUserId: "actor-1",
  email: "actor@example.com",
  firstName: "Alice",
  lastName: "Actor",
  isImpersonating: false,
  activeTenantId: "tenant-a",
};

function request(path: string) {
  return new NextRequest(`http://localhost${path}`, { method: "POST" });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiActorTenantPermission.mockResolvedValue({
    ok: true,
    status: 200,
    error: null,
    session: { user: actorUser },
  });
  mocks.auth.mockResolvedValue({ user: actorUser });
  mocks.assertCanImpersonateTenantMember.mockResolvedValue({
    ok: true,
    actorUserId: "actor-1",
    targetUserId: "target-1",
    tenantId: "tenant-a",
  });
  mocks.startImpersonationSession.mockResolvedValue({
    user: {
      ...actorUser,
      id: "target-1",
      effectiveUserId: "target-1",
      isImpersonating: true,
    },
  });
  mocks.stopImpersonationSession.mockResolvedValue({
    user: actorUser,
  });
  mocks.userFindUnique.mockResolvedValue({ id: "actor-1", isActive: true });
});

describe("POST /api/users/[userId]/impersonate", () => {
  it("preserves the dedicated server-side permission denial", async () => {
    mocks.requireApiActorTenantPermission.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
      session: { user: actorUser },
    });

    const response = await startImpersonation(
      request("/api/users/target-1/impersonate"),
      { params: Promise.resolve({ userId: "target-1" }) },
    );

    expect(response.status).toBe(403);
    expect(mocks.startImpersonationSession).not.toHaveBeenCalled();
  });

  it("starts authorized impersonation through the trusted server wrapper", async () => {
    const response = await startImpersonation(
      request("/api/users/target-1/impersonate"),
      { params: Promise.resolve({ userId: "target-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.assertCanImpersonateTenantMember).toHaveBeenCalledWith({
      actorUserId: "actor-1",
      actorTenantId: "tenant-a",
      targetUserId: "target-1",
    });
    expect(mocks.startImpersonationSession).toHaveBeenCalledWith(
      "actor-1",
      "target-1",
    );
    expect(mocks.logSecurityAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "actor-1",
        entityId: "target-1",
        action: "impersonation_started",
      }),
    );
  });

  it("rejects nested impersonation", async () => {
    mocks.requireApiActorTenantPermission.mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      session: {
        user: {
          ...actorUser,
          id: "target-1",
          effectiveUserId: "target-1",
          isImpersonating: true,
        },
      },
    });

    const response = await startImpersonation(
      request("/api/users/target-2/impersonate"),
      { params: Promise.resolve({ userId: "target-2" }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.startImpersonationSession).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant targets from tenant gate", async () => {
    mocks.assertCanImpersonateTenantMember.mockResolvedValue({
      ok: false,
      status: 404,
      error: "Benutzer ist kein aktives Mitglied dieses Vereins.",
      reasonCode: "CROSS_TENANT_OR_INACTIVE_MEMBERSHIP",
    });

    const response = await startImpersonation(
      request("/api/users/other-tenant-user/impersonate"),
      { params: Promise.resolve({ userId: "other-tenant-user" }) },
    );

    expect(response.status).toBe(404);
    expect(mocks.startImpersonationSession).not.toHaveBeenCalled();
  });

  it("fails closed when the trusted callback does not establish the target", async () => {
    mocks.startImpersonationSession.mockResolvedValue({ user: actorUser });

    const response = await startImpersonation(
      request("/api/users/target-1/impersonate"),
      { params: Promise.resolve({ userId: "target-1" }) },
    );

    expect(response.status).toBe(409);
  });
});

describe("POST /api/auth/stop-impersonation", () => {
  const impersonatedUser = {
    ...actorUser,
    id: "target-1",
    effectiveUserId: "target-1",
    isImpersonating: true,
  };

  it("restores the canonical actor through the trusted server wrapper", async () => {
    mocks.auth.mockResolvedValue({ user: impersonatedUser });

    const response = await stopImpersonation();

    expect(response.status).toBe(200);
    expect(mocks.stopImpersonationSession).toHaveBeenCalledWith("actor-1");
    const body = await response.json();
    expect(body.redirectTo).toBe("/dashboard/admin/people-access");
    expect(mocks.logSecurityAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "actor-1",
        entityId: "target-1",
        action: "impersonation_stopped",
      }),
    );
  });

  it("rejects stop without trusted impersonation state", async () => {
    const response = await stopImpersonation();

    expect(response.status).toBe(400);
    expect(mocks.stopImpersonationSession).not.toHaveBeenCalled();
  });

  it("fails closed when the trusted callback does not restore the actor", async () => {
    mocks.auth.mockResolvedValue({ user: impersonatedUser });
    mocks.stopImpersonationSession.mockResolvedValue({ user: impersonatedUser });

    const response = await stopImpersonation();

    expect(response.status).toBe(409);
  });
});
