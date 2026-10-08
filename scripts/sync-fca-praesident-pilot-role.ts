/**
 * FCA STAGE — idempotent Präsident (Pilot) role permission sync.
 *
 *   npx tsx scripts/sync-fca-praesident-pilot-role.ts
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *   SCE_OPERATION_AUTHORIZATION=sync-fca-praesident-pilot-role:stage \
 *   APPLY_FCA_PRAESIDENT_PILOT_ROLE_SYNC=true npx tsx scripts/sync-fca-praesident-pilot-role.ts
 *
 * Never targets PROD tenants other than fc-allschwil (pilot tenant key).
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import {
  PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE,
  PILOT_TENANT_KEY,
} from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";
import { resolveRuntimeIdentity } from "@/lib/server/runtime-identity";

const DRY_RUN = process.env.APPLY_FCA_PRAESIDENT_PILOT_ROLE_SYNC !== "true";
const STAGE_FINGERPRINT = "acd3b37682911890";

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[sync-fca-praesident-pilot-role] DATABASE_URL is required.");
  process.exit(1);
}

if (!DRY_RUN) {
  const identity = resolveRuntimeIdentity(process.env);
  if (identity.dataEnvironment !== "STAGE") {
    throw new Error(
      `[sync-fca-praesident-pilot-role] SCE_DATA_ENVIRONMENT must be STAGE (got ${identity.dataEnvironment}).`,
    );
  }
  if (identity.databaseFingerprint !== STAGE_FINGERPRINT) {
    throw new Error(
      `[sync-fca-praesident-pilot-role] database fingerprint mismatch: expected ${STAGE_FINGERPRINT}, got ${identity.databaseFingerprint ?? "null"}.`,
    );
  }
  assertOperationalMutationAllowed({
    operationId: "sync-fca-praesident-pilot-role",
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

    const role = await prisma.role.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [
          { key: PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE.roleKey },
          { name: "Präsident (Pilot)" },
          { name: PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE.name },
        ],
      },
      select: {
        id: true,
        key: true,
        name: true,
        rolePermissions: { select: { permission: { select: { key: true } } } },
      },
    });

    if (!role) {
      console.error(
        "Präsident (Pilot) role not found on tenant — assign manually or create from pilot template.",
      );
      process.exit(1);
    }

    const targetKeys = [...PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE.permissionKeys];
    const currentKeys = role.rolePermissions.map((rp) => rp.permission.key);
    const missing = targetKeys.filter((k) => !currentKeys.includes(k));
    const extraForbidden = currentKeys.filter(
      (k) =>
        !targetKeys.includes(k as (typeof targetKeys)[number]) &&
        (k === "users.impersonate_tenant" ||
          k === "roles.manage" ||
          k === "users.manage_memberships"),
    );

    console.log(`Tenant: ${tenant.key} (${tenant.id})`);
    console.log(`Role: ${role.name} (${role.key ?? role.id})`);
    console.log(`Current keys (${currentKeys.length}): ${currentKeys.sort().join(", ")}`);
    console.log(`Target keys (${targetKeys.length}): ${targetKeys.sort().join(", ")}`);
    console.log(`Missing to add (${missing.length}): ${missing.join(", ") || "—"}`);
    console.log(`Forbidden extras flagged (${extraForbidden.length}): ${extraForbidden.join(", ") || "—"}`);

    if (DRY_RUN) {
      console.log("\nDRY RUN — apply with APPLY_FCA_PRAESIDENT_PILOT_ROLE_SYNC=true\n");
      return;
    }

    for (const permissionKey of missing) {
      const permission = await prisma.permission.findUnique({
        where: { key: permissionKey },
        select: { id: true },
      });
      if (!permission) {
        console.warn(
          `Permission ${permissionKey} missing from catalog — run sync-sce-pilot-03-permissions first.`,
        );
        continue;
      }
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permission.id },
        },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
      console.log(`  + ${permissionKey}`);
    }

    console.log("\nDone.\n");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[sync-fca-praesident-pilot-role] FAILED:", err);
  process.exit(1);
});
