/**
 * Idempotent Tenant Documentation permission catalog + Club Admin reconciliation preview.
 *
 *   npx tsx scripts/sync-tenant-documentation-permissions.ts
 *   APPLY_PERMISSION_SYNC=true npx tsx scripts/sync-tenant-documentation-permissions.ts
 *
 * After catalog rows exist, standard Club Admin backfill uses:
 *   npx tsx scripts/sync-tenant-club-admin-permissions.ts
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { PrismaPg } from "@prisma/adapter-pg";
import { PermissionModule, PrismaClient } from "@prisma/client";
import { Pool } from "pg";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { reconcileTenantClubAdminPermissions } from "@/lib/permissions/tenant-club-admin-permission-reconciliation";
import { getTenantClubAdminRoleKey } from "@/lib/roles/tenant-role-keys";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";

const DRY_RUN = process.env.APPLY_PERMISSION_SYNC !== "true";
const FCA_TENANT_KEY = "fc-allschwil";
const FCA_CLUB_ADMIN_ROLE = getTenantClubAdminRoleKey(FCA_TENANT_KEY);

const TENANT_DOC_PERMISSIONS = [
  {
    key: PERMISSIONS.TENANT_DOCUMENTATION_VIEW,
    name: "Dokumentation anzeigen",
    module: PermissionModule.TENANT_DOCUMENTATION,
  },
  {
    key: PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
    name: "Dokumentation bearbeiten",
    module: PermissionModule.TENANT_DOCUMENTATION,
  },
  {
    key: PERMISSIONS.TENANT_DOCUMENTATION_PUBLISH,
    name: "Dokumentation veröffentlichen",
    module: PermissionModule.TENANT_DOCUMENTATION,
  },
  {
    key: PERMISSIONS.TENANT_DOCUMENTATION_MANAGE,
    name: "Dokumentation verwalten",
    module: PermissionModule.TENANT_DOCUMENTATION,
  },
] as const;

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

if (!DRY_RUN) {
  assertOperationalMutationAllowed({
    operationId: "sync-tenant-documentation-permissions",
    databaseUrl: connectionString,
    explicitIntent: true,
    allowedRemoteEnvironments: ["stage"],
  });
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(`[tenant-documentation-sync] mode=${DRY_RUN ? "dry-run" : "apply"}`);

  for (const def of TENANT_DOC_PERMISSIONS) {
    if (DRY_RUN) {
      console.log(`[dry-run] ensure permission ${def.key}`);
      continue;
    }
    await prisma.permission.upsert({
      where: { key: def.key },
      create: {
        key: def.key,
        name: def.name,
        module: def.module,
        scope: "TENANT",
        grantableByAdmin: true,
      },
      update: {
        name: def.name,
        module: def.module,
        grantableByAdmin: true,
        scope: "TENANT",
      },
    });
  }

  const reconciliation = await reconcileTenantClubAdminPermissions(prisma, DRY_RUN);
  const docKeySet = new Set<string>(TENANT_DOC_PERMISSIONS.map((p) => p.key));
  const fcaDocAssignments = reconciliation.tenantClubAdminRoles.filter(
    (row) => row.roleKey === FCA_CLUB_ADMIN_ROLE && docKeySet.has(row.permissionKey),
  );

  console.log(
    JSON.stringify(
      {
        clubAdminRole: FCA_CLUB_ADMIN_ROLE,
        dokumentationKeysExpected: TENANT_DOC_PERMISSIONS.map((p) => p.key),
        dokumentationClubAdminReconciliation: fcaDocAssignments,
        assignedCount: fcaDocAssignments.filter((r) => r.action === "assigned").length,
        alreadyAssignedCount: fcaDocAssignments.filter((r) => r.action === "already_assigned")
          .length,
        dryRun: DRY_RUN,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });