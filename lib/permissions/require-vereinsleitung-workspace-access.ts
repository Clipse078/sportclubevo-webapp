import { notFound } from "next/navigation";
import { getRequestAuthSession } from "@/lib/auth/get-request-auth-session";
import { userHasVereinsleitungWorkspaceAccess } from "@/lib/permissions/vereinsleitung-workspace-access";

/** Blocks direct URL access to Vereinsleitung workspace routes for non-VL members. */
export async function requireVereinsleitungWorkspaceAccess(): Promise<void> {
  const session = await getRequestAuthSession();
  if (!session?.user) {
    notFound();
  }

  const tenantId = session.user.activeTenantId;
  const userId = session.user.effectiveUserId ?? session.user.id;
  if (!tenantId || !userId) {
    notFound();
  }

  const allowed = await userHasVereinsleitungWorkspaceAccess(userId, tenantId);
  if (!allowed) {
    notFound();
  }
}
