import { auth } from "@/auth";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import type { RequirementServiceContext } from "./types";

export async function buildRequirementServiceContextForActor(
  userId: string,
  tenantId: string,
): Promise<RequirementServiceContext | null> {
  if (!userId || !tenantId) return null;

  const { platform, tenant } = await getRequestEffectivePermissions(userId, tenantId);

  return {
    tenantId,
    userId,
    permissionKeys: [...platform, ...tenant],
  };
}

export async function getRequirementServiceContext(): Promise<RequirementServiceContext | null> {
  const session = await auth();
  const tenantId = session?.user?.activeTenantId;
  const userId = session?.user?.id;

  if (!session?.user || !tenantId || !userId) {
    return null;
  }

  return buildRequirementServiceContextForActor(userId, tenantId);
}
