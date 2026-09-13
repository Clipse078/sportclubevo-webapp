"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BillingContractStatus, SwissVatTreatment } from "@prisma/client";
import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import BillingEmptyState from "@/components/admin/billing/shell/BillingEmptyState";
import BillingDataTableShell, {
  BillingDataTableCell,
  BillingDataTableHead,
  BillingDataTableHeaderCell,
  BillingDataTableRow,
} from "@/components/admin/billing/shell/BillingDataTable";
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
  endDate?: string | null;
  billingIntervalLabel?: string;
};

type Props = {
  rows: NativeBillingContractRow[];
};

export default function NativeBillingContractsTable({ rows }: Props) {
  const router = useRouter();

  if (rows.length === 0) {
    return (
      <BillingEmptyState
        title="Noch keine Verträge"
        description="Aktive Verträge mit Preisen und Abrechnungsintervall erscheinen hier."
      />
    );
  }

  return (
    <BillingDataTableShell>
      <BillingDataTableHead>
        <tr>
          <BillingDataTableHeaderCell>Vertrag</BillingDataTableHeaderCell>
          <BillingDataTableHeaderCell>Kunde</BillingDataTableHeaderCell>
          <BillingDataTableHeaderCell>Produkt</BillingDataTableHeaderCell>
          <BillingDataTableHeaderCell align="right">Monatspreis</BillingDataTableHeaderCell>
          <BillingDataTableHeaderCell>Abrechnung</BillingDataTableHeaderCell>
          <BillingDataTableHeaderCell>MWST</BillingDataTableHeaderCell>
          <BillingDataTableHeaderCell>Start</BillingDataTableHeaderCell>
          <BillingDataTableHeaderCell>Status</BillingDataTableHeaderCell>
        </tr>
      </BillingDataTableHead>
      <tbody>
        {rows.map((row) => {
          const statusPresentation = presentBillingContractStatus(row.status);
          const href = `/dashboard/admin/commercial/billing/contracts/${row.key}`;
          return (
            <BillingDataTableRow
              key={row.key}
              className="cursor-pointer"
              onClick={() => router.push(href)}
            >
              <BillingDataTableCell>
                <Link
                  href={href}
                  className="font-medium text-[var(--foreground)] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {row.contractNumber}
                </Link>
              </BillingDataTableCell>
              <BillingDataTableCell className="text-[var(--text-2)]">
                {row.customerLabel}
              </BillingDataTableCell>
              <BillingDataTableCell>{row.productName}</BillingDataTableCell>
              <BillingDataTableCell align="right">
                {formatBillingMoney(row.monthlyNetAmountMinor, row.currency)}
              </BillingDataTableCell>
              <BillingDataTableCell className="text-[var(--text-2)]">
                {row.billingIntervalLabel ?? "Monatlich"}
              </BillingDataTableCell>
              <BillingDataTableCell className="text-[var(--text-2)]">
                {presentSwissVatTreatment(row.vatTreatment)}
              </BillingDataTableCell>
              <BillingDataTableCell className="text-[var(--text-2)]">
                {formatBillingDateDisplay(row.startDate)}
              </BillingDataTableCell>
              <BillingDataTableCell>
                <BillingStatusBadge
                  label={statusPresentation.label}
                  tone={statusPresentation.tone}
                />
              </BillingDataTableCell>
            </BillingDataTableRow>
          );
        })}
      </tbody>
    </BillingDataTableShell>
  );
}
