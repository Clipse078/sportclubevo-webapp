/**
 * FCA STAGE — read-only Vereinsleitung access chain diagnosis (no mutations).
 *
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *   npx tsx scripts/fca-vl-access-readonly-diagnosis.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PILOT_TENANT_KEY, PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE } from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { FCA_VEREINSLEITUNG_STRATEGIC_PERMISSION_KEYS } from "@/lib/roles/fca-vereinsleitung-vl-supplements";
import { FCA_VL_CONFIRMED_ROSTER } from "@/lib/roles/fca-vl-reconciliation-registry";
import { userHasVereinsleitungWorkspaceAccess } from "@/lib/permissions/vereinsleitung-workspace-access";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { resolveRuntimeIdentity } from "@/lib/server/runtime-identity";

const STAGE_FINGERPRINT = "acd3b37682911890";

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.STAGE_DB_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[fca-vl-access-readonly-diagnosis] DATABASE_URL required.");
  process.exit(1);
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function diagnoseUser(tenantId: string, userId: string, email: string) {
  const resolver = createEffectivePermissionResolver(prisma);
  const { tenant: permissionKeys } = await resolver.getEffectivePermissions({
    userId,
    tenantId,
  });
  const keySet = new Set(permissionKeys);
  const vlWorkspace = await userHasVereinsleitungWorkspaceAccess(userId, tenantId);

  const roles = await prisma.userRole.findMany({
    where: { userId, tenantId },
    select: {
      role: {
        select: {
          name: true,
          key: true,
          canAccessVereinsleitung: true,
          canAttendVereinsleitungMeetings: true,
        },
      },
    },
  });

  const assignments = await prisma.personAssignment.findMany({
    where: {
      tenantId,
      person: { userId },
      status: "ACTIVE",
    },
    select: { functionKey: true, orgUnit: { select: { name: true, key: true } } },
  });

  return {
    email,
    userId,
    vlWorkspace,
    roles: roles.map((r) => r.role),
    strategic: Object.fromEntries(
      FCA_VEREINSLEITUNG_STRATEGIC_PERMISSION_KEYS.map((k) => [k, keySet.has(k)]),
    ),
    personAssignments: assignments,
  };
}

async function main() {
  const identity = resolveRuntimeIdentity(process.env);
  const tenant = await prisma.tenant.findUnique({
    where: { key: PILOT_TENANT_KEY },
    select: { id: true, key: true },
  });
  if (!tenant) {
    console.log(JSON.stringify({ error: "tenant_not_found" }));
    return;
  }

  const rows = [];
  for (const target of FCA_VL_CONFIRMED_ROSTER) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: target.email, mode: "insensitive" } },
      select: { id: true, email: true, isActive: true },
    });
    if (!user) {
      rows.push({ target, error: "user_not_found" });
      continue;
    }
    const membership = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant.id, userId: user.id },
      select: { isActive: true },
    });
    rows.push({
      target,
      membershipActive: membership?.isActive ?? false,
      diagnosis: await diagnoseUser(tenant.id, user.id, user.email),
    });
  }

  console.log(
    JSON.stringify(
      {
        fingerprint: identity.databaseFingerprint,
        expectedFingerprint: STAGE_FINGERPRINT,
        dataEnvironment: identity.dataEnvironment,
        tenant: tenant.key,
        presidentRoleTemplate: PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE.name,
        roster: rows,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });