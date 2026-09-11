import Link from "next/link";
import type { InvoiceStatus } from "@prisma/client";
import { formatBillingMoney } from "@/lib/billing/format-billing-money";

export type NativeBillingInvoiceRow = {
  key: string;
  displayNumber: string;
  customerLabel: string;
  periodLabel: string;
  invoiceDate: string | null;
  netTotalMinor: number;
  vatTotalMinor: number;
  grossTotalMinor: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: string | null;
};

type Props = {
  rows: NativeBillingInvoiceRow[];
};

export default function NativeBillingInvoicesTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Noch keine Rechnungen erfasst.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Rechnung</th>
            <th className="px-4 py-3 font-medium">Kunde</th>
            <th className="px-4 py-3 font-medium">Leistungszeitraum</th>
            <th className="px-4 py-3 font-medium">Datum</th>
            <th className="px-4 py-3 font-medium">Netto</th>
            <th className="px-4 py-3 font-medium">MWST</th>
            <th className="px-4 py-3 font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Fällig</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-border">
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/admin/commercial/billing/invoices/${row.key}`}
                  className="font-medium text-primary hover:underline"
                >
                  {row.displayNumber}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{row.customerLabel}</td>
              <td className="px-4 py-3 text-muted-foreground">{row.periodLabel}</td>
              <td className="px-4 py-3 text-muted-foreground">{row.invoiceDate ?? "—"}</td>
              <td className="px-4 py-3 tabular-nums">
                {formatBillingMoney(row.netTotalMinor, row.currency)}
              </td>
              <td className="px-4 py-3 tabular-nums">
                {formatBillingMoney(row.vatTotalMinor, row.currency)}
              </td>
              <td className="px-4 py-3 tabular-nums font-medium">
                {formatBillingMoney(row.grossTotalMinor, row.currency)}
              </td>
              <td className="px-4 py-3">{row.status}</td>
              <td className="px-4 py-3 text-muted-foreground">{row.dueDate ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
