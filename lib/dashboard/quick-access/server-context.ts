import "server-only";

import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";

export type DashboardQuickAccessActorContext = {
  tenantId: string;
  userId: string;
};

export async function getDashboardQuickAccessActorContext(): Promise<DashboardQuickAccessActorContext | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  const tenant = await getActiveTenant();
  if (!tenant?.id) {
    return null;
  }
  return { tenantId: tenant.id, userId: session.user.id };
}
