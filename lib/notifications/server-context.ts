import "server-only";

import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";

export type NotificationRecipientContext = {
  tenantId: string;
  userId: string;
};

export async function getNotificationRecipientContext(): Promise<NotificationRecipientContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const tenant = await getActiveTenant();
  if (!tenant?.id) return null;

  return { tenantId: tenant.id, userId: session.user.id };
}
