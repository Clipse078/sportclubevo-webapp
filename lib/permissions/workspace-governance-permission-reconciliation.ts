/**
 * WORKSPACE-08-02 — idempotent workspace.governance.manage + workspace.break_glass registration.
 *
 * Does NOT auto-assign to club_admin — explicit delegation only.
 */

import type { PermissionModule, PermissionScope, PrismaClient } from "@prisma/client";

import type { PermissionSyncOutcome } from "@/lib/permissions/workspace-delete-permission-reconciliation";

const TENANT_SCOPE = "TENANT" as PermissionScope;
const WORKSPACE_MODULE = "WORKSPACE" as PermissionModule;

const DEFINITIONS = [
  {
    key: "workspace.governance.manage",
    name: "Manage workspace governance operations",
    module: WORKSPACE_MODULE,
    scope: TENANT_SCOPE,
    grantableByAdmin: true,
  },
  {
    key: "workspace.break_glass",
    name: "Activate workspace break-glass exceptional access",
    module: WORKSPACE_MODULE,
    scope: TENANT_SCOPE,
    grantableByAdmin: true,
  },
] as const;

export type WorkspaceGovernancePermissionReconciliationResult = {
  permissions: PermissionSyncOutcome[];
};

async function reconcileOne(
  prisma: PrismaClient,
  def: (typeof DEFINITIONS)[number],
  dryRun: boolean,
): Promise<PermissionSyncOutcome> {
  const existingPermission = await prisma.permission.findUnique({
    where: { key: def.key },
    select: { id: true, name: true, module: true, scope: true, grantableByAdmin: true },
  });

  if (existingPermission) {
    const needsUpdate =
      existingPermission.name !== def.name ||
      existingPermission.module !== def.module ||
      existingPermission.scope !== def.scope ||
      existingPermission.grantableByAdmin !== def.grantableByAdmin;

    if (needsUpdate && !dryRun) {
      await prisma.permission.update({
        where: { key: def.key },
        data: {
          name: def.name,
          module: def.module,
          scope: def.scope,
          grantableByAdmin: def.grantableByAdmin,
        },
      });
    }

    return needsUpdate
      ? { action: "updated", key: def.key }
      : { action: "already_exists", key: def.key };
  }

  if (!dryRun) {
    await prisma.permission.create({ data: def });
  }

  return { action: "created", key: def.key };
}

export async function reconcileWorkspaceGovernancePermissions(
  prisma: PrismaClient,
  dryRun = false,
): Promise<WorkspaceGovernancePermissionReconciliationResult> {
  const permissions: PermissionSyncOutcome[] = [];
  for (const def of DEFINITIONS) {
    permissions.push(await reconcileOne(prisma, def, dryRun));
  }
  return { permissions };
}

/** Permissions excluded from automatic tenant club_admin seed bundles. */
export const TENANT_CLUB_ADMIN_GOVERNANCE_EXCLUDED_KEYS = new Set<string>([
  "workspace.break_glass",
  "workspace.governance.manage",
]);
