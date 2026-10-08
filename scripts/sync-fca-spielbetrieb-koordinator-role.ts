/**
 * FCA STAGE — idempotent Spielbetrieb Koordinator role permission sync.
 *
 *   npx tsx scripts/sync-fca-spielbetrieb-koordinator-role.ts
 *   APPLY_FCA_SPIELBETRIEB_ROLE_SYNC=true npx tsx scripts/sync-fca-spielbetrieb-koordinator-role.ts
 *
 * Never targets PROD tenants other than fc-allschwil (pilot tenant key).
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import {
  PILOT_TENANT_KEY,
  SANDRA_FISCHER_SPIELBETRIEB_ROLE,
} from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";

const DRY_RUN = process.env.APPLY_FCA_SPIELBETRIEB_ROLE_SYNC !== "true";

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[sync-fca-spielbetrieb-koordinator-role] DATABASE_URL is required.");
  process.exit(1);
}

if (!DRY_RUN) {
  assertOperationalMutationAllowed({
    operationId: "sync-fca-spielbetrieb-koordinator-role",
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
          { key: SANDRA_FISCHER_SPIELBETRIEB_ROLE.roleKey },
          { name: "Spielbetrieb Koordinator" },
          { name: SANDRA_FISCHER_SPIELBETRIEB_ROLE.name },
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
        "Spielbetrieb Koordinator role not found on tenant — assign manually or create from pilot template.",
      );
      process.exit(1);
    }

    const targetKeys = [...SANDRA_FISCHER_SPIELBETRIEB_ROLE.permissionKeys];
    const currentKeys = role.rolePermissions.map((rp) => rp.permission.key);
    const missing = targetKeys.filter((k) => !currentKeys.includes(k));
    const extraForbidden = currentKeys.filter(
      (k) =>
        !targetKeys.includes(k as (typeof targetKeys)[number]) &&
        (k === "trainings.manage" || k === "events.manage" || k === "users.impersonate_tenant"),
    );

    console.log(`Tenant: ${tenant.key} (${tenant.id})`);
    console.log(`Role: ${role.name} (${role.key ?? role.id})`);
    console.log(`Current keys (${currentKeys.length}): ${currentKeys.sort().join(", ")}`);
    console.log(`Target keys (${targetKeys.length}): ${targetKeys.sort().join(", ")}`);
    console.log(`Missing to add (${missing.length}): ${missing.join(", ") || "—"}`);
    console.log(`Forbidden extras flagged (${extraForbidden.length}): ${extraForbidden.join(", ") || "—"}`);

    if (DRY_RUN) {
      console.log("\nDRY RUN — apply with APPLY_FCA_SPIELBETRIEB_ROLE_SYNC=true\n");
      return;
    }

    for (const permissionKey of missing) {
      const permission = await prisma.permission.findUnique({
        where: { key: permissionKey },
        select: { id: true },
      });
      if (!permission) {
        console.warn(`Permission ${permissionKey} missing from catalog — run sync-sce-pilot-03-permissions first.`);
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
  console.error("[sync-fca-spielbetrieb-koordinator-role] FAILED:", err);
  process.exit(1);
});
