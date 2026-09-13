import Link from "next/link";
import { notFound } from "next/navigation";
import BillingPanel from "@/components/admin/billing/shell/BillingPanel";
import BillingPageHeader from "@/components/admin/billing/shell/BillingPageHeader";
import BillingWorkspaceContent from "@/components/admin/billing/shell/BillingWorkspaceContent";
import BillingDetailGrid, {
  BillingDefinitionItem,
  BillingDefinitionList,
} from "@/components/admin/billing/shell/BillingDetailGrid";
import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import BillingDataTableShell, {
  BillingDataTableCell,
  BillingDataTableHead,
  BillingDataTableHeaderCell,
  BillingDataTableRow,
} from "@/components/admin/billing/shell/BillingDataTable";
import {
  getBillingContractsOverview,
  getInvoicesOverview,
} from "@/lib/billing/native-billing-commercial-service";
import { getBillingCustomerDetail } from "@/lib/billing/native-billing-service";
import { formatBillingMoney } from "@/lib/billing/format-billing-money";
import {
  formatBillingDateDisplay,
  presentBillingCustomerStatus,
  presentBillingContractStatus,
  presentNativeInvoiceStatus,
} from "@/lib/billing/native-billing-presentation";
import { getBillingCustomerBalanceSummaries } from "@/lib/billing/operations/billing-operations-service";
import { NativeBillingNotFoundError } from "@/lib/billing/native-billing-types";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

type PageProps = {
  params: Promise<{ customerKey: string }>;
};

