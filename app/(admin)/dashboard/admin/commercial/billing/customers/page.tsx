import BillingWorkspaceTabs from "@/components/admin/billing/shell/BillingWorkspaceTabs";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import { billingWorkspaceBreadcrumbs } from "@/lib/nav/billing-workspace-breadcrumbs";
import NativeBillingCreateCustomerTrigger from "@/components/admin/billing/NativeBillingCreateCustomerTrigger";
import { getTenants } from "@/lib/tenants/queries";
import NativeBillingCustomersTable from "@/components/admin/billing/NativeBillingCustomersTable";
import { pickLatestCustomerLastInvoice } from "@/lib/billing/billing-customer-last-invoice";
import {
  getBillingContractsOverview,
  getInvoicesOverview,
} from "@/lib/billing/native-billing-commercial-service";
import { getBillingCustomersOverview } from "@/lib/billing/native-billing-service";
import { getBillingCustomerBalanceSummaries } from "@/lib/billing/operations/billing-operations-service";
import { hasPermission } from "@/lib/permissions/has-permission";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

function resolveBillingHealth(input: {
  openBalanceMinor: number;
  overdueBalanceMinor: number;
  primaryEmail: string | null;
}): { label: string; tone: "success" | "warning" | "muted" | "default" } {
  if (input.overdueBalanceMinor > 0) {
    return { label: "Überfällig", tone: "warning" };
  }
  if (input.openBalanceMinor > 0 && !input.primaryEmail?.trim()) {
    return { label: "E-Mail fehlt", tone: "warning" };
  }
  if (input.openBalanceMinor > 0) {
    return { label: "Offene Posten", tone: "default" };
  }
  return { label: "In Ordnung", tone: "success" };
}

export default async function NativeBillingCustomersPage() {
  const session = await requirePermission(PERMISSIONS.BILLING_VIEW);
  const canManage = hasPermission(session, PERMISSIONS.BILLING_MANAGE);

  let rows: Awaited<ReturnType<typeof getBillingCustomersOverview>> = [];
  let tenants: Awaited<ReturnType<typeof getTenants>> = [];
  let balances: Awaited<ReturnType<typeof getBillingCustomerBalanceSummaries>> = [];
  let contracts: Awaited<ReturnType<typeof getBillingContractsOverview>> = [];
  let invoices: Awaited<ReturnType<typeof getInvoicesOverview>> = [];
  try {
    [rows, balances, contracts, invoices, tenants] = await Promise.all([
      getBillingCustomersOverview(),
      getBillingCustomerBalanceSummaries(),
      getBillingContractsOverview(),
      getInvoicesOverview(),
      getTenants(),
    ]);
  } catch {
    rows = [];
    balances = [];
    contracts = [];
    invoices = [];
    tenants = [];
  }

  const balanceByCustomerKey = new Map(balances.map((b) => [b.customerKey, b]));
  const activeContractsByCustomerId = new Map<string, number>();
  for (const contract of contracts) {
    if (contract.status !== "ACTIVE") continue;
    activeContractsByCustomerId.set(
      contract.billingCustomerId,
      (activeContractsByCustomerId.get(contract.billingCustomerId) ?? 0) + 1,
    );
  }

  const lastInvoiceByCustomerId = pickLatestCustomerLastInvoice(
    invoices.map((invoice) => ({
      billingCustomerId: invoice.billingCustomerId,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      invoiceDate: invoice.invoiceDate,
      createdAt: invoice.createdAt,
    })),
  );

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Abrechnung"
        title="Kunden"
        description="Finanzielle Kundenübersicht mit Salden, Verträgen und Abrechnungsstatus."
        breadcrumbs={billingWorkspaceBreadcrumbs("Kunden")}
        contextTabs={<BillingWorkspaceTabs />}
        headerActions={
          canManage ? (
            <NativeBillingCreateCustomerTrigger
              tenants={tenants.map((t) => ({
                key: t.key,
                label: `${t.name} (${t.key})`,
              }))}
            />
          ) : undefined
        }
      >
      <NativeBillingCustomersTable
        canManage={canManage}
        rows={rows.map((customer) => {
          const balance = balanceByCustomerKey.get(customer.key);
          const health = resolveBillingHealth({
            openBalanceMinor: balance?.openBalanceMinor ?? 0,
            overdueBalanceMinor: balance?.overdueBalanceMinor ?? 0,
            primaryEmail: customer.primaryEmail,
          });
          const lastInvoice = lastInvoiceByCustomerId.get(customer.id);
          return {
            key: customer.key,
            displayName: customer.displayName,
            legalName: customer.legalName,
            status: customer.status,
            activeContractCount: activeContractsByCustomerId.get(customer.id) ?? 0,
            openBalanceMinor: balance?.openBalanceMinor ?? 0,
            overdueBalanceMinor: balance?.overdueBalanceMinor ?? 0,
            currency: balance?.currency ?? customer.defaultCurrency ?? "CHF",
            billingHealthLabel: health.label,
            billingHealthTone: health.tone,
            lastInvoiceLabel: lastInvoice?.label ?? null,
            lastInvoiceDate: lastInvoice?.date ?? null,
          };
        })}
      />
      </ListPagePattern>
    </PageShell>
  );
}
