"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
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
  NOT_SENT: "Nicht versendet",
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
      <p className="text-sm text-muted-foreground">Noch keine Rechnungen erfasst.</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Suche</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechnungsnummer, Kunde …"
            className="fca-input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="fca-input min-w-[10rem]"
          >
            <option value="ALL">Alle</option>
            <option value="DRAFT">Entwurf</option>
            <option value="FINALIZED">Finalisiert</option>
            <option value="OPEN">Offen</option>
            <option value="PARTIALLY_PAID">Teilbezahlt</option>
            <option value="PAID">Bezahlt</option>
            <option value="OVERDUE">Überfällig</option>
            <option value="VOID">Storniert</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Kunde</span>
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

      <p className="text-xs text-muted-foreground">
        {filtered.length} von {rows.length} Rechnungen
      </p>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Rechnung</th>
              <th className="px-4 py-3 font-medium">Kunde</th>
              <th className="px-4 py-3 font-medium">Datum</th>
              <th className="px-4 py-3 font-medium">Fällig</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
              <th className="px-4 py-3 font-medium text-right">Bezahlt</th>
              <th className="px-4 py-3 font-medium text-right">Offen</th>
              <th className="px-4 py-3 font-medium">Versand</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const statusPresentation = presentOperationalStatus(row);
              const deliveryLabel = DELIVERY_LABELS[row.deliveryStatus];
              const isDraft = row.operationalStatus === "DRAFT";
              return (
                <tr key={row.key} className="border-t border-border">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/admin/commercial/billing/invoices/${row.key}`}
                      className={`font-medium hover:underline ${
                        isDraft ? "text-muted-foreground italic" : "text-primary"
                      }`}
                    >
                      {row.displayNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.customerLabel}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatBillingDateDisplay(row.invoiceDate)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatBillingDateDisplay(row.dueDate)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatBillingMoney(row.grossTotalMinor, row.currency)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {formatBillingMoney(row.paidTotalMinor, row.currency)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {formatBillingMoney(row.outstandingMinor, row.currency)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{deliveryLabel}</td>
                  <td className="px-4 py-3">
                    <BillingStatusBadge
                      label={statusPresentation.label}
                      tone={statusPresentation.tone}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
