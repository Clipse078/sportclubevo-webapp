/**
 * GET /api/admin/users/lookup?email=
 *
 * Tenant-scoped person/user lookup for the People & Access wizard.
 * Never leaks cross-tenant identity details.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { lookupPersonByEmailInTenant } from "@/lib/admin/people-access/person-lookup";
import { validateInvitationEmailSyntax } from "@/lib/admin/people-access/email-validation";

export async function GET(request: NextRequest) {
  const access = await requireApiPermission(PERMISSIONS.USERS_INVITE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user?.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Kein Tenant-Kontext." }, { status: 403 });
  }

  const email = request.nextUrl.searchParams.get("email") ?? "";
  if (!email.trim()) {
    return NextResponse.json({ error: "E-Mail ist erforderlich." }, { status: 400 });
  }

  const syntax = validateInvitationEmailSyntax(email);
  if (!syntax.ok) {
    return NextResponse.json(
      {
        error: syntax.message ?? "Ungültige E-Mail-Adresse.",
        code: syntax.code,
        suggestion: syntax.suggestion,
      },
      { status: 400 },
    );
  }

  const result = await lookupPersonByEmailInTenant(tenantId, syntax.normalized);
  return NextResponse.json({ result });
}
