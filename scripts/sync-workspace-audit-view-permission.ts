/**
 * WORKSPACE-08-01 — idempotent workspace.audit.view permission registration.
 *
 * Usage:
 *   npx tsx scripts/sync-workspace-audit-view-permission.ts
 *   npx tsx scripts/sync-workspace-audit-view-permission.ts --apply
 */

import { prisma } from "@/lib/db/prisma";
import { reconcileWorkspaceAuditViewPermission } from "@/lib/permissions/workspace-audit-view-permission-reconciliation";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";

async function main() {
  const apply = process.argv.includes("--apply");
  const dryRun = !apply;

  if (apply) {
    assertOperationalMutationAllowed({
      operationId: "sync-workspace-audit-view-permission",
      databaseUrl: process.env.DATABASE_URL,
      explicitIntent: true,
      allowedRemoteEnvironments: ["stage"],
    });
  }

  const result = await reconcileWorkspaceAuditViewPermission(prisma, dryRun);
  console.log(JSON.stringify({ dryRun, result }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
