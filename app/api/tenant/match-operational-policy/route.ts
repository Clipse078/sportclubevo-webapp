import { NextRequest, NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { MatchOperationalPolicyValidationError } from "@/lib/match/validation";
import {
  getTenantMatchOperationalPolicy,
  upsertTenantMatchOperationalPolicy,
} from "@/lib/match/tenant-operational-policy-service";

export async function GET() {
  const auth = await requireApiPermission(PERMISSIONS.FACILITIES_VIEW);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const tenantId = auth.session.user?.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant required" }, { status: 400 });
  }
  const policy = await getTenantMatchOperationalPolicy(tenantId);
  return NextResponse.json({ policy });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireApiPermission(PERMISSIONS.FACILITIES_MANAGE);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const tenantId = auth.session.user?.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant required" }, { status: 400 });
  }

  try {
    const body = (await req.json()) as { defaultMatchDurationMinutes?: number };
    const policy = await upsertTenantMatchOperationalPolicy(
      tenantId,
      body.defaultMatchDurationMinutes as number,
    );
    return NextResponse.json({ policy });
  } catch (err) {
    if (err instanceof MatchOperationalPolicyValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Speichern fehlgeschlagen" }, { status: 500 });
  }
}
