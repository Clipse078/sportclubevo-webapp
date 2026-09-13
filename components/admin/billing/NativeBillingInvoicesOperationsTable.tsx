"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
  presentNativeInvoiceStatus,
} from "@/lib/billing/native-billing-presentation";
import type { BillingInvoiceOperationalRow } from "@/lib/billing/operations/billing-operations-types";

type Props = {
  rows: BillingInvoiceOperationalRow[];
  customerOptions: { key: string; label: string }[];
};

const DELIVERY_LABELS: Record<BillingInvoiceOperationalRow["deliveryStatus"], string> = {
  NOT_SENT: "Noch nicht versendet",
  SENDING: "Wird gesendet",
  SENT: "Versendet",
  FAILED: "Versand fehlgeschlagen",
};

function presentOperationalStatus(row: BillingInvoiceOperationalRow) {
  if (row.operationalStatus === "OVERDUE") {
    return { label: "Überfällig", tone: "warning" as const };
  }
  return presentNativeInvoiceStatus(row.operationalStatus);
}

export default function NativeBillingInvoicesOperationsTable({
  rows,
  customerOptions,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [customerFilter, setCustomerFilter] = useState<string>("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "ALL" && row.operationalStatus !== statusFilter) {
        return false;
      }
      if (customerFilter !== "ALL" && row.customerKey !== customerFilter) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        row.displayNumber,
        row.invoiceNumber,
        row.customerLabel,
        row.customerKey,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, query, statusFilter, customerFilter]);

  if (rows.length === 0) {
    return (
      <BillingEmptyState
        title="Noch keine Rechnungen"
        description="Finalisierte und offene Rechnungen erscheinen hier mit Versand- und Zahlungsstatus."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          <span className="text-[var(--muted)]">Suche</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechnungsnummer, Kunde …"
            className="fca-input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--muted)]">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="fca-input min-w-[10rem]"
          >
            <option value="ALL">Alle</option>
            <option value="DRAFT">Entwurf</option>
            <option value="FINALIZED">Finalisiert</option>
            <option value="OPEN">Offen</option>
            <option value="PARTIALLY_PAID">Teilweise bezahlt</option>
            <option value="PAID">Bezahlt</option>
            <option value="OVERDUE">Überfällig</option>
            <option value="VOID">Storniert</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--muted)]">Kunde</span>
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="fca-input min-w-[12rem]"
          >
            <option value="ALL">Alle Kunden</option>
            {customerOptions.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-xs text-[var(--muted)]">
        {filtered.length} von {rows.length} Rechnungen
      </p>

      {filtered.length === 0 ? (
        <BillingEmptyState
          title="Keine Treffer"
          description="Passen Sie Suche oder Filter an, um Rechnungen anzuzeigen."
        />
      ) : (
        <BillingDataTableShell>
          <BillingDataTableHead>
            <tr>
              <BillingDataTableHeaderCell>Rechnung</BillingDataTableHeaderCell>
              <BillingDataTableHeaderCell>Kunde</BillingDataTableHeaderCell>
              <BillingDataTableHeaderCell>Rechnungsdatum</BillingDataTableHeaderCell>
              <BillingDataTableHeaderCell>Fällig</BillingDataTableHeaderCell>
              <BillingDataTableHeaderCell align="right">Betrag</BillingDataTableHeaderCell>
              <BillingDataTableHeaderCell align="right">Bezahlt</BillingDataTableHeaderCell>
              <BillingDataTableHeaderCell align="right">Offen</BillingDataTableHeaderCell>
              <BillingDataTableHeaderCell>Versand</BillingDataTableHeaderCell>
              <BillingDataTableHeaderCell>Status</BillingDataTableHeaderCell>
            </tr>
          </BillingDataTableHead>
          <tbody>
            {filtered.map((row) => {
              const statusPresentation = presentOperationalStatus(row);
              const deliveryLabel = DELIVERY_LABELS[row.deliveryStatus];
              const isDraft = row.operationalStatus === "DRAFT";
              const href = `/dashboard/admin/commercial/billing/invoices/${row.key}`;
              return (
                <BillingDataTableRow
                  key={row.key}
                  className="cursor-pointer"
                  onClick={() => router.push(href)}
                >
                  <BillingDataTableCell>
                    <Link
                      href={href}
                      className={`font-medium hover:underline ${
                        isDraft ? "text-[var(--muted)] italic" : "text-[var(--foreground)]"
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {row.displayNumber}
                    </Link>
                  </BillingDataTableCell>
                  <BillingDataTableCell className="text-[var(--text-2)]">
                    {row.customerLabel}
                  </BillingDataTableCell>
                  <BillingDataTableCell className="text-[var(--text-2)]">
                    {formatBillingDateDisplay(row.invoiceDate)}
                  </BillingDataTableCell>
                  <BillingDataTableCell className="text-[var(--text-2)]">
                    {formatBillingDateDisplay(row.dueDate)}
                  </BillingDataTableCell>
                  <BillingDataTableCell align="right">
                    {formatBillingMoney(row.grossTotalMinor, row.currency)}
                  </BillingDataTableCell>
                  <BillingDataTableCell align="right" className="text-[var(--muted)]">
                    {formatBillingMoney(row.paidTotalMinor, row.currency)}
                  </BillingDataTableCell>
                  <BillingDataTableCell align="right">
                    {formatBillingMoney(row.outstandingMinor, row.currency)}
                  </BillingDataTableCell>
                  <BillingDataTableCell className="text-[var(--text-2)]">
                    {deliveryLabel}
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
      )}
    </div>
  );
}
