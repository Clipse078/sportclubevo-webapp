import Link from "next/link";
import NativeBillingCreateInvoiceForm from "@/components/admin/billing/NativeBillingCreateInvoiceForm";
import BillingWorkspaceTabs from "@/components/admin/billing/shell/BillingWorkspaceTabs";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";
import { billingWorkspaceBreadcrumbs } from "@/lib/nav/billing-workspace-breadcrumbs";
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
    <PageShell>
      <FormPagePattern
        eyebrow="Abrechnung"
        title="Rechnungsentwurf"
        description="Entwurf aus aktivem Vertrag und Leistungszeitraum erzeugen."
        breadcrumbs={billingWorkspaceBreadcrumbs("Rechnungsentwurf")}
        contextTabs={<BillingWorkspaceTabs />}
        cancelAction={
          <Link href="/dashboard/admin/commercial/billing/invoices" className="fca-button-secondary">
            Zurück
          </Link>
        }
      >
      <NativeBillingCreateInvoiceForm
        contracts={contracts.map((c) => ({
          id: c.id,
          status: c.status,
          label: `${c.contractNumber} · ${customerById.get(c.billingCustomerId) ?? "Kunde"} · ${c.productName}`,
        }))}
      />
      </FormPagePattern>
    </PageShell>
  );
}
