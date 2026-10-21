import BillingPageHeader from "@/components/admin/billing/shell/BillingPageHeader";
import NativeBillingCreateInvoiceTrigger from "@/components/admin/billing/NativeBillingCreateInvoiceTrigger";
import { getBillingContractsOverview } from "@/lib/billing/native-billing-commercial-service";
import BillingWorkspaceContent from "@/components/admin/billing/shell/BillingWorkspaceContent";
import NativeBillingInvoicesOperationsTable from "@/components/admin/billing/NativeBillingInvoicesOperationsTable";
import { getBillingInvoiceOperationalRows } from "@/lib/billing/operations/billing-operations-service";
import { listBillingCustomers } from "@/lib/billing/native-billing-repository";
import { hasPermission } from "@/lib/permissions/has-permission";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function NativeBillingInvoicesPage() {
  const session = await requirePermission(PERMISSIONS.BILLING_VIEW);
  const canManage = hasPermission(session, PERMISSIONS.BILLING_MANAGE);

  let rows: Awaited<ReturnType<typeof getBillingInvoiceOperationalRows>> = [];
  let customers: Awaited<ReturnType<typeof listBillingCustomers>> = [];
  let contracts: Awaited<ReturnType<typeof getBillingContractsOverview>> = [];
  try {
    [rows, customers, contracts] = await Promise.all([
      getBillingInvoiceOperationalRows(),
      listBillingCustomers(),
      getBillingContractsOverview(),
    ]);
  } catch {
    rows = [];
    customers = [];
    contracts = [];
  }

  return (
    <BillingWorkspaceContent width="list">
    <div className="space-y-6">
      <BillingPageHeader
        title="Rechnungen"
        description="Operative Rechnungsliste mit Zahlungs-, Versand- und Fälligkeitsstatus."
        actions={
          canManage ? (
            <NativeBillingCreateInvoiceTrigger
              contracts={contracts.map((c) => ({
                id: c.id,
                label: `${c.contractNumber} · ${c.productName}`,
                status: c.status,
              }))}
            />
          ) : undefined
        }
      />

      <NativeBillingInvoicesOperationsTable
        rows={rows}
        customerOptions={customers.map((c) => ({ key: c.key, label: c.displayName }))}
      />
    </div>
    </BillingWorkspaceContent>
  );
}
