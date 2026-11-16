import "server-only";

import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";

export async function resolveSprintDeleteAuthority(
  userId: string,
  tenantId: string,
): Promise<boolean> {
  const resolver = createEffectivePermissionResolver(prisma);
  return resolver.hasTenantDeletionAuthority({
    userId,
    permission: PERMISSIONS.INITIATIVES_DELETE,
    tenantId,
  });
}