/**
 * POST /api/admin/people-access/vl-invite/resolve
 *
 * Single-recipient VL resolution for the standard Person hinzufügen wizard.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { PILOT_TENANT_KEY } from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { prisma } from "@/lib/db/prisma";
import { normalizePeopleAccessEmail } from "@/lib/admin/people-access/email-normalize";
import { validateInvitationEmailSyntax } from "@/lib/admin/people-access/email-validation";
import { resolveVlStandardInvitePresentation } from "@/lib/admin/vl-onboarding/vl-standard-invite-resolve-presentation";
import { loadVlInvitationPresetRoleState } from "@/lib/admin/vl-onboarding/vl-invitation-orchestration";
import { FCA_VL_INVITATION_PRESET } from "@/lib/admin/vl-onboarding/fca-vl-invitation-preset";
import { resolveVlInvitationSendMode } from "@/lib/admin/vl-onboarding/vl-invitation-send-policy";
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Anfrage-Inhalt." }, { status: 400 });
  }

  const emailRaw =
    typeof (body as { email?: unknown })?.email === "string"
      ? (body as { email: string }).email
      : "";
  const syntax = validateInvitationEmailSyntax(emailRaw);
  if (!syntax.ok) {
    return NextResponse.json(
      { error: syntax.message ?? "Ungültige E-Mail-Adresse.", code: syntax.code },
      { status: 400 },
    );
  }
  const email = normalizePeopleAccessEmail(emailRaw);

  const functionKey =
    typeof (body as { functionKey?: unknown })?.functionKey === "string"
      ? (body as { functionKey: string }).functionKey.trim()
      : "";

  const [presentation, presetRole] = await Promise.all([
    resolveVlStandardInvitePresentation(tenantId, email),
    loadVlInvitationPresetRoleState(tenantId),
  ]);

  const functionConfirmed = functionKey ? isValidVlOrgFunctionKey(functionKey) : false;

  return NextResponse.json({
    email,
    functionConfirmed,
    presetLabel: FCA_VL_INVITATION_PRESET.presetLabel,
    sendMode: resolveVlInvitationSendMode(),
    contributorRoleProvisioned: presetRole.contributorRoleProvisioned,
    contributorRoleSyncDiff: presetRole.contributorRoleSyncDiff,
    permissionKeys: presetRole.permissionKeys,
    contributorRoleProvisioningNote: presetRole.contributorRoleProvisioned
      ? null
      : "Die Mandanten-Rolle «Vereinsleitung (Pilot)» fehlt noch — Live-Versand blockiert. Rollen-Sync zuerst als Dry-Run prüfen.",
    ...presentation,
    resolved: {
      ...presentation.resolved,
      missingFunction: !functionConfirmed,
    },
  });
}