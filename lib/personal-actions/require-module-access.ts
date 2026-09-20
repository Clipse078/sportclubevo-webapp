import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { loadPersonalActionsModuleCapabilities } from "./access";

/**
 * Route gate for /dashboard/aufgaben — not globally gated by tasks.view alone.
 */
export async function requirePersonalActionsModuleAccess() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const tenant = await getActiveTenant();
  const tenantId = tenant?.id ?? session.user.activeTenantId;
  if (!tenantId) {
    redirect("/dashboard");
  }

  const capabilities = await loadPersonalActionsModuleCapabilities({
    tenantId,
    userId: session.user.id,
  });

  if (!capabilities.moduleAccess) {
    redirect("/dashboard");
  }

  return { session, tenantId, capabilities };
}
