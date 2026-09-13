"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BillingCustomerStatus } from "@prisma/client";
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
  presentBillingCustomerStatus,
} from "@/lib/billing/native-billing-presentation";

export type NativeBillingCustomerRow = {
  key: string;
  displayName: string;
  legalName: string | null;
  status: BillingCustomerStatus;
  activeContractCount?: number;
  openBalanceMinor?: number;
  overdueBalanceMinor?: number;
  currency?: string;
  billingHealthLabel?: string;
  billingHealthTone?: "success" | "warning" | "muted" | "default";
  lastInvoiceLabel?: string | null;
  lastInvoiceDate?: string | null;
};

type Props = {
  rows: NativeBillingCustomerRow[];
  canManage?: boolean;
};

export default function NativeBillingCustomersTable({ rows, canManage = false }: Props) {
  const router = useRouter();

  if (rows.length === 0) {
    return (
      <BillingEmptyState
        title="Noch keine Kunden"
        description="Native SCE Billing-Kunden erscheinen hier mit Salden, Verträgen und Abrechnungsstatus."
        action={
          canManage ? (
            <Link href="/dashboard/admin/commercial/billing/customers/new" className="fca-button-primary">
              Neuer Kunde
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <BillingDataTableShell>
      <BillingDataTableHead>
        <tr>
          <BillingDataTableHeaderCell>Kunde</BillingDataTableHeaderCell>
          <BillingDataTableHeaderCell>Kundennummer</BillingDataTableHeaderCell>
          <BillingDataTableHeaderCell align="right">Verträge</BillingDataTableHeaderCell>
          <BillingDataTableHeaderCell align="right">Offen</BillingDataTableHeaderCell>
          <BillingDataTableHeaderCell align="right">Überfällig</BillingDataTableHeaderCell>
          <BillingDataTableHeaderCell>Letzte Rechnung</BillingDataTableHeaderCell>
          <BillingDataTableHeaderCell>Status</BillingDataTableHeaderCell>
        </tr>
      </BillingDataTableHead>
      <tbody>
        {rows.map((row) => {
          const statusPresentation = presentBillingCustomerStatus(row.status);
          const href = `/dashboard/admin/commercial/billing/customers/${row.key}`;
          return (
            <BillingDataTableRow
              key={row.key}
              className="cursor-pointer group"
              onClick={() => router.push(href)}
            >
              <BillingDataTableCell>
                <Link
                  href={href}
                  className="text-base font-semibold text-[var(--foreground)] group-hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {row.displayName}
                </Link>
                {row.legalName && row.legalName !== row.displayName ? (
                  <div className="text-sm text-[var(--text-2)]">{row.legalName}</div>
                ) : null}
              </BillingDataTableCell>
              <BillingDataTableCell className="font-mono text-[0.7rem] text-[var(--muted)]">
                {row.key}
              </BillingDataTableCell>
              <BillingDataTableCell align="right" className="tabular-nums text-[var(--text-2)]">
                {row.activeContractCount ?? "—"}
              </BillingDataTableCell>
              <BillingDataTableCell align="right" className="tabular-nums font-medium">
                {row.openBalanceMinor != null && row.currency
                  ? formatBillingMoney(row.openBalanceMinor, row.currency)
                  : "—"}
              </BillingDataTableCell>
              <BillingDataTableCell align="right" className="tabular-nums font-medium">
                {row.overdueBalanceMinor != null && row.currency
                  ? formatBillingMoney(row.overdueBalanceMinor, row.currency)
                  : "—"}
              </BillingDataTableCell>
              <BillingDataTableCell className="text-[var(--text-2)]">
                {row.lastInvoiceLabel ? (
                  <span>
                    <span className="font-medium text-[var(--foreground)]">{row.lastInvoiceLabel}</span>
                    {row.lastInvoiceDate ? (
                      <span className="block text-xs text-[var(--muted)]">
                        {formatBillingDateDisplay(row.lastInvoiceDate)}
                      </span>
                    ) : null}
                  </span>
                ) : (
                  "—"
                )}
              </BillingDataTableCell>
              <BillingDataTableCell>
                <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-1">
                  {row.billingHealthLabel ? (
                    <BillingStatusBadge
                      label={row.billingHealthLabel}
                      tone={row.billingHealthTone ?? "default"}
                    />
                  ) : null}
                  <BillingStatusBadge
                    label={statusPresentation.label}
                    tone={statusPresentation.tone}
                  />
                </div>
              </BillingDataTableCell>
            </BillingDataTableRow>
          );
        })}
      </tbody>
    </BillingDataTableShell>
  );
}
