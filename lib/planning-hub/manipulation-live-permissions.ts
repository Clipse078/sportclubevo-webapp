import { prisma } from "@/lib/db/prisma";
import type { PermissionKey } from "@/lib/permissions/permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import {
  manipulationPermissionFlagsFromKeys,
  type ManipulationActorPermissions,
} from "@/lib/planning-hub/manipulation-server-authorization";

/** Live effective permissions for manipulation gates (not session cache). */
export async function resolveLiveManipulationActorPermissions(
  userId: string,
  tenantId: string,
): Promise<ManipulationActorPermissions> {
  const resolver = createEffectivePermissionResolver(prisma);
  const { platform, tenant } = await resolver.getEffectivePermissions({ userId, tenantId });
  return manipulationPermissionFlagsFromKeys([...platform, ...tenant] as PermissionKey[]);
}
