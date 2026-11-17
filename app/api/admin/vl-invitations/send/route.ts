/**
 * POST /api/admin/vl-invitations/send
 *
 * Explicit send endpoint — blocked by default (dry-run). Never queues live mail in this package.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  assertVlInvitationSendAllowed,
  mockInvitationTransport,
} from "@/lib/admin/vl-onboarding/vl-invitation-send-policy";
import { buildInvitationEmail } from "@/lib/email/templates/invitation";
import { INVITATION_EXPIRY_HOURS } from "@/lib/users/mutations";
import { INVITATION_PREVIEW_SAMPLE_ACCEPT_URL } from "@/lib/email/templates/invitation-preview-samples";
import { parseAndValidateBulkInvitationEmails, validNormalizedBulkEmails } from "@/lib/admin/vl-onboarding/bulk-invitation-emails";
import { resolveVlInvitationRows } from "@/lib/admin/vl-onboarding/resolve-vl-invitation-rows";

export async function POST(request: NextRequest) {
  const access = await requireApiPermission(PERMISSIONS.USERS_INVITE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user?.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Kein Mandanten-Kontext." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Anfrage-Inhalt." }, { status: 400 });
  }

  const confirmLiveSend = (body as { confirmLiveSend?: unknown })?.confirmLiveSend === true;
  const sendCheck = assertVlInvitationSendAllowed(confirmLiveSend);
  if (!sendCheck.ok) {
    const raw = typeof (body as { raw?: unknown })?.raw === "string" ? (body as { raw: string }).raw : "";
    const validationRows = raw ? parseAndValidateBulkInvitationEmails(raw) : [];
    const emails = validNormalizedBulkEmails(validationRows);
    const resolved = await resolveVlInvitationRows(tenantId, emails);

    const mockResults = emails.map((email) => {
      const sample = buildInvitationEmail({
        inviteUrl: INVITATION_PREVIEW_SAMPLE_ACCEPT_URL,
        recipientEmail: email,
        recipientFirstName: "…",
        tenantName: "FC Allschwil",
        expiryHours: INVITATION_EXPIRY_HOURS,
        variant: "new_account",
        accessSummary: "Vereinsleitung — Vereinsentwicklung",
      });
      return mockInvitationTransport({ recipientEmail: email, subject: sample.subject });
    });

    return NextResponse.json({
      sent: false,
      mode: sendCheck.mode,
      error: sendCheck.error,
      validationRows,
      resolved,
      transport: mockResults,
      preservedDraft: true,
    });
  }

  return NextResponse.json(
    { error: "Live-Versand ist in diesem Release nicht aktiviert." },
    { status: 501 },
  );
}