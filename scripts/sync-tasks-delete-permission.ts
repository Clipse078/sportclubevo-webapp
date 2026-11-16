/**
 * PKG-03 — idempotent tasks.delete permission backfill.
 *
 * Usage (dry run — default):
 *   npx tsx scripts/sync-tasks-delete-permission.ts
 *
 * Usage (apply):
 *   APPLY_PERMISSION_SYNC=true npx tsx scripts/sync-tasks-delete-permission.ts
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { prisma } from "@/lib/db/prisma";
import { reconcileTasksDeletePermission } from "@/lib/permissions/tasks-delete-permission-reconciliation";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";

const DRY_RUN = process.env.APPLY_PERMISSION_SYNC !== "true";

async function main() {
  if (!DRY_RUN) {
    assertOperationalMutationAllowed({
      operationId: "sync-tasks-delete-permission",
      databaseUrl: process.env.DATABASE_URL,
      explicitIntent: true,
      allowedRemoteEnvironments: ["stage"],
    });
  }

  console.log(
    DRY_RUN ? "[sync-tasks-delete-permission] DRY RUN" : "[sync-tasks-delete-permission] APPLY",
  );

  const result = await reconcileTasksDeletePermission(prisma, DRY_RUN);

  console.log("Permission:", result.permission);
  console.log("super_admin:", result.superAdmin);
  console.log(`Tenant Club Admin roles: ${result.tenantClubAdminRoles.length}`);
  for (const outcome of result.tenantClubAdminRoles) {
    console.log(" ", outcome.action, outcome.roleKey);
  }
  if (result.fcAllschwilLegacyClubAdmin) {
    console.log("FC Allschwil legacy:", result.fcAllschwilLegacyClubAdmin);
  }
}

main()
  .catch((error) => {
    console.error("[sync-tasks-delete-permission] failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());