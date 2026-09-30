import { NextRequest, NextResponse } from "next/server";
import { startImpersonationSession } from "@/auth";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { logSecurityAction } from "@/lib/audit/log-action";
import { assertCanImpersonateTenantMember } from "@/lib/admin/users/tenant-impersonation";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function POST(_: NextRequest, context: RouteContext) {
  const access = await requireApiAnyPermission([
    PERMISSIONS.USERS_IMPERSONATE,
    PERMISSIONS.USERS_IMPERSONATE_TENANT,
  ]);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const session = access.session;

  const { userId } = await context.params;

  if (session.user.isImpersonating) {
    await logSecurityAction({
      actorUserId: session.user.actorUserId ?? session.user.id,
      effectiveUserId: session.user.effectiveUserId ?? session.user.id,
      tenantId: session.user.activeTenantId,
      moduleKey: "security",
      entityType: "User",
      entityId: userId,
      action: "IMPERSONATION_START_REJECTED",
      outcome: "DENIED",
      metadataJson: { reasonCode: "NESTED_IMPERSONATION" },
    });
    return NextResponse.json(
      { error: "Eine aktive Impersonation muss zuerst beendet werden." },
      { status: 400 },
    );
  }

  const actorUserId = session.user.actorUserId ?? session.user.id;

  const gate = await assertCanImpersonateTenantMember({
    actorUserId,
    actorTenantId: session.user.activeTenantId,
    targetUserId: userId,
  });

  if (!gate.ok) {
    if (gate.reasonCode && gate.reasonCode !== "SELF_TARGET") {
      await logSecurityAction({
        actorUserId,
        tenantId: session.user.activeTenantId,
        moduleKey: "security",
        entityType: "User",
        entityId: userId,
        action: "IMPERSONATION_START_REJECTED",
        outcome: "DENIED",
        metadataJson: { reasonCode: gate.reasonCode },
      });
    }
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  await logSecurityAction({
    actorUserId,
    tenantId: session.user.activeTenantId,
    moduleKey: "security",
    entityType: "User",
    entityId: userId,
    action: "IMPERSONATION_START_REQUESTED",
    metadataJson: { effectiveUserId: userId },
  });

  const updatedSession = await startImpersonationSession(actorUserId, userId);

  if (
    !updatedSession?.user.isImpersonating ||
    updatedSession.user.actorUserId !== actorUserId ||
    updatedSession.user.effectiveUserId !== userId
  ) {
    return NextResponse.json(
      { error: "Impersonation konnte nicht sicher hergestellt werden." },
      { status: 409 },
    );
  }

  await logSecurityAction({
    actorUserId,
    tenantId: updatedSession.user.activeTenantId,
    moduleKey: "users",
    entityType: "User",
    entityId: userId,
    action: "impersonation_started",
    metadataJson: {
      actorUserId,
      effectiveUserId: userId,
    },
  });

  return NextResponse.json({
    message: "Impersonation gestartet.",
    redirectTo: "/dashboard",
  });
}
