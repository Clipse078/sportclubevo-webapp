import Link from "next/link";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import NativeBillingCustomersTable from "@/components/admin/billing/NativeBillingCustomersTable";
import { getBillingCustomersOverview } from "@/lib/billing/native-billing-service";
import { hasPermission } from "@/lib/permissions/has-permission";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function NativeBillingCustomersPage() {
  const session = await requirePermission(PERMISSIONS.BILLING_VIEW);
  const canManage = hasPermission(session, PERMISSIONS.BILLING_MANAGE);

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
        title="Kunden"
        description="Native SCE Billing-Kunden (unabhängig von Tenant-Identität)."
        actions={
          canManage ? (
            <Link href="/dashboard/admin/commercial/billing/customers/new" className="fca-button-primary">
              Neuer Kunde
            </Link>
          ) : undefined
        }
      />

      <NativeBillingCustomersTable
        canManage={canManage}
        rows={rows.map((customer) => ({
          key: customer.key,
          displayName: customer.displayName,
          legalName: customer.legalName,
          primaryEmail: customer.primaryEmail,
          status: customer.status,
          tenantLabels: customer.tenantLinks
            .filter((link) => link.activeUntil === null)
            .map((link) => link.tenantName ?? link.tenantKey ?? link.tenantId),
        }))}
      />
    </div>
  );
}
