/**
 * POST /api/admin/vl-invitations/prepare
 *
 * Dry-run preparation for PO-confirmed FC Allschwil VL invitees (no sends, no tokens).
 */

import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  FCA_VL_INVITATION_CONFIRMED_EMAILS,
  FCA_VL_INVITATION_EXCLUDED_FROM_BULK_PREPARE,
} from "@/lib/admin/vl-onboarding/fca-vl-confirmed-invitee-emails";
import {
  resolveVlInvitationPresetRoleState,
  resolveVlInvitationRows,
} from "@/lib/admin/vl-onboarding/resolve-vl-invitation-rows";
import { FCA_VL_INVITATION_PRESET } from "@/lib/admin/vl-onboarding/fca-vl-invitation-preset";
import { resolveVlInvitationSendMode } from "@/lib/admin/vl-onboarding/vl-invitation-send-policy";
import { PILOT_TENANT_KEY } from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { prisma } from "@/lib/db/prisma";

export async function POST() {
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
    select: { key: true, name: true },
  });
  if (tenant?.key !== PILOT_TENANT_KEY) {
    return NextResponse.json(
      { error: "VL-Vorbereitung nur für FC Allschwil." },
      { status: 403 },
    );
  }

  const excluded = new Set(
    FCA_VL_INVITATION_EXCLUDED_FROM_BULK_PREPARE.map((e) => e.toLowerCase()),
  );
  const emails = FCA_VL_INVITATION_CONFIRMED_EMAILS.filter(
    (e) => !excluded.has(e.toLowerCase()),
  );

  const [resolved, presetRole] = await Promise.all([
    resolveVlInvitationRows(tenantId, emails),
    resolveVlInvitationPresetRoleState(tenantId),
  ]);

  return NextResponse.json({
    mode: resolveVlInvitationSendMode(),
    tenant: { key: tenant.key, name: tenant.name },
    preset: FCA_VL_INVITATION_PRESET,
    contributorRoleProvisioned: presetRole.contributorRoleProvisioned,
    contributorRoleProvisioningNote: presetRole.contributorRoleProvisioned
      ? null
      : "Mandanten-Rolle fehlt — vor Live-Versand sync-fca-vereinsleitung-contributor-pilot-role (STAGE) ausführen.",
    recipients: resolved,
    missingIdentityFields: resolved.map((r) => ({
      email: r.email,
      needsDisplayName: !r.displayName,
      needsFunction: Boolean(r.missingFunction),
    })),
    note:
      "Dry-Run — keine Einladungs-Tokens, keine E-Mails. Patrick.scotton wurde bewusst ausgeschlossen (bereits reconciled).",
  });
}