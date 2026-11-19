import { redirect } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { DEFAULT_TENANT_KEY } from "@/lib/tenants/queries";

export default async function DashboardAnliegenMeldungenPage() {
  await requireAnyPermission([
    PERMISSIONS.MELDUNGEN_HANDLE,
    PERMISSIONS.MELDUNGEN_VIEW_ALL,
  ]);
  const ctx = await getActiveTenant();
  const tenantKey = ctx?.key ?? DEFAULT_TENANT_KEY;
  redirect(`/tenant/${tenantKey}/cockpit/meldungen`);
}