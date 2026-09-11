import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import NativeBillingCustomersTable from "@/components/admin/billing/NativeBillingCustomersTable";
import { getBillingCustomersOverview } from "@/lib/billing/native-billing-service";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function NativeBillingCustomersPage() {
  await requirePermission(PERMISSIONS.BILLING_VIEW);

  let rows: Awaited<ReturnType<typeof getBillingCustomersOverview>> = [];
  try {
    rows = await getBillingCustomersOverview();
  } catch {
    rows = [];
  }

  return (
    <div className="space-y-8">
      <AdminSectionHeader
        eyebrow="Commercial"
        title="Billing Customers"
        description="Native SCE Billing-Kunden (unabhängig von Tenant-Identität)."
      />

      <NativeBillingCustomersTable
        rows={rows.map((customer) => ({
          key: customer.key,
          displayName: customer.displayName,
          legalName: customer.legalName,
          primaryEmail: customer.primaryEmail,
          status: customer.status,
          tenantLabels: customer.tenantLinks
            .filter((link) => link.activeUntil === null)
            .map((link) => link.tenantKey ?? link.tenantId),
        }))}
      />
    </div>
  );
}
