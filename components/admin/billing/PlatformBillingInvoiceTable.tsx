import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import { EmptyState } from "@/components/ui/page";
import { formatBillingDate } from "@/lib/billing/format-billing-date";
import { formatBillingMoney } from "@/lib/billing/format-billing-money";
import { presentInvoiceStatus } from "@/lib/billing/billing-status-presentation";
import type { PlatformBillingDetailInvoice } from "@/lib/billing/platform-billing-detail-service";
import { ExternalLink } from "lucide-react";

type PlatformBillingInvoiceTableProps = {
  invoices: PlatformBillingDetailInvoice[];
  loadFailed: boolean;
};

export default function PlatformBillingInvoiceTable({
  invoices,
  loadFailed,
}: PlatformBillingInvoiceTableProps) {
  return (
    <section className="space-y-4" aria-labelledby="billing-invoices-heading">
      <h3
        id="billing-invoices-heading"
        className="text-sm font-semibold text-[var(--foreground)]"
      >
        Rechnungshistorie
      </h3>

      {loadFailed && invoices.length === 0 ? (
        <p className="text-sm text-[var(--text-2)]">
          Rechnungen konnten momentan nicht geladen werden.
        </p>
      ) : null}

      {invoices.length === 0 && !loadFailed ? (
        <EmptyState
          heading="Noch keine Rechnungen vorhanden."
          description=""
        />
      ) : null}

      {invoices.length > 0 ? (
        <div className="sce-table-shell overflow-x-auto">
          <table className="sce-table w-full min-w-[880px]">
            <thead>
              <tr>
                <th>Rechnung</th>
                <th>Datum</th>
                <th>Status</th>
                <th>Betrag</th>
                <th>Bezahlt</th>
                <th>Offen</th>
                <th>Fällig am</th>
                <th>
                  <span className="sr-only">Aktionen</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const status = presentInvoiceStatus(invoice.status);
                const label = invoice.number ?? "Rechnung";
                return (
                  <tr key={`${invoice.invoiceDate}-${invoice.number ?? "draft"}`}>
                    <td className="text-sm font-medium text-[var(--foreground)]">
                      {invoice.number ?? "—"}
                    </td>
                    <td className="text-sm text-[var(--text-2)]">
                      {formatBillingDate(invoice.invoiceDate)}
                    </td>
                    <td>
                      <BillingStatusBadge label={status.label} tone={status.tone} />
                    </td>
                    <td className="tabular-nums text-sm">
                      {formatBillingMoney(invoice.total, invoice.currency)}
                    </td>
                    <td className="tabular-nums text-sm">
                      {formatBillingMoney(invoice.amountPaid, invoice.currency)}
                    </td>
                    <td className="tabular-nums text-sm">
                      {invoice.amountOpen > 0
                        ? formatBillingMoney(invoice.amountOpen, invoice.currency)
                        : "—"}
                    </td>
                    <td className="text-sm text-[var(--text-2)]">
                      {formatBillingDate(invoice.dueDate)}
                    </td>
                    <td>
                      {invoice.hostedInvoiceUrl ? (
                        <a
                          href={invoice.hostedInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-[var(--primary)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                          aria-label={`Rechnung ${label} in Stripe öffnen`}
                        >
                          Öffnen
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        </a>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
