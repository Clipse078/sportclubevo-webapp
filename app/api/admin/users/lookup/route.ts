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

  const result = await lookupPersonByEmailInTenant(tenantId, email);
  return NextResponse.json({ result });
}
