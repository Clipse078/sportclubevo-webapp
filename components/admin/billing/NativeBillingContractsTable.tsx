import Link from "next/link";
import type { BillingContractStatus, SwissVatTreatment } from "@prisma/client";
import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import { formatBillingMoney } from "@/lib/billing/format-billing-money";
import {
  formatBillingDateDisplay,
  presentBillingContractStatus,
  presentSwissVatTreatment,
} from "@/lib/billing/native-billing-presentation";

export type NativeBillingContractRow = {
  key: string;
  contractNumber: string;
  customerLabel: string;
  productName: string;
  monthlyNetAmountMinor: number;
  currency: string;
  vatTreatment: SwissVatTreatment;
  status: BillingContractStatus;
  startDate: string;
  billingIntervalLabel?: string;
};

type Props = {
  rows: NativeBillingContractRow[];
};

export default function NativeBillingContractsTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Noch keine Verträge erfasst.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Vertrag</th>
            <th className="px-4 py-3 font-medium">Kunde</th>
            <th className="px-4 py-3 font-medium">Produkt</th>
            <th className="px-4 py-3 font-medium">Monatspreis netto</th>
            <th className="px-4 py-3 font-medium">Abrechnung</th>
            <th className="px-4 py-3 font-medium">MWST</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Start</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const statusPresentation = presentBillingContractStatus(row.status);
            return (
              <tr key={row.key} className="border-t border-border">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/admin/commercial/billing/contracts/${row.key}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {row.contractNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.customerLabel}</td>
                <td className="px-4 py-3">{row.productName}</td>
                <td className="px-4 py-3 tabular-nums">
                  {formatBillingMoney(row.monthlyNetAmountMinor, row.currency)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.billingIntervalLabel ?? "Monatlich"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {presentSwissVatTreatment(row.vatTreatment)}
                </td>
                <td className="px-4 py-3">
                  <BillingStatusBadge
                    label={statusPresentation.label}
                    tone={statusPresentation.tone}
                  />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatBillingDateDisplay(row.startDate)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
