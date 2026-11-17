/**
 * POST /api/admin/vl-invitations/resolve
 *
 * Validate pasted emails and resolve tenant-scoped invitation row state.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  parseAndValidateBulkInvitationEmails,
  validNormalizedBulkEmails,
} from "@/lib/admin/vl-onboarding/bulk-invitation-emails";
import { resolveVlInvitationRows } from "@/lib/admin/vl-onboarding/resolve-vl-invitation-rows";
import { loadVlInvitationPresetRoleState } from "@/lib/admin/vl-onboarding/vl-invitation-orchestration";
import { PILOT_TENANT_KEY } from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { prisma } from "@/lib/db/prisma";
import { resolveVlInvitationSendMode } from "@/lib/admin/vl-onboarding/vl-invitation-send-policy";

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
      { error: "VL-Einladungs-Workspace ist für diesen Mandanten nicht freigeschaltet." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Anfrage-Inhalt." }, { status: 400 });
  }

  const raw =
    typeof (body as { raw?: unknown })?.raw === "string"
      ? (body as { raw: string }).raw
      : "";
  const emailsInput = Array.isArray((body as { emails?: unknown })?.emails)
    ? ((body as { emails: unknown[] }).emails.filter((e) => typeof e === "string") as string[])
    : null;

  const validationRows = raw
    ? parseAndValidateBulkInvitationEmails(raw)
    : (emailsInput ?? []).map((email) => ({
        raw: email,
        normalized: email.toLowerCase(),
        valid: true,
        duplicate: false,
      }));

  const emails = validNormalizedBulkEmails(validationRows);
  const [resolved, presetRole] = await Promise.all([
    resolveVlInvitationRows(tenantId, emails),
    loadVlInvitationPresetRoleState(tenantId),
  ]);

  return NextResponse.json({
    validationRows,
    resolved,
    sendMode: resolveVlInvitationSendMode(),
    presetLabel: "Vereinsleitung (Pilot) — Mitwirkung",
    contributorRoleProvisioned: presetRole.contributorRoleProvisioned,
    contributorRoleSyncDiff: presetRole.contributorRoleSyncDiff,
    permissionKeys: presetRole.permissionKeys,
    contributorRoleProvisioningNote: presetRole.contributorRoleProvisioned
      ? null
      : "Die Mandanten-Rolle «Vereinsleitung (Pilot)» fehlt noch — Modul-Vorschau basiert auf der Vorlage, nicht auf persistierten Rechten.",
  });
}