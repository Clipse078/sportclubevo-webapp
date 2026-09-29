import { auth } from "@/auth";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import type { TaskServiceContext } from "./types";
import { loadTaskAuthScope } from "./task-authorization";

export async function buildTaskServiceContextForActor(
  userId: string,
  tenantId: string,
): Promise<TaskServiceContext | null> {
  if (!userId || !tenantId) return null;

  const [{ platform, tenant }, taskAuth] = await Promise.all([
    getRequestEffectivePermissions(userId, tenantId),
    loadTaskAuthScope(userId, tenantId),
  ]);

  return {
    tenantId,
    userId,
    permissionKeys: [...platform, ...tenant],
    auth: taskAuth,
  };
}

export async function getTaskServiceContext(): Promise<TaskServiceContext | null> {
  const session = await auth();
  const tenantId = session?.user?.activeTenantId;
  const userId = session?.user?.id;

  if (!session?.user || !tenantId || !userId) {
    return null;
  }

  return buildTaskServiceContextForActor(userId, tenantId);
}
