/**
 * SCE-ANLIEGEN-01 — idempotent permission catalog reconciliation.
 *
 * Does NOT auto-grant meldungen.* to Club Admin on STAGE — administrators
 * assign capabilities explicitly after deploy (see docs/access).
 */

import type { PermissionModule, PermissionScope, PrismaClient } from "@prisma/client";

const MELDUNGEN_MODULE = "MELDUNGEN" as PermissionModule;
const TENANT_SCOPE = "TENANT" as PermissionScope;

export const MELDUNG_PERMISSION_DEFS = [
  { key: "meldungen.submit", name: "Submit and track own concern reports", module: MELDUNGEN_MODULE },
  { key: "meldungen.handle", name: "Handle assigned concern reports", module: MELDUNGEN_MODULE },
  { key: "meldungen.view_all", name: "View all concern reports in tenant", module: MELDUNGEN_MODULE },
  { key: "meldungen.manage", name: "Manage concern routing configuration", module: MELDUNGEN_MODULE },
] as const;

export const MELDUNG_PERMISSION_KEYS = MELDUNG_PERMISSION_DEFS.map((p) => p.key);

export type PermissionSyncOutcome =
  | { action: "created"; key: string }
  | { action: "already_exists"; key: string };

export type MeldungPermissionReconciliationResult = {
  permissions: PermissionSyncOutcome[];
};

export async function reconcileMeldungPermissions(
  prisma: PrismaClient,
  dryRun: boolean,
): Promise<MeldungPermissionReconciliationResult> {
  const permissions: PermissionSyncOutcome[] = [];

  for (const def of MELDUNG_PERMISSION_DEFS) {
    const existing = await prisma.permission.findUnique({ where: { key: def.key } });
    if (!existing) {
      permissions.push({ action: "created", key: def.key });
      if (!dryRun) {
        await prisma.permission.create({
          data: {
            key: def.key,
            name: def.name,
            module: def.module,
            scope: TENANT_SCOPE,
            grantableByAdmin: true,
          },
        });
      }
    } else {
      permissions.push({ action: "already_exists", key: def.key });
    }
  }

  return { permissions };
}