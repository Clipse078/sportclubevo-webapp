import { NextRequest, NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { OperationalDurationPolicyValidationError } from "@/lib/operational/validation";
import {
  getTenantOperationalDurationPolicy,
  upsertTenantOperationalDurationPolicy,
} from "@/lib/operational/tenant-operational-duration-policy-service";

export async function GET() {
  const auth = await requireApiPermission(PERMISSIONS.FACILITIES_VIEW);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const tenantId = auth.session.user?.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant required" }, { status: 400 });
  }
  const policy = await getTenantOperationalDurationPolicy(tenantId);
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
    const body = (await req.json()) as {
      defaultMatchDurationMinutes?: number;
      defaultTrainingDurationMinutes?: number;
      defaultTournamentDurationMinutes?: number;
    };
    if (
      body.defaultMatchDurationMinutes == null ||
      body.defaultTrainingDurationMinutes == null ||
      body.defaultTournamentDurationMinutes == null
    ) {
      return NextResponse.json(
        { error: "Spiele-, Trainings- und Turnier-Standarddauer sind erforderlich." },
        { status: 400 },
      );
    }
    const policy = await upsertTenantOperationalDurationPolicy(tenantId, {
      defaultMatchDurationMinutes: body.defaultMatchDurationMinutes,
      defaultTrainingDurationMinutes: body.defaultTrainingDurationMinutes,
      defaultTournamentDurationMinutes: body.defaultTournamentDurationMinutes,
    });
    return NextResponse.json({ policy });
  } catch (err) {
    if (err instanceof OperationalDurationPolicyValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Speichern fehlgeschlagen" }, { status: 500 });
  }
}
