import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { DEFAULT_TENANT_KEY } from "@/lib/tenants/queries";

/** Tenant-aware entry — unauthenticated users follow the normal login flow with return URL. */
export default async function AnliegenGatewayPage() {
  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/anliegen")}`);
  }
  const ctx = await getActiveTenant();
  const tenantKey = ctx?.key ?? DEFAULT_TENANT_KEY;
  redirect(`/tenant/${tenantKey}/anliegen`);
}