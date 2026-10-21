import BillingPageHeader from "@/components/admin/billing/shell/BillingPageHeader";
import NativeBillingCreateContractTrigger from "@/components/admin/billing/NativeBillingCreateContractTrigger";
import { getBillingProductsCatalogue } from "@/lib/billing/native-billing-commercial-service";
import { listActiveBillingCustomers, listActiveLegalEntities } from "@/lib/billing/native-billing-repository";
import { presentLegalEntityContractSelectorLabel } from "@/lib/billing/native-billing-presentation";
import BillingWorkspaceContent from "@/components/admin/billing/shell/BillingWorkspaceContent";
import NativeBillingContractsTable from "@/components/admin/billing/NativeBillingContractsTable";
import { getBillingContractsOverview } from "@/lib/billing/native-billing-commercial-service";
import { presentBillingInterval } from "@/lib/billing/native-billing-presentation";
import { listBillingCustomers } from "@/lib/billing/native-billing-repository";
import { hasPermission } from "@/lib/permissions/has-permission";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function NativeBillingContractsPage() {
  const session = await requirePermission(PERMISSIONS.BILLING_VIEW);
  const canManage = hasPermission(session, PERMISSIONS.BILLING_MANAGE);

  let contracts: Awaited<ReturnType<typeof getBillingContractsOverview>> = [];
  let customers: Awaited<ReturnType<typeof listBillingCustomers>> = [];
  let products: Awaited<ReturnType<typeof getBillingProductsCatalogue>> = [];
  let legalEntities: Awaited<ReturnType<typeof listActiveLegalEntities>> = [];
  try {
    [contracts, customers, products, legalEntities] = await Promise.all([
      getBillingContractsOverview(),
      listBillingCustomers(),
      getBillingProductsCatalogue(),
      listActiveLegalEntities(),
    ]);
  } catch {
    contracts = [];
    customers = [];
    products = [];
    legalEntities = [];
  }

  const customerById = new Map(customers.map((c) => [c.id, c.displayName]));

  return (
    <BillingWorkspaceContent width="list">
    <div className="space-y-6">
      <BillingPageHeader
        title="Verträge"
        description="Aktive und historische SCE-Verträge mit Preisen, MWST und Abrechnungsintervall."
        actions={
          canManage ? (
            <NativeBillingCreateContractTrigger
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
          ) : undefined
        }
      />

      <NativeBillingContractsTable
        rows={contracts.map((contract) => ({
          key: contract.key,
          contractNumber: contract.contractNumber,
          customerLabel: customerById.get(contract.billingCustomerId) ?? contract.billingCustomerId,
          productName: contract.productName,
          monthlyNetAmountMinor: contract.monthlyNetAmountMinor,
          currency: contract.currency,
          vatTreatment: contract.vatTreatment,
          status: contract.status,
          startDate: contract.startDate.toISOString().slice(0, 10),
          endDate: contract.endDate?.toISOString().slice(0, 10) ?? null,
          billingIntervalLabel: presentBillingInterval(contract.billingInterval),
        }))}
      />
    </div>
    </BillingWorkspaceContent>
  );
}
