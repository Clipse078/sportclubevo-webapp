/**
 * POST /api/admin/vl-invitations/preview-email
 *
 * Administrator-visible invitation email preview (inert sample link).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildInvitationEmail } from "@/lib/email/templates/invitation";
import { INVITATION_EXPIRY_HOURS } from "@/lib/users/mutations";
import {
  INVITATION_PREVIEW_SAMPLE_ACCEPT_URL,
  INVITATION_PREVIEW_SAMPLE_FIRST_NAME_EXISTING,
  INVITATION_PREVIEW_SAMPLE_FIRST_NAME_NEW,
  INVITATION_PREVIEW_SAMPLE_INVITER,
  INVITATION_PREVIEW_SAMPLE_RECIPIENT,
  INVITATION_PREVIEW_SAMPLE_TENANT,
} from "@/lib/email/templates/invitation-preview-samples";
import { resolveSecurityLinkBaseUrl } from "@/lib/server/security-link-url";

export async function POST(request: NextRequest) {
  const access = await requireApiPermission(PERMISSIONS.USERS_INVITE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const variantRaw = (body as { variant?: unknown })?.variant;
  const variant =
    variantRaw === "existing_account" ? ("existing_account" as const) : ("new_account" as const);

  let appBaseUrl: string | undefined;
  try {
    appBaseUrl = resolveSecurityLinkBaseUrl().toString().replace(/\/$/, "");
  } catch {
    appBaseUrl = "https://fcallschwil.sportclubevo.com";
  }

  const inviterName =
    typeof (body as { inviterDisplayName?: unknown })?.inviterDisplayName === "string"
      ? (body as { inviterDisplayName: string }).inviterDisplayName.trim()
      : INVITATION_PREVIEW_SAMPLE_INVITER;

  const firstName =
    variant === "existing_account"
      ? INVITATION_PREVIEW_SAMPLE_FIRST_NAME_EXISTING
      : INVITATION_PREVIEW_SAMPLE_FIRST_NAME_NEW;

  const email = buildInvitationEmail({
    inviteUrl: INVITATION_PREVIEW_SAMPLE_ACCEPT_URL,
    recipientEmail: INVITATION_PREVIEW_SAMPLE_RECIPIENT,
    recipientFirstName: firstName,
    tenantName: INVITATION_PREVIEW_SAMPLE_TENANT,
    inviterDisplayName: inviterName,
    expiryHours: INVITATION_EXPIRY_HOURS,
    appBaseUrl,
    variant,
    accessSummary: "Vereinsleitung — Vereinsentwicklung mitgestalten",
  });

  return NextResponse.json({
    preview: true,
    variant,
    subject: email.subject,
    html: email.html,
    text: email.text,
    sampleAcceptUrl: INVITATION_PREVIEW_SAMPLE_ACCEPT_URL,
    disclaimer:
      "Vorschau mit Beispieldaten. Der Link ist inert — kein gültiges Einladungs-Token.",
  });
}