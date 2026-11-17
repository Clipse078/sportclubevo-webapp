/**
 * FCA STAGE — idempotent Vereinsleitung (Pilot) contributor role sync.
 *
 *   npx tsx scripts/sync-fca-vereinsleitung-contributor-pilot-role.ts
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *   SCE_OPERATION_AUTHORIZATION=sync-fca-vereinsleitung-contributor-pilot-role:stage \
 *   APPLY_FCA_VL_CONTRIBUTOR_PILOT_ROLE_SYNC=true npx tsx scripts/sync-fca-vereinsleitung-contributor-pilot-role.ts
 *
 * Creates or updates tenant-scoped role `pilot_vereinsleitung_mitglied` — never platform-wide.
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import {
  FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE,
  PILOT_TENANT_KEY,
} from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { FCA_VL_ROLE_CAPABILITY_FLAGS } from "@/lib/roles/fca-vereinsleitung-vl-supplements";
import {
  buildVlContributorRoleScopeRepairPlan,
  type VlContributorRoleSnapshot,
} from "@/lib/admin/vl-onboarding/vl-contributor-role-sync-diff";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";
import { resolveRuntimeIdentity } from "@/lib/server/runtime-identity";

const DRY_RUN = process.env.APPLY_FCA_VL_CONTRIBUTOR_PILOT_ROLE_SYNC !== "true";
const STAGE_FINGERPRINT = "acd3b37682911890";

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[sync-fca-vereinsleitung-contributor-pilot-role] DATABASE_URL is required.");
  process.exit(1);
}

if (!DRY_RUN) {
  const identity = resolveRuntimeIdentity(process.env);
  if (identity.dataEnvironment !== "STAGE") {
    throw new Error(
      `[sync-fca-vereinsleitung-contributor-pilot-role] SCE_DATA_ENVIRONMENT must be STAGE (got ${identity.dataEnvironment}).`,
    );
  }
  if (identity.databaseFingerprint !== STAGE_FINGERPRINT) {
    throw new Error(
      `[sync-fca-vereinsleitung-contributor-pilot-role] database fingerprint mismatch: expected ${STAGE_FINGERPRINT}, got ${identity.databaseFingerprint ?? "null"}.`,
    );
  }
  assertOperationalMutationAllowed({
    operationId: "sync-fca-vereinsleitung-contributor-pilot-role",
    databaseUrl: connectionString,
    explicitIntent: true,
    allowedRemoteEnvironments: ["stage"],
  });
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { key: PILOT_TENANT_KEY },
      select: { id: true, key: true, name: true },
    });
    if (!tenant) {
      console.error(`Tenant ${PILOT_TENANT_KEY} not found — skip.`);
      process.exit(1);
    }

    let role = await prisma.role.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [
          { key: FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.roleKey },
          { name: FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.name },
        ],
      },
      select: {
        id: true,
        key: true,
        name: true,
        scope: true,
        tenantId: true,
        canAccessVereinsleitung: true,
        canAttendVereinsleitungMeetings: true,
        rolePermissions: { select: { permission: { select: { key: true } } } },
      },
    });

    const duplicateTenantScopedRole = role
      ? await prisma.role.findFirst({
          where: {
            tenantId: tenant.id,
            scope: "TENANT",
            key: FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.roleKey,
            id: { not: role.id },
          },
          select: { id: true },
        })
      : null;

    const targetKeys = [...FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.permissionKeys];
    const currentKeys = role?.rolePermissions.map((rp) => rp.permission.key) ?? [];
    const missing = targetKeys.filter((k) => !currentKeys.includes(k));
    const roleMissing = role === null;

    console.log(`Mode: ${DRY_RUN ? "DRY_RUN (review only)" : "APPLY"}`);
    console.log(`Tenant: ${tenant.key} (${tenant.id})`);
    if (roleMissing) {
      console.log(
        `Role: MISSING — would create "${FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.name}" (key ${FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.roleKey})`,
      );
    } else if (role) {
      console.log(`Role: ${role.name} (${role.key ?? role.id})`);
      console.log(`Current keys (${currentKeys.length}): ${currentKeys.sort().join(", ")}`);
    }
    console.log(`Target keys (${targetKeys.length}): ${targetKeys.sort().join(", ")}`);
    console.log(`Missing to add (${missing.length}): ${missing.join(", ") || "—"}`);

    const needsVlFlags =
      role !== null &&
      (!role.canAccessVereinsleitung || !role.canAttendVereinsleitungMeetings);
    if (roleMissing || needsVlFlags) {
      console.log(
        `VL workspace gates: canAccessVereinsleitung=${role?.canAccessVereinsleitung ?? false} → true, canAttendVereinsleitungMeetings=${role?.canAttendVereinsleitungMeetings ?? false} → true`,
      );
    }

    const orgUnit = await prisma.orgUnit.findFirst({
      where: { tenantId: tenant.id, key: "vereinsleitung" },
      select: { id: true, name: true, key: true },
    });
    console.log(
      `VL org unit: ${orgUnit ? `${orgUnit.name} (${orgUnit.key})` : "MISSING — assignment strategy blocked until org unit exists"}`,
    );

    const assignmentsWouldUse = await prisma.userRole.count({
      where: {
        tenantId: tenant.id,
        role: role
          ? { id: role.id }
          : { key: FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.roleKey },
      },
    });
    console.log(`Existing memberships with contributor role: ${roleMissing ? 0 : assignmentsWouldUse}`);

    const snapshot: VlContributorRoleSnapshot = role
      ? {
          id: role.id,
          scope: role.scope,
          tenantId: role.tenantId,
          permissionKeys: currentKeys,
          canAccessVereinsleitung: role.canAccessVereinsleitung,
          canAttendVereinsleitungMeetings: role.canAttendVereinsleitungMeetings,
          assignmentCount: assignmentsWouldUse,
          duplicateTenantScopedRoleId: duplicateTenantScopedRole?.id ?? null,
        }
      : null;

    const repairPlan = buildVlContributorRoleScopeRepairPlan(snapshot);
    console.log("\n--- Contributor role scope repair plan (read-only) ---");
    console.log(JSON.stringify(repairPlan, null, 2));
    console.log("--- end repair plan ---\n");

    if (repairPlan.ownershipAmbiguous) {
      console.error(
        "Ambiguous ownership: a separate TENANT-scoped row already exists — manual review required; APPLY would not create a duplicate.",
      );
      if (!DRY_RUN) {
        process.exit(1);
      }
    }

    if (DRY_RUN) {
      console.log(
        "\nDRY RUN — apply with APPLY_FCA_VL_CONTRIBUTOR_PILOT_ROLE_SYNC=true (authorised STAGE only)\n",
      );
      return;
    }

    if (role !== null && role.scope !== "TENANT") {
      console.log(`Repairing scope ${role.scope} → TENANT for ${role.key ?? role.id}`);
      await prisma.role.update({
        where: { id: role.id },
        data: { scope: "TENANT", tenantId: tenant.id },
      });
    }

    if (roleMissing) {
      role = await prisma.role.create({
        data: {
          tenantId: tenant.id,
          scope: "TENANT",
          key: FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.roleKey,
          name: FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.name,
          description: FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.description,
          ...FCA_VL_ROLE_CAPABILITY_FLAGS,
        },
        select: {
          id: true,
          key: true,
          name: true,
          scope: true,
          tenantId: true,
          canAccessVereinsleitung: true,
          canAttendVereinsleitungMeetings: true,
          rolePermissions: { select: { permission: { select: { key: true } } } },
        },
      });
      console.log(`Created role ${role?.id}`);
    } else if (needsVlFlags && role) {
      await prisma.role.update({
        where: { id: role.id },
        data: { ...FCA_VL_ROLE_CAPABILITY_FLAGS },
      });
    }

    if (!role) {
      throw new Error("Role row missing after create");
    }

    for (const permissionKey of targetKeys) {
      const permission = await prisma.permission.findUnique({
        where: { key: permissionKey },
        select: { id: true },
      });
      if (!permission) {
        console.warn(`Permission ${permissionKey} missing from catalog.`);
        continue;
      }
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permission.id },
        },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }

    console.log("\nDone.\n");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[sync-fca-vereinsleitung-contributor-pilot-role] FAILED:", err);
  process.exit(1);
});