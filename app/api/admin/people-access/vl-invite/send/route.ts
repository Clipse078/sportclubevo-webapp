/**
 * POST /api/admin/people-access/vl-invite/send
 *
 * Canonical single-recipient VL invitation via orchestrateVlInvitationSend (preview mode by default).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { PILOT_TENANT_KEY } from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { prisma } from "@/lib/db/prisma";
import {
  assertVlInvitationSendAllowed,
  resolveVlInvitationSendMode,
} from "@/lib/admin/vl-onboarding/vl-invitation-send-policy";
import {
  createLiveVlInvitationTransport,
  createMockVlInvitationTransport,
} from "@/lib/admin/vl-onboarding/vl-invitation-transport";
import { orchestrateVlInvitationSend } from "@/lib/admin/vl-onboarding/vl-invitation-orchestration";
import { VL_STANDARD_INVITE_SEND_CONTRIBUTOR_ROLE_NOTE } from "@/lib/admin/vl-onboarding/vl-standard-invite-user-copy";
import { normalizePeopleAccessEmail } from "@/lib/admin/people-access/email-normalize";
import { validateInvitationEmailSyntax } from "@/lib/admin/people-access/email-validation";
import { isValidVlOrgFunctionKey } from "@/lib/admin/vl-onboarding/vl-org-function-options";

export async function POST(request: NextRequest) {
  const access = await requireApiPermission(PERMISSIONS.USERS_INVITE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user?.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Kein Mandanten-Kontext." }, { status: 403 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { key: true },
  });
  if (tenant?.key !== PILOT_TENANT_KEY) {
    return NextResponse.json(
      { error: "VL-Onboarding ist für diesen Mandanten nicht freigeschaltet." },
      { status: 403 },
    );
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

  const confirmLiveSend = (body as { confirmLiveSend?: unknown })?.confirmLiveSend === true;
  const sendCheck = assertVlInvitationSendAllowed(confirmLiveSend);
  const liveExecution = sendCheck.ok;

  const emailRaw =
    typeof (body as { email?: unknown })?.email === "string"
      ? (body as { email: string }).email
      : "";
  const firstName =
    typeof (body as { firstName?: unknown })?.firstName === "string"
      ? (body as { firstName: string }).firstName.trim()
      : "";
  const lastName =
    typeof (body as { lastName?: unknown })?.lastName === "string"
      ? (body as { lastName: string }).lastName.trim()
      : "";
  const functionKey =
    typeof (body as { functionKey?: unknown })?.functionKey === "string"
      ? (body as { functionKey: string }).functionKey.trim()
      : "";

  const syntax = validateInvitationEmailSyntax(emailRaw);
  if (!syntax.ok) {
    return NextResponse.json(
      { error: syntax.message ?? "Ungültige E-Mail-Adresse." },
      { status: 400 },
    );
  }
  if (!firstName || !lastName) {
    return NextResponse.json({ error: "Vor- und Nachname sind erforderlich." }, { status: 400 });
  }
  if (!isValidVlOrgFunctionKey(functionKey)) {
    return NextResponse.json({ error: "Organisationsfunktion im Verein auswählen." }, { status: 400 });
  }

  const email = normalizePeopleAccessEmail(emailRaw);
  const validationRows = [
    {
      raw: email,
      normalized: email,
      valid: true,
      duplicate: false,
    },
  ];

  try {
    const transport = liveExecution
      ? createLiveVlInvitationTransport()
      : createMockVlInvitationTransport();

    const result = await orchestrateVlInvitationSend({
      tenantId,
      actorUserId,
      validationRows,
      identities: [{ email, firstName, lastName, functionKey }],
      transport,
      liveExecution,
      sendPolicyError: sendCheck.error,
      sendPolicyMode: resolveVlInvitationSendMode(),
    });

    if (liveExecution && !result.contributorRoleProvisioned) {
      return NextResponse.json(
        {
          ...result,
          sent: false,
          error:
            "Live-Versand blockiert — Mandanten-Rolle «Vereinsleitung (Pilot)» fehlt. Rollen-Sync zuerst ausführen.",
        },
        { status: 409 },
      );
    }

    const row = result.rows[0];
    return NextResponse.json({
      ...result,
      userId: row?.userId,
      permissionKeys: result.contributorRoleSyncDiff.permissionKeys,
      contributorRoleProvisioningNote: result.contributorRoleProvisioned
        ? null
        : VL_STANDARD_INVITE_SEND_CONTRIBUTOR_ROLE_NOTE,
      dryRun: !liveExecution,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Interner Serverfehler.";
    const status = message.includes("FC Allschwil") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}