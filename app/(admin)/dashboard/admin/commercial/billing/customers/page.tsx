import Link from "next/link";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import NativeBillingCustomersTable from "@/components/admin/billing/NativeBillingCustomersTable";
import { getBillingContractsOverview } from "@/lib/billing/native-billing-commercial-service";
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
  let balances: Awaited<ReturnType<typeof getBillingCustomerBalanceSummaries>> = [];
  let contracts: Awaited<ReturnType<typeof getBillingContractsOverview>> = [];
  try {
    [rows, balances, contracts] = await Promise.all([
      getBillingCustomersOverview(),
      getBillingCustomerBalanceSummaries(),
      getBillingContractsOverview(),
    ]);
  } catch {
    rows = [];
    balances = [];
    contracts = [];
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

  return (
    <div className="space-y-8">
      <AdminSectionHeader
        eyebrow="Commercial"
        title="Kunden"
        description="Native SCE Billing-Kunden mit Salden und Abrechnungsstatus."
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
          return {
            key: customer.key,
            displayName: customer.displayName,
            legalName: customer.legalName,
            primaryEmail: customer.primaryEmail,
            status: customer.status,
            tenantLabels: customer.tenantLinks
              .filter((link) => link.activeUntil === null)
              .map((link) => link.tenantName ?? link.tenantKey ?? link.tenantId),
            activeContractCount: activeContractsByCustomerId.get(customer.id) ?? 0,
            openBalanceMinor: balance?.openBalanceMinor ?? 0,
            overdueBalanceMinor: balance?.overdueBalanceMinor ?? 0,
            currency: balance?.currency ?? customer.defaultCurrency ?? "CHF",
            billingHealthLabel: health.label,
            billingHealthTone: health.tone,
          };
        })}
      />
    </div>
  );
}