export default async function NativeBillingCustomerDetailPage({ params }: PageProps) {
  await requirePermission(PERMISSIONS.BILLING_VIEW);
  const { customerKey } = await params;

  let detail: Awaited<ReturnType<typeof getBillingCustomerDetail>>;
  let balance: Awaited<ReturnType<typeof getBillingCustomerBalanceSummaries>>[number] | undefined;
  let customerContracts: Awaited<ReturnType<typeof getBillingContractsOverview>> = [];
  let customerInvoices: Awaited<ReturnType<typeof getInvoicesOverview>> = [];
  let recentInvoices: Awaited<ReturnType<typeof getInvoicesOverview>> = [];
  try {
    const [loadedDetail, balances, contracts, invoices] = await Promise.all([
      getBillingCustomerDetail(customerKey),
      getBillingCustomerBalanceSummaries(),
      getBillingContractsOverview(),
      getInvoicesOverview(),
    ]);
    detail = loadedDetail;
    balance = balances.find((b) => b.customerKey === customerKey);
    customerContracts = contracts.filter((c) => c.billingCustomerId === loadedDetail.customer.id);
    customerInvoices = invoices.filter((i) => i.billingCustomerId === loadedDetail.customer.id);
    recentInvoices = [...customerInvoices]
      .sort((a, b) => {
        const aKey = a.invoiceDate?.toISOString() ?? a.createdAt.toISOString();
        const bKey = b.invoiceDate?.toISOString() ?? b.createdAt.toISOString();
        return bKey.localeCompare(aKey);
      })
      .slice(0, 5);
  } catch (error) {
    if (error instanceof NativeBillingNotFoundError) {
      notFound();
    }
    throw error;
  }

  const { customer, tenantLinks, profiles } = detail;
  const statusPresentation = presentBillingCustomerStatus(customer.status);
  const billingProfile = profiles.find((p) => p.profileType === "BILLING") ?? profiles[0];
  const currency = balance?.currency ?? customer.defaultCurrency ?? "CHF";
  const activeContracts = customerContracts.filter((c) => c.status === "ACTIVE");
  const invoiceCount = customerInvoices.length;

  return (
    <BillingWorkspaceContent width="detail">
      <div className="space-y-8">
        <BillingPageHeader
          size="hero"
          title={customer.displayName}
          description={`Kunde ${customer.key}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <BillingStatusBadge
                label={statusPresentation.label.toUpperCase()}
                tone={statusPresentation.tone}
              />
              <Link
                href="/dashboard/admin/commercial/billing/customers"
                className="fca-button-secondary"
              >
                Zurück zur Liste
              </Link>
            </div>
          }
        />

        <div className="grid gap-4 rounded-[var(--radius-lg)] bg-[color-mix(in_srgb,var(--card)_90%,transparent)] px-5 py-4 ring-1 ring-[color-mix(in_srgb,var(--border)_50%,transparent)] sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-[0.8125rem] text-[var(--text-2)]">Offen</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatBillingMoney(balance?.openBalanceMinor ?? 0, currency)}
            </p>
          </div>
          <div>
            <p className="text-[0.8125rem] text-[var(--text-2)]">Überfällig</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatBillingMoney(balance?.overdueBalanceMinor ?? 0, currency)}
            </p>
          </div>
          <div>
            <p className="text-[0.8125rem] text-[var(--text-2)]">Aktive Verträge</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{activeContracts.length}</p>
          </div>
          <div>
            <p className="text-[0.8125rem] text-[var(--text-2)]">Rechnungen</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{invoiceCount}</p>
          </div>
        </div>

        <BillingDetailGrid>
          <div className="space-y-6">
            <BillingPanel title="Abrechnung">
              <BillingDefinitionList>
                <BillingDefinitionItem label="Rechtlicher Name">
                  {customer.legalName ?? "—"}
                </BillingDefinitionItem>
                <BillingDefinitionItem label="Währung / Sprache">
                  {[customer.defaultCurrency, customer.defaultLanguage].filter(Boolean).join(" · ") ||
                    "—"}
                </BillingDefinitionItem>
                <BillingDefinitionItem label="Rechnungs-E-Mail">
                  {customer.primaryEmail ?? billingProfile?.invoiceEmail ?? "—"}
                </BillingDefinitionItem>
              </BillingDefinitionList>
            </BillingPanel>

            <BillingPanel title="Rechnungsadresse">
              {!billingProfile ? (
                <p className="text-sm text-[var(--text-2)]">Keine Rechnungsadresse erfasst.</p>
              ) : (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{billingProfile.companyOrName}</p>
                  <p className="text-[var(--text-2)]">
                    {billingProfile.street}
                    {billingProfile.houseNumber ? ` ${billingProfile.houseNumber}` : ""}
                  </p>
                  <p className="text-[var(--text-2)]">
                    {billingProfile.postalCode} {billingProfile.city}
                  </p>
                  <p className="text-[var(--text-2)]">{billingProfile.countryCode}</p>
                </div>
              )}
            </BillingPanel>

            <BillingPanel title="Rechnungskontakt">
              <BillingDefinitionList>
                <BillingDefinitionItem label="E-Mail">
                  {billingProfile?.invoiceEmail ?? customer.primaryEmail ?? "—"}
                </BillingDefinitionItem>
              </BillingDefinitionList>
            </BillingPanel>
          </div>

          <div className="space-y-6">
            <BillingPanel title="Verträge">
              {customerContracts.length === 0 ? (
                <p className="text-sm text-[var(--text-2)]">Keine Verträge.</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {customerContracts.map((contract) => {
                    const contractStatus = presentBillingContractStatus(contract.status);
                    return (
                      <li key={contract.key}>
                        <Link
                          href={`/dashboard/admin/commercial/billing/contracts/${contract.key}`}
                          className="font-medium text-[var(--foreground)] hover:underline"
                        >
                          {contract.contractNumber}
                        </Link>
                        <p className="text-[var(--text-2)]">{contract.productName}</p>
                        <div className="mt-1">
                          <BillingStatusBadge
                            label={contractStatus.label}
                            tone={contractStatus.tone}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </BillingPanel>

            <BillingPanel title="Tenant-Verknüpfung">
              {tenantLinks.length === 0 ? (
                <p className="text-sm text-[var(--text-2)]">Keine Tenant-Verknüpfungen.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {tenantLinks.map((link) => (
                    <li key={link.id} className="text-[var(--foreground)]">
                      {link.tenantName ?? link.tenantKey ?? link.tenantId}
                      {link.activeUntil ? (
                        <span className="text-[var(--text-2)]"> · inaktiv</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </BillingPanel>

            <BillingPanel title="Rechnungen & Aktivität">
              {customerInvoices.length === 0 ? (
                <p className="text-sm text-[var(--text-2)]">Noch keine Rechnungen.</p>
              ) : (
                <BillingDataTableShell className="ring-0">
                  <BillingDataTableHead>
                    <tr>
                      <BillingDataTableHeaderCell>Rechnung</BillingDataTableHeaderCell>
                      <BillingDataTableHeaderCell>Datum</BillingDataTableHeaderCell>
                      <BillingDataTableHeaderCell align="right">Betrag</BillingDataTableHeaderCell>
                      <BillingDataTableHeaderCell>Status</BillingDataTableHeaderCell>
                    </tr>
                  </BillingDataTableHead>
                  <tbody>
                    {recentInvoices.map((invoice) => {
                      const status = presentNativeInvoiceStatus(invoice.status);
                      return (
                        <BillingDataTableRow key={invoice.key}>
                          <BillingDataTableCell>
                            <Link
                              href={`/dashboard/admin/commercial/billing/invoices/${invoice.key}`}
                              className="font-medium hover:underline"
                            >
                              {invoice.invoiceNumber ?? "Entwurf"}
                            </Link>
                          </BillingDataTableCell>
                          <BillingDataTableCell className="text-[var(--text-2)]">
                            {formatBillingDateDisplay(invoice.invoiceDate)}
                          </BillingDataTableCell>
                          <BillingDataTableCell align="right">
                            {formatBillingMoney(invoice.grossTotalMinor, invoice.currency)}
                          </BillingDataTableCell>
                          <BillingDataTableCell>
                            <BillingStatusBadge label={status.label} tone={status.tone} />
                          </BillingDataTableCell>
                        </BillingDataTableRow>
                      );
                    })}
                  </tbody>
                </BillingDataTableShell>
              )}
            </BillingPanel>
          </div>
        </BillingDetailGrid>
      </div>
    </BillingWorkspaceContent>
  );
}
