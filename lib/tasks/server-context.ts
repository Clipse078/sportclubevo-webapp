import { auth } from "@/auth";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import type { TaskServiceContext } from "./types";

export async function getTaskServiceContext(): Promise<TaskServiceContext | null> {
  const session = await auth();
  const tenantId = session?.user?.activeTenantId;
  const userId = session?.user?.id;

  if (!session?.user || !tenantId || !userId) {
    return null;
  }

  const { platform, tenant } = await getRequestEffectivePermissions(
    userId,
    tenantId,
  );

  return {
    tenantId,
    userId,
    permissionKeys: [...platform, ...tenant],
  };
}
