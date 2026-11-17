/**
 * POST /api/admin/people-access/invite/send
 *
 * Canonical single-recipient invitation with selected roles (not VL preset).
 */

import { NextRequest, NextResponse } from "next/server";
import type { OrgUnitScopeMode } from "@prisma/client";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { normalizePeopleAccessEmail } from "@/lib/admin/people-access/email-normalize";
import { validateInvitationEmailSyntax } from "@/lib/admin/people-access/email-validation";
import {
  assertVlInvitationSendAllowed,
  resolveVlInvitationSendMode,
} from "@/lib/admin/vl-onboarding/vl-invitation-send-policy";
import {
  createLiveVlInvitationTransport,
  createMockVlInvitationTransport,
} from "@/lib/admin/vl-onboarding/vl-invitation-transport";
import { orchestratePeopleAccessInvite } from "@/lib/admin/people-access/people-access-invite-orchestration";
import { normalizeRoleIdsForAssignment } from "@/lib/admin/people-access/wizard-assignable-roles";

export async function POST(request: NextRequest) {
  const access = await requireApiPermission(PERMISSIONS.USERS_INVITE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user?.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Kein Mandanten-Kontext." }, { status: 403 });
  }

  const actorUserId = access.session.user?.effectiveUserId ?? access.session.user?.id;
  if (!actorUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Anfrage-Inhalt." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const confirmLiveSend = b.confirmLiveSend === true;
  const sendCheck = assertVlInvitationSendAllowed(confirmLiveSend);
  const liveExecution = sendCheck.ok;

  const emailRaw = typeof b.email === "string" ? b.email : "";
  const firstName = typeof b.firstName === "string" ? b.firstName.trim() : "";
  const lastName = typeof b.lastName === "string" ? b.lastName.trim() : "";
  const personId = typeof b.personId === "string" ? b.personId : undefined;

  const syntax = validateInvitationEmailSyntax(emailRaw);
  if (!syntax.ok) {
    return NextResponse.json(
      { error: syntax.message ?? "Ungültige E-Mail-Adresse." },
      { status: 400 },
    );
  }
  if (!personId && (!firstName || !lastName)) {
    return NextResponse.json({ error: "Vor- und Nachname sind erforderlich." }, { status: 400 });
  }

  const roleIds = Array.isArray(b.roleIds)
    ? (b.roleIds.filter((id) => typeof id === "string") as string[])
    : [];
  const availableRoles = Array.isArray(b.availableRoles)
    ? (b.availableRoles as Array<{
        id: string;
        key: string;
        name: string;
        isSystem: boolean;
        description: string | null;
      }>)
    : [];
  const clubAdminRoleKey =
    typeof b.clubAdminRoleKey === "string" ? b.clubAdminRoleKey : "club_admin";

  const normalizedRoleIds =
    availableRoles.length > 0
      ? normalizeRoleIdsForAssignment(roleIds, availableRoles, clubAdminRoleKey)
      : Array.from(new Set(roleIds));

  const scopedRoles = Array.isArray(b.scopedRoles)
    ? b.scopedRoles
        .filter(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as { roleId?: unknown }).roleId === "string" &&
            typeof (item as { orgUnitId?: unknown }).orgUnitId === "string",
        )
        .map((item) => {
          const row = item as {
            roleId: string;
            orgUnitId: string;
            scopeMode?: string;
          };
          const roleId =
            availableRoles.length > 0
              ? (normalizeRoleIdsForAssignment([row.roleId], availableRoles, clubAdminRoleKey)[0] ??
                row.roleId)
              : row.roleId;
          return {
            roleId,
            orgUnitId: row.orgUnitId,
            scopeMode: (row.scopeMode === "THIS_ORG_UNIT_AND_DESCENDANTS"
              ? "THIS_ORG_UNIT_AND_DESCENDANTS"
              : "THIS_ORG_UNIT") as OrgUnitScopeMode,
          };
        })
    : [];

  const permissionOverrides = Array.isArray(b.permissionOverrides)
    ? b.permissionOverrides
        .filter(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as { permissionKey?: unknown }).permissionKey === "string" &&
            ((item as { effect?: unknown }).effect === "ALLOW" ||
              (item as { effect?: unknown }).effect === "DENY"),
        )
        .map((item) => {
          const row = item as { permissionKey: string; effect: "ALLOW" | "DENY" };
          return { permissionKey: row.permissionKey, effect: row.effect };
        })
    : [];

  const email = normalizePeopleAccessEmail(emailRaw);
  const transport = liveExecution
    ? createLiveVlInvitationTransport()
    : createMockVlInvitationTransport();

  const result = await orchestratePeopleAccessInvite({
    tenantId,
    actorUserId,
    recipient: { email, firstName, lastName, personId },
    roleIds: normalizedRoleIds,
    scopedRoles,
    permissionOverrides,
    liveExecution,
    confirmLiveSend,
    transport,
    sendPolicyMode: resolveVlInvitationSendMode(),
    sendPolicyError: sendCheck.error,
  });

  if (result.status === "blocked" || result.status === "failed") {
    const status = result.status === "blocked" && !liveExecution ? 200 : 409;
    return NextResponse.json(
      {
        ...result,
        dryRun: !liveExecution,
        error: result.reason ?? result.error,
      },
      { status: result.status === "failed" ? 409 : status },
    );
  }

  return NextResponse.json({
    ...result,
    dryRun: !liveExecution,
    userId: result.userId,
  });
}