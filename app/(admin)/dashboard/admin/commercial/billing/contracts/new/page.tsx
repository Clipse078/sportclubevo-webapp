import Link from "next/link";
import NativeBillingCreateContractForm from "@/components/admin/billing/NativeBillingCreateContractForm";
import BillingWorkspaceTabs from "@/components/admin/billing/shell/BillingWorkspaceTabs";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";
import { billingWorkspaceBreadcrumbs } from "@/lib/nav/billing-workspace-breadcrumbs";
import { getBillingProductsCatalogue } from "@/lib/billing/native-billing-commercial-service";
import { listActiveBillingCustomers, listActiveLegalEntities } from "@/lib/billing/native-billing-repository";
import { presentLegalEntityContractSelectorLabel } from "@/lib/billing/native-billing-presentation";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function NativeBillingNewContractPage() {
  await requirePermission(PERMISSIONS.BILLING_MANAGE);

  const [products, customers, legalEntities] = await Promise.all([
    getBillingProductsCatalogue(),
    listActiveBillingCustomers(),
    listActiveLegalEntities(),
  ]);

  return (
    <PageShell>
      <FormPagePattern
        eyebrow="Abrechnung"
        title="Neuer Vertrag"
        description="Vertrag als Entwurf anlegen und anschliessend aktivieren."
        breadcrumbs={billingWorkspaceBreadcrumbs("Neuer Vertrag")}
        contextTabs={<BillingWorkspaceTabs />}
        cancelAction={
          <Link href="/dashboard/admin/commercial/billing/contracts" className="fca-button-secondary">
            Zurück
          </Link>
        }
      >
      <NativeBillingCreateContractForm
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          catalogueMonthlyNetMinor: p.catalogueMonthlyNetMinor,
        }))}
        customers={customers.map((c) => ({ id: c.id, label: c.displayName }))}
        legalEntities={legalEntities.map((e) => ({
          id: e.id,
          label: presentLegalEntityContractSelectorLabel({
            displayName: e.displayName,
            legalName: e.legalName,
          }),
        }))}
      />
      </FormPagePattern>
    </PageShell>
  );
}
