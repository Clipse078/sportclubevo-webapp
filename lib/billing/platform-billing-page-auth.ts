import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export async function canManagePlatformBilling(): Promise<boolean> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return false;
  }
  const resolver = createEffectivePermissionResolver(prisma);
  const { platform } = await resolver.getEffectivePermissions({ userId });
  return platform.includes(PERMISSIONS.BILLING_MANAGE);
}
