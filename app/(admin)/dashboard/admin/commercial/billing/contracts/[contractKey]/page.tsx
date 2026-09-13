import Link from "next/link";
import BillingPageHeader from "@/components/admin/billing/shell/BillingPageHeader";
import BillingPanel from "@/components/admin/billing/shell/BillingPanel";
import BillingWorkspaceContent from "@/components/admin/billing/shell/BillingWorkspaceContent";
import {
  BillingDefinitionItem,
  BillingDefinitionList,
} from "@/components/admin/billing/shell/BillingDetailGrid";
import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import NativeBillingContractActions from "@/components/admin/billing/NativeBillingContractActions";
import BillingDataTableShell, {
  BillingDataTableCell,
  BillingDataTableHead,
  BillingDataTableHeaderCell,
  BillingDataTableRow,
} from "@/components/admin/billing/shell/BillingDataTable";
import {
  getBillingContractDetail,
  getInvoicesOverview,
} from "@/lib/billing/native-billing-commercial-service";
import { findBillingProductById } from "@/lib/billing/native-billing-commercial-repository";
import { findBillingCustomerById } from "@/lib/billing/native-billing-repository";
import { formatBillingMoney } from "@/lib/billing/format-billing-money";
import {
  formatBillingDateDisplay,
  presentBillingContractStatus,
  presentBillingInterval,
  presentNativeInvoiceStatus,
  presentSwissVatTreatment,
} from "@/lib/billing/native-billing-presentation";
import { hasPermission } from "@/lib/permissions/has-permission";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

type PageProps = { params: Promise<{ contractKey: string }> };

export default async function NativeBillingContractDetailPage({ params }: PageProps) {
  const session = await requirePermission(PERMISSIONS.BILLING_VIEW);
  const canManage = hasPermission(session, PERMISSIONS.BILLING_MANAGE);
  const { contractKey } = await params;

  let contract: Awaited<ReturnType<typeof getBillingContractDetail>> | null = null;
  let relatedInvoices: Awaited<ReturnType<typeof getInvoicesOverview>> = [];
  try {
    const [loadedContract, invoices] = await Promise.all([
      getBillingContractDetail(contractKey),
      getInvoicesOverview(),
    ]);
    contract = loadedContract;
    relatedInvoices = invoices
      .filter((inv) => inv.billingContractId === loadedContract.id)
      .sort((a, b) => {
        const aKey = a.invoiceDate?.toISOString() ?? a.createdAt.toISOString();
        const bKey = b.invoiceDate?.toISOString() ?? b.createdAt.toISOString();
        return bKey.localeCompare(aKey);
      });
  } catch {
    contract = null;
  }

  if (!contract) {
    return (
      <BillingWorkspaceContent width="detail">
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-2)]">Vertrag nicht gefunden.</p>
          <Link href="/dashboard/admin/commercial/billing/contracts" className="fca-button-secondary">
            Zurück
          </Link>
        </div>
      </BillingWorkspaceContent>
    );
  }

  const customer = await findBillingCustomerById(contract.billingCustomerId);
  const catalogueProduct = contract.billingProductId
    ? await findBillingProductById(contract.billingProductId)
    : null;
  const statusPresentation = presentBillingContractStatus(contract.status);
  const negotiatedFormatted = formatBillingMoney(
    contract.monthlyNetAmountMinor,
    contract.currency,
  );
  const vatLabel = presentSwissVatTreatment(contract.vatTreatment);

  return (
    <BillingWorkspaceContent width="detail">
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <BillingPageHeader
            size="hero"
            title={contract.contractNumber}
            description={contract.productName}
          />
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <BillingStatusBadge
              label={statusPresentation.label.toUpperCase()}
              tone={statusPresentation.tone}
            />
            <NativeBillingContractActions
              contractKey={contract.key}
              status={contract.status}
              canManage={canManage}
            />
            <Link
              href="/dashboard/admin/commercial/billing/contracts"
              className="fca-button-secondary text-sm"
            >
              Zurück zur Liste
            </Link>
          </div>
        </div>

        <div className="rounded-[var(--radius-lg)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] px-6 py-5 ring-1 ring-[color-mix(in_srgb,var(--border)_50%,transparent)]">
          <p className="text-3xl font-semibold tabular-nums tracking-tight">
            {negotiatedFormatted}
            <span className="text-lg font-medium text-[var(--text-2)]"> / Monat</span>
          </p>
          <p className="mt-2 text-sm text-[var(--text-2)]">zzgl. MWST · {vatLabel}</p>
          {catalogueProduct?.catalogueMonthlyNetMinor != null ? (
            <p className="mt-3 text-xs text-[var(--muted)]">
              Katalogreferenz ab{" "}
              {formatBillingMoney(catalogueProduct.catalogueMonthlyNetMinor, contract.currency)} — nicht
              Vertragspreis
            </p>
          ) : null}
        </div>

        <BillingPanel title="Vertragsdetails">
          <BillingDefinitionList>
            <BillingDefinitionItem label="Kunde">
              {customer ? (
                <Link
                  href={`/dashboard/admin/commercial/billing/customers/${customer.key}`}
                  className="hover:underline"
                >
                  {customer.displayName}
                </Link>
              ) : (
                "—"
              )}
            </BillingDefinitionItem>
            <BillingDefinitionItem label="Produkt">{contract.productName}</BillingDefinitionItem>
            <BillingDefinitionItem label="Vertragsbeginn">
              {formatBillingDateDisplay(contract.startDate)}
            </BillingDefinitionItem>
            <BillingDefinitionItem label="Vertragsende">
              {formatBillingDateDisplay(contract.endDate)}
            </BillingDefinitionItem>
            <BillingDefinitionItem label="Abrechnung">
              {presentBillingInterval(contract.billingInterval)}
            </BillingDefinitionItem>
            <BillingDefinitionItem label="Zahlungsziel">
              {contract.paymentTermsDays} Tage
            </BillingDefinitionItem>
            <BillingDefinitionItem label="MWST">{vatLabel}</BillingDefinitionItem>
          </BillingDefinitionList>
        </BillingPanel>

        <BillingPanel title="Zugehörige Rechnungen">
          {relatedInvoices.length === 0 ? (
            <p className="text-sm text-[var(--text-2)]">Noch keine Rechnungen zu diesem Vertrag.</p>
          ) : (
            <BillingDataTableShell>
              <BillingDataTableHead>
                <tr>
                  <BillingDataTableHeaderCell>Rechnung</BillingDataTableHeaderCell>
                  <BillingDataTableHeaderCell>Status</BillingDataTableHeaderCell>
                  <BillingDataTableHeaderCell align="right">Betrag</BillingDataTableHeaderCell>
                </tr>
              </BillingDataTableHead>
              <tbody>
                {relatedInvoices.map((invoice) => {
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
                      <BillingDataTableCell>
                        <BillingStatusBadge label={status.label.toUpperCase()} tone={status.tone} />
                      </BillingDataTableCell>
                      <BillingDataTableCell align="right">
                        {formatBillingMoney(invoice.grossTotalMinor, invoice.currency)}
                      </BillingDataTableCell>
                    </BillingDataTableRow>
                  );
                })}
              </tbody>
            </BillingDataTableShell>
          )}
        </BillingPanel>
      </div>
    </BillingWorkspaceContent>
  );
}
