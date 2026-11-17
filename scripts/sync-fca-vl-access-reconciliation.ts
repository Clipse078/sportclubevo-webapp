/**
 * FCA STAGE — idempotent Vereinsleitung access reconciliation (confirmed roster only).
 *
 *   npx tsx scripts/sync-fca-vl-access-reconciliation.ts
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *   SCE_OPERATION_AUTHORIZATION=sync-fca-vl-access-reconciliation:stage \
 *   APPLY_FCA_VL_ACCESS_RECONCILIATION=true npx tsx scripts/sync-fca-vl-access-reconciliation.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import {
  PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE,
  PILOT_TENANT_KEY,
} from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import {
  FCA_VEREINSLEITUNG_STRATEGIC_PERMISSION_KEYS,
  FCA_VL_ROLE_CAPABILITY_FLAGS,
} from "@/lib/roles/fca-vereinsleitung-vl-supplements";
import { FCA_VL_CONFIRMED_ROSTER } from "@/lib/roles/fca-vl-reconciliation-registry";
import { writeAuditRecord } from "@/lib/audit/audit-record";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";
import { resolveRuntimeIdentity } from "@/lib/server/runtime-identity";
import { userHasVereinsleitungWorkspaceAccess } from "@/lib/permissions/vereinsleitung-workspace-access";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";

const DRY_RUN = process.env.APPLY_FCA_VL_ACCESS_RECONCILIATION !== "true";
const STAGE_FINGERPRINT = "acd3b37682911890";

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[sync-fca-vl-access-reconciliation] DATABASE_URL is required.");
  process.exit(1);
}

if (!DRY_RUN) {
  const identity = resolveRuntimeIdentity(process.env);
  if (identity.dataEnvironment !== "STAGE") {
    throw new Error(
      `[sync-fca-vl-access-reconciliation] SCE_DATA_ENVIRONMENT must be STAGE (got ${identity.dataEnvironment}).`,
    );
  }
  if (identity.databaseFingerprint !== STAGE_FINGERPRINT) {
    throw new Error(
      `[sync-fca-vl-access-reconciliation] database fingerprint mismatch: expected ${STAGE_FINGERPRINT}, got ${identity.databaseFingerprint ?? "null"}.`,
    );
  }
  assertOperationalMutationAllowed({
    operationId: "sync-fca-vl-access-reconciliation",
    databaseUrl: connectionString,
    explicitIntent: true,
    allowedRemoteEnvironments: ["stage"],
  });
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type PlannedChange =
  | { kind: "role_flags"; roleId: string; before: object; after: object }
  | { kind: "role_permission_add"; roleId: string; permissionKey: string }
  | { kind: "user_role_assign"; userId: string; roleId: string }
  | { kind: "person_assignment_upsert"; personId: string; orgUnitId: string; functionKey: string };

async function resolveTenantRole(
  tenantId: string,
  match: { name?: string; key?: string },
) {
  return prisma.role.findFirst({
    where: {
      tenantId,
      isArchived: false,
      OR: [
        ...(match.key ? [{ key: match.key }] : []),
        ...(match.name ? [{ name: match.name }] : []),
      ],
    },
    include: {
      rolePermissions: { select: { permission: { select: { key: true } } } },
    },
  });
}

async function planForTarget(
  tenantId: string,
  target: (typeof FCA_VL_CONFIRMED_ROSTER)[number],
): Promise<{ email: string; changes: PlannedChange[]; skipReason?: string }> {
  const changes: PlannedChange[] = [];

  const user = await prisma.user.findFirst({
    where: { email: { equals: target.email, mode: "insensitive" } },
    select: { id: true, email: true, isActive: true },
  });
  if (!user) return { email: target.email, changes: [], skipReason: "user_not_found" };

  const membership = await prisma.tenantMembership.findFirst({
    where: { tenantId, userId: user.id, isActive: true },
    select: { id: true },
  });
  if (!membership) return { email: target.email, changes: [], skipReason: "inactive_membership" };

  const person = await prisma.person.findFirst({
    where: {
      tenantId,
      OR: [
        { userId: user.id },
        ...(target.personId ? [{ id: target.personId }] : []),
      ],
    },
    select: { id: true },
  });
  if (!person) return { email: target.email, changes: [], skipReason: "person_not_found" };

  const role = await resolveTenantRole(tenantId, target.tenantRoleMatch);
  if (!role) return { email: target.email, changes: [], skipReason: "role_not_found" };

  const targetPermissionKeys = [...PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE.permissionKeys];
  const currentKeys = new Set(role.rolePermissions.map((rp) => rp.permission.key));

  const needsFlags =
    !role.canAccessVereinsleitung || !role.canAttendVereinsleitungMeetings;
  if (needsFlags) {
    changes.push({
      kind: "role_flags",
      roleId: role.id,
      before: {
        canAccessVereinsleitung: role.canAccessVereinsleitung,
        canAttendVereinsleitungMeetings: role.canAttendVereinsleitungMeetings,
      },
      after: { ...FCA_VL_ROLE_CAPABILITY_FLAGS },
    });
  }

  for (const permissionKey of targetPermissionKeys) {
    if (!currentKeys.has(permissionKey)) {
      changes.push({ kind: "role_permission_add", roleId: role.id, permissionKey });
    }
  }

  const hasUserRole = await prisma.userRole.findFirst({
    where: { userId: user.id, tenantId, roleId: role.id },
    select: { id: true },
  });
  if (!hasUserRole) {
    changes.push({ kind: "user_role_assign", userId: user.id, roleId: role.id });
  }

  const orgUnit = await prisma.orgUnit.findFirst({
    where: { tenantId, key: target.orgUnitKey },
    select: { id: true, name: true, key: true },
  });
  if (orgUnit) {
    const existingAssignment = await prisma.personAssignment.findFirst({
      where: {
        tenantId,
        personId: person.id,
        orgUnitId: orgUnit.id,
        status: "ACTIVE",
        functionKey: target.functionKey,
      },
      select: { id: true },
    });
    if (!existingAssignment) {
      changes.push({
        kind: "person_assignment_upsert",
        personId: person.id,
        orgUnitId: orgUnit.id,
        functionKey: target.functionKey,
      });
    }
  }

  return { email: target.email, changes };
}

async function applyChanges(tenantId: string, planned: PlannedChange[]) {
  await prisma.$transaction(async (tx) => {
    for (const change of planned) {
      if (change.kind === "role_flags") {
        await tx.role.update({
          where: { id: change.roleId },
          data: { ...FCA_VL_ROLE_CAPABILITY_FLAGS },
        });
      } else if (change.kind === "role_permission_add") {
        const permission = await tx.permission.findUnique({
          where: { key: change.permissionKey },
          select: { id: true },
        });
        if (!permission) continue;
        await tx.rolePermission.upsert({
          where: {
            roleId_permissionId: { roleId: change.roleId, permissionId: permission.id },
          },
          update: {},
          create: { roleId: change.roleId, permissionId: permission.id },
        });
      } else if (change.kind === "user_role_assign") {
        await tx.userRole.create({
          data: {
            userId: change.userId,
            roleId: change.roleId,
            tenantId,
          },
        });
      } else if (change.kind === "person_assignment_upsert") {
        await tx.personAssignment.create({
          data: {
            tenantId,
            personId: change.personId,
            orgUnitId: change.orgUnitId,
            functionKey: change.functionKey,
            status: "ACTIVE",
          },
        });
      }
    }

    await writeAuditRecord(tx, {
      tenantId,
      moduleKey: "USERS",
      entityType: "Tenant",
      entityId: tenantId,
      action: "FCA_VL_ACCESS_RECONCILIATION",
      metadataJson: {
        operationId: "sync-fca-vl-access-reconciliation",
        changeCount: planned.length,
      },
    });
  });
}

async function verifyAfter(tenantId: string, userId: string) {
  const resolver = createEffectivePermissionResolver(prisma);
  const { tenant: keys } = await resolver.getEffectivePermissions({ userId, tenantId });
  const keySet = new Set(keys);
  return {
    vlWorkspace: await userHasVereinsleitungWorkspaceAccess(userId, tenantId),
    strategic: Object.fromEntries(
      FCA_VEREINSLEITUNG_STRATEGIC_PERMISSION_KEYS.map((k) => [k, keySet.has(k)]),
    ),
  };
}

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { key: PILOT_TENANT_KEY },
    select: { id: true, key: true, name: true },
  });
  if (!tenant) {
    console.error("Tenant fc-allschwil not found.");
    process.exit(1);
  }

  const plans = [];
  for (const target of FCA_VL_CONFIRMED_ROSTER) {
    plans.push(await planForTarget(tenant.id, target));
  }

  const flatChanges = plans.flatMap((p) => p.changes);

  console.log(
    JSON.stringify(
      {
        mode: DRY_RUN ? "DRY_RUN" : "APPLY",
        tenant: tenant.key,
        rosterSize: FCA_VL_CONFIRMED_ROSTER.length,
        plans,
        totalChanges: flatChanges.length,
      },
      null,
      2,
    ),
  );

  if (DRY_RUN || flatChanges.length === 0) {
    if (DRY_RUN) {
      console.log("\nDRY RUN — apply with APPLY_FCA_VL_ACCESS_RECONCILIATION=true\n");
    }
    return;
  }

  await applyChanges(tenant.id, flatChanges);

  const postVerify = [];
  for (const target of FCA_VL_CONFIRMED_ROSTER) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: target.email, mode: "insensitive" } },
      select: { id: true },
    });
    if (user) {
      postVerify.push({
        email: target.email,
        effective: await verifyAfter(tenant.id, user.id),
      });
    }
  }

  console.log(JSON.stringify({ applied: true, postVerify }, null, 2));
}

main()
  .catch((err) => {
    console.error("[sync-fca-vl-access-reconciliation] FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });