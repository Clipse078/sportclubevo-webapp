import Link from "next/link";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import NativeBillingCreateCustomerForm from "@/components/admin/billing/NativeBillingCreateCustomerForm";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getTenants } from "@/lib/tenants/queries";

export default async function NativeBillingNewCustomerPage() {
  await requirePermission(PERMISSIONS.BILLING_MANAGE);

  const tenants = await getTenants();

  return (
    <div className="space-y-8">
      <AdminSectionHeader
        eyebrow="Commercial"
        title="Neuer Kunde"
        description="Nativen SCE Billing-Kunden anlegen und optional mit einem Club-Tenant verknüpfen."
        actions={
          <Link href="/dashboard/admin/commercial/billing/customers" className="fca-button-secondary">
            Zurück
          </Link>
        }
      />
      <NativeBillingCreateCustomerForm
        tenants={tenants.map((t) => ({
          key: t.key,
          label: `${t.name} (${t.key})`,
        }))}
      />
    </div>
  );
}
