import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const CLUB_EVENT_GOVERNANCE_MANAGE_PERMISSIONS = [
  PERMISSIONS.USERS_MANAGE,
  PERMISSIONS.USERS_MANAGE_MEMBERSHIPS,
] as const;
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { prisma } from "@/lib/db/prisma";
import { loadSceActivityClubGovernancePolicy } from "@/lib/sce/activity-governance/persistence/load-club-governance-policy";
import {
  setClubEventValidatorPool,
  upsertPersonClubEventGovernance,
} from "@/lib/sce/activity-governance/persistence/upsert-person-club-event-governance";
import type { SceActivityClubGovernancePolicy } from "@/lib/sce/activity-governance/types";

async function buildClubEventGovernancePayload(tenantId: string, policy: SceActivityClubGovernancePolicy) {
  const clubEventPolicy = policy.activityTypes.find((row) => row.activityType === "CLUB_EVENT");
  const validatorPersonIds = clubEventPolicy?.validatorPersonIds ?? [];
  const validatorPeople =
    validatorPersonIds.length === 0
      ? []
      : (
          await prisma.person.findMany({
            where: { tenantId, id: { in: [...validatorPersonIds] } },
            select: { id: true, firstName: true, lastName: true },
          })
        ).map((person) => ({
          personId: person.id,
          displayName: `${person.firstName} ${person.lastName}`.trim(),
        }));

  return { policy, validatorPeople };
}

export async function GET() {
  await requireAnyPermission([...CLUB_EVENT_GOVERNANCE_MANAGE_PERMISSIONS]);
  const tenant = await getActiveTenant();
  if (!tenant) return NextResponse.json({ error: "Tenant fehlt." }, { status: 404 });
  const policy = await loadSceActivityClubGovernancePolicy(tenant.id);
  return NextResponse.json(await buildClubEventGovernancePayload(tenant.id, policy));
}

export async function PUT(request: Request) {
  await requireAnyPermission([...CLUB_EVENT_GOVERNANCE_MANAGE_PERMISSIONS]);
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
  return NextResponse.json(await buildClubEventGovernancePayload(tenant.id, policy));
}
