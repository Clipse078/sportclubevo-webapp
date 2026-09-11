import Link from "next/link";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import NativeBillingContractsTable from "@/components/admin/billing/NativeBillingContractsTable";
import { getBillingContractsOverview } from "@/lib/billing/native-billing-commercial-service";
import { listBillingCustomers } from "@/lib/billing/native-billing-repository";
import { hasPermission } from "@/lib/permissions/has-permission";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function NativeBillingContractsPage() {
  const session = await requirePermission(PERMISSIONS.BILLING_VIEW);
  const canManage = hasPermission(session, PERMISSIONS.BILLING_MANAGE);

  let contracts: Awaited<ReturnType<typeof getBillingContractsOverview>> = [];
  let customers: Awaited<ReturnType<typeof listBillingCustomers>> = [];
  try {
    [contracts, customers] = await Promise.all([
      getBillingContractsOverview(),
      listBillingCustomers(),
    ]);
  } catch {
    contracts = [];
    customers = [];
  }

  const customerById = new Map(customers.map((c) => [c.id, c.displayName]));

  return (
    <div className="space-y-8">
      <AdminSectionHeader
        eyebrow="Commercial"
        title="Contracts"
        description="Native SCE-Verträge mit vereinbartem Monatspreis (CHF, Schweiz)."
        actions={
          canManage ? (
            <Link href="/dashboard/admin/commercial/billing/contracts/new" className="fca-button-primary">
              Neuer Vertrag
            </Link>
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
        }))}
      />
    </div>
  );
}
