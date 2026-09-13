import Link from "next/link";
import BillingPageHeader from "@/components/admin/billing/shell/BillingPageHeader";
import NativeBillingCustomersTable from "@/components/admin/billing/NativeBillingCustomersTable";
import {
  getBillingContractsOverview,
  getInvoicesOverview,
} from "@/lib/billing/native-billing-commercial-service";
import { getBillingCustomersOverview } from "@/lib/billing/native-billing-service";
import { getBillingCustomerBalanceSummaries } from "@/lib/billing/operations/billing-operations-service";
import { presentInvoiceDisplayNumber } from "@/lib/billing/native-billing-presentation";
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
  let balances: Awaited<ReturnType<typeof getBillingCustomerBalanceSummaries>> = [];
  let contracts: Awaited<ReturnType<typeof getBillingContractsOverview>> = [];
  let invoices: Awaited<ReturnType<typeof getInvoicesOverview>> = [];
  try {
    [rows, balances, contracts, invoices] = await Promise.all([
      getBillingCustomersOverview(),
      getBillingCustomerBalanceSummaries(),
      getBillingContractsOverview(),
      getInvoicesOverview(),
    ]);
  } catch {
    rows = [];
    balances = [];
    contracts = [];
    invoices = [];
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

  const lastInvoiceByCustomerId = new Map<
    string,
    { label: string; date: string | null }
  >();
  for (const invoice of invoices) {
    const existing = lastInvoiceByCustomerId.get(invoice.billingCustomerId);
    const invoiceDate = invoice.invoiceDate
      ? invoice.invoiceDate.toISOString().slice(0, 10)
      : null;
    const sortKey = invoiceDate ?? invoice.createdAt.toISOString();
    const existingKey = existing?.date ?? "";
    if (existing && existingKey >= sortKey) continue;
    lastInvoiceByCustomerId.set(invoice.billingCustomerId, {
      label: presentInvoiceDisplayNumber(invoice.invoiceNumber, invoice.status),
      date: invoiceDate,
    });
  }

  return (
    <div className="space-y-6">
      <BillingPageHeader
        title="Kunden"
        description="Finanzielle Kundenübersicht mit Salden, Verträgen und Abrechnungsstatus."
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
    </div>
  );
}
