/**
 * POST /api/admin/people-access/vl-invite/preview-email
 *
 * Personalized VL invitation email preview (inert link) for the standard wizard.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { PILOT_TENANT_KEY } from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { prisma } from "@/lib/db/prisma";
import { validateInvitationEmailSyntax } from "@/lib/admin/people-access/email-validation";
import { buildVlStandardInvitePersonalizedEmailPreview } from "@/lib/admin/vl-onboarding/vl-standard-invite-personalized-preview";
import { resolveVlInvitationEmailVariant } from "@/lib/admin/vl-onboarding/vl-invitation-email-content";
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

  const variantRaw = (body as { variant?: unknown })?.variant;
  const variant =
    variantRaw === "existing_account" || variantRaw === "new_account"
      ? variantRaw
      : await resolveVlInvitationEmailVariant(email);

  const actorUserId = access.session.user?.effectiveUserId ?? access.session.user?.id;

  const sceLogoAbsoluteUrl = resolveAdminInvitationEmailPreviewLogoSrc(request);

  const preview = await buildVlStandardInvitePersonalizedEmailPreview({
    tenantId,
    recipientEmail: email,
    recipientFirstName: firstName || "…",
    actorUserId,
    variant,
    sceLogoAbsoluteUrl,
  });

  return NextResponse.json(preview);
}