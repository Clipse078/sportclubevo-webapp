/**
 * POST /api/admin/people-access/invite/preview-email
 *
 * Inert personalized invitation email for the standard Person hinzufügen wizard.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { validateInvitationEmailSyntax } from "@/lib/admin/people-access/email-validation";
import { buildPeopleAccessInviteEmailPreview } from "@/lib/admin/people-access/people-access-invite-email-preview";
import { resolveAdminInvitationEmailPreviewLogoSrc } from "@/lib/email/admin-invitation-email-preview-logo-src";

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

  const email =
    typeof (body as { email?: unknown })?.email === "string"
      ? (body as { email: string }).email.trim()
      : "";
  const firstName =
    typeof (body as { firstName?: unknown })?.firstName === "string"
      ? (body as { firstName: string }).firstName.trim()
      : "";

  const syntax = validateInvitationEmailSyntax(email);
  if (!syntax.ok) {
    return NextResponse.json(
      { error: syntax.message ?? "Ungültige E-Mail-Adresse." },
      { status: 400 },
    );
  }

  const actorUserId = access.session.user?.effectiveUserId ?? access.session.user?.id;

  const preview = await buildPeopleAccessInviteEmailPreview({
    tenantId,
    recipientEmail: email,
    recipientFirstName: firstName || "…",
    actorUserId,
    sceLogoAbsoluteUrl: resolveAdminInvitationEmailPreviewLogoSrc(request),
  });

  return NextResponse.json(preview);
}