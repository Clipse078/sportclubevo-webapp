import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { prisma } from "@/lib/db/prisma";
import { loadSceActivityClubGovernancePolicy } from "@/lib/sce/activity-governance/persistence/load-club-governance-policy";
import {
  setTournamentValidatorPool,
  upsertPersonTournamentGovernance,
} from "@/lib/sce/activity-governance/persistence/upsert-person-tournament-governance";
import type { SceActivityClubGovernancePolicy } from "@/lib/sce/activity-governance/types";

const GOVERNANCE_MANAGE_PERMISSIONS = [
  PERMISSIONS.USERS_MANAGE,
  PERMISSIONS.USERS_MANAGE_MEMBERSHIPS,
] as const;

async function buildTournamentGovernancePayload(tenantId: string, policy: SceActivityClubGovernancePolicy) {
  const tournamentPolicy = policy.activityTypes.find((row) => row.activityType === "TOURNAMENT");
  const validatorPersonIds = tournamentPolicy?.validatorPersonIds ?? [];
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
  await requireAnyPermission([...GOVERNANCE_MANAGE_PERMISSIONS]);
  const tenant = await getActiveTenant();
  if (!tenant) return NextResponse.json({ error: "Tenant fehlt." }, { status: 404 });
  const policy = await loadSceActivityClubGovernancePolicy(tenant.id);
  return NextResponse.json(await buildTournamentGovernancePayload(tenant.id, policy));
}

export async function PUT(request: Request) {
  await requireAnyPermission([...GOVERNANCE_MANAGE_PERMISSIONS]);
  const tenant = await getActiveTenant();
  if (!tenant) return NextResponse.json({ error: "Tenant fehlt." }, { status: 404 });

  const body = (await request.json().catch(() => null)) as {
    personId?: string;
    createEnabled?: boolean;
    publicationAuthority?: "DIRECT_PUBLISH" | "APPROVAL_REQUIRED";
    validatorPersonIds?: string[];
  } | null;

  try {
    if (body?.validatorPersonIds) {
      await setTournamentValidatorPool({
        tenantId: tenant.id,
        validatorPersonIds: body.validatorPersonIds,
      });
    }

    if (body?.personId && body.publicationAuthority) {
      await upsertPersonTournamentGovernance({
        tenantId: tenant.id,
        personId: body.personId,
        createEnabled: body.createEnabled !== false,
        publicationAuthority: body.publicationAuthority,
      });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    const policy = await loadSceActivityClubGovernancePolicy(tenant.id);
    return NextResponse.json(await buildTournamentGovernancePayload(tenant.id, policy));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Speichern fehlgeschlagen." },
      { status: 400 },
    );
  }
}
