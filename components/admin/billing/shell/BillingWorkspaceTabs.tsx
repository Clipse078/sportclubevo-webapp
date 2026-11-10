import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { isPlatformSuperAdmin } from "@/lib/security/platform-superadmin";
import BillingWorkspaceContextTabs from "./BillingWorkspaceContextTabs";

/**
 * Server entry for billing workspace tabs.
 * Pages render this as `SceContextTabs` via `BillingWorkspaceContextTabs`.
 */
export default async function BillingWorkspaceTabs() {
  const session = await auth();
  const actorId = session?.user?.actorUserId ?? session?.user?.id ?? null;
  const showOperations = Boolean(actorId) && (await isPlatformSuperAdmin(prisma, actorId!));
  return <BillingWorkspaceContextTabs showOperations={showOperations} />;
}
