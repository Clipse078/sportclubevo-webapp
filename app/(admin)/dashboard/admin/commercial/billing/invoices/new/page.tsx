import Link from "next/link";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import NativeBillingCreateInvoiceForm from "@/components/admin/billing/NativeBillingCreateInvoiceForm";
import { getBillingContractsOverview } from "@/lib/billing/native-billing-commercial-service";
import { listBillingCustomers } from "@/lib/billing/native-billing-repository";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function NativeBillingNewInvoicePage() {
  await requirePermission(PERMISSIONS.BILLING_MANAGE);

  const [contracts, customers] = await Promise.all([
    getBillingContractsOverview(),
    listBillingCustomers(),
  ]);
  const customerById = new Map(customers.map((c) => [c.id, c.displayName]));

  return (
    <div className="space-y-8">
      <AdminSectionHeader
        eyebrow="Commercial"
        title="Rechnungsentwurf"
        description="Entwurf aus aktivem Vertrag und Leistungszeitraum erzeugen."
        actions={
          <Link href="/dashboard/admin/commercial/billing/invoices" className="fca-button-secondary">
            Zurück
          </Link>
        }
      />
      <NativeBillingCreateInvoiceForm
        contracts={contracts.map((c) => ({
          id: c.id,
          status: c.status,
          label: `${c.contractNumber} · ${customerById.get(c.billingCustomerId) ?? "Kunde"} · ${c.productName}`,
        }))}
      />
    </div>
  );
}
