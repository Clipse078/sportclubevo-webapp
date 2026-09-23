/**
 * WORKSPACE-08-01 — idempotent workspace.audit.view permission registration.
 *
 * Does NOT auto-assign to club_admin or super_admin — explicit delegation only.
 */

import type { PermissionModule, PermissionScope, PrismaClient } from "@prisma/client";

import type { PermissionSyncOutcome } from "@/lib/permissions/workspace-delete-permission-reconciliation";

const TENANT_SCOPE = "TENANT" as PermissionScope;
const WORKSPACE_MODULE = "WORKSPACE" as PermissionModule;

export const WORKSPACE_AUDIT_VIEW_PERMISSION_DEF = {
  key: "workspace.audit.view",
  name: "View workspace governance audit",
  module: WORKSPACE_MODULE,
  scope: TENANT_SCOPE,
  grantableByAdmin: true,
} as const;

export type WorkspaceAuditViewPermissionReconciliationResult = {
  permission: PermissionSyncOutcome;
};

export async function reconcileWorkspaceAuditViewPermission(
  prisma: PrismaClient,
  dryRun = false,
): Promise<WorkspaceAuditViewPermissionReconciliationResult> {
  const def = WORKSPACE_AUDIT_VIEW_PERMISSION_DEF;
  const existingPermission = await prisma.permission.findUnique({
    where: { key: def.key },
    select: { id: true, name: true, module: true, scope: true, grantableByAdmin: true },
  });

  let permissionOutcome: PermissionSyncOutcome;

  if (existingPermission) {
    const needsUpdate =
      existingPermission.name !== def.name ||
      existingPermission.module !== def.module ||
      existingPermission.scope !== def.scope ||
      existingPermission.grantableByAdmin !== def.grantableByAdmin;

    permissionOutcome = needsUpdate
      ? { action: "updated", key: def.key }
      : { action: "already_exists", key: def.key };

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
  } else {
    permissionOutcome = { action: "created", key: def.key };
    if (!dryRun) {
      await prisma.permission.create({ data: def });
    }
  }

  return { permission: permissionOutcome };
}
