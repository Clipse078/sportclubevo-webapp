import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { loadSceActivityClubGovernancePolicy } from "@/lib/sce/activity-governance/persistence/load-club-governance-policy";
import {
  setClubEventValidatorPool,
  upsertPersonClubEventGovernance,
} from "@/lib/sce/activity-governance/persistence/upsert-person-club-event-governance";

export async function GET() {
  await requirePermission(PERMISSIONS.USERS_MANAGE);
  const tenant = await getActiveTenant();
  if (!tenant) return NextResponse.json({ error: "Tenant fehlt." }, { status: 404 });
  const policy = await loadSceActivityClubGovernancePolicy(tenant.id);
  return NextResponse.json({ policy });
}

export async function PUT(request: Request) {
  await requirePermission(PERMISSIONS.USERS_MANAGE);
  const tenant = await getActiveTenant();
  if (!tenant) return NextResponse.json({ error: "Tenant fehlt." }, { status: 404 });

  const body = (await request.json().catch(() => null)) as {
    personId?: string;
    createEnabled?: boolean;
    publicationAuthority?: "DIRECT_PUBLISH" | "APPROVAL_REQUIRED";
    validatorPersonIds?: string[];
  } | null;

  try {
    if (body?.personId && body.publicationAuthority) {
      await upsertPersonClubEventGovernance({
        tenantId: tenant.id,
        personId: body.personId,
        createEnabled: body.createEnabled ?? true,
        publicationAuthority: body.publicationAuthority,
      });
    }

    if (body?.validatorPersonIds) {
      await setClubEventValidatorPool({
        tenantId: tenant.id,
        validatorPersonIds: body.validatorPersonIds,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Speichern fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const session = await auth();
  void session;

  const policy = await loadSceActivityClubGovernancePolicy(tenant.id);
  return NextResponse.json({ policy });
}
