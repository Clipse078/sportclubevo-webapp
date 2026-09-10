"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import { formatBillingMoney } from "@/lib/billing/format-billing-money";
import {
  pickPrimarySubscription,
  presentInvoiceStatus,
  presentSubscriptionStatus,
} from "@/lib/billing/billing-status-presentation";
import { computeTenantMrrMinorUnits } from "@/lib/billing/billing-kpi";
import { formatBillingDate } from "@/lib/billing/format-billing-date";
import type { PlatformBillingTenantRow } from "@/lib/billing/platform-billing-overview-service";

type PlatformBillingOverviewTableProps = {
  rows: PlatformBillingTenantRow[];
};

function billingDetailHref(tenantId: string): string {
  return `/dashboard/admin/commercial/billing/${tenantId}`;
}

export default function PlatformBillingOverviewTable({
  rows,
}: PlatformBillingOverviewTableProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.tenantName.toLowerCase().includes(q) ||
        row.tenantKey.toLowerCase().includes(q),
    );
  }, [query, rows]);

  return (
    <div className="space-y-4">
      <div className="sce-page-search">
        <Search className="h-4 w-4 shrink-0 text-[var(--muted)]" />
        <input
          type="text"
          placeholder="Club suchen…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="sce-table-shell overflow-x-auto">
        <table className="sce-table w-full min-w-[960px]">
          <thead>
            <tr>
              <th>Club</th>
              <th>Plan</th>
              <th>Abonnement</th>
              <th>Monatswert</th>
              <th>Letzte Rechnung</th>
              <th>Rechnungsstatus</th>
              <th>Offener Betrag</th>
              <th>Fällig am</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              if (row.kind === "error") {
                return (
                  <tr key={row.tenantId}>
                    <td>
                      <div className="font-medium text-[var(--foreground)]">{row.tenantName}</div>
                      <div className="text-xs text-[var(--muted)]">{row.tenantKey}</div>
                    </td>
                    <td colSpan={6}>
                      <span className="text-sm text-[var(--sce-warning)]">{row.message}</span>
                    </td>
                    <td>
                      <BillingStatusBadge label="Fehler" tone="warning" />
                    </td>
                  </tr>
                );
              }

              const summary = row.summary;
              const primarySub = pickPrimarySubscription(summary.subscriptions);
              const subPresentation = primarySub
                ? presentSubscriptionStatus(primarySub.status)
                : presentSubscriptionStatus(null);
              const invoice = summary.latestInvoice;
              const invoicePresentation = presentInvoiceStatus(invoice?.status);
              const currency = summary.currency ?? invoice?.currency ?? "chf";
              const mrr = computeTenantMrrMinorUnits(summary);
              return (
                <tr key={row.tenantId}>
                  <td>
                    <Link
                      href={billingDetailHref(row.tenantId)}
                      className="group block rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      <div className="font-medium text-[var(--foreground)] group-hover:text-[var(--primary)]">
                        {row.tenantName}
                      </div>
                      <div className="text-xs text-[var(--muted)]">{row.tenantKey}</div>
                    </Link>
                  </td>
                  <td className="text-sm text-[var(--text-2)]">
                    {primarySub?.planName ?? "—"}
                  </td>
                  <td>
                    {summary.subscriptions.length === 0 ? (
                      <BillingStatusBadge label="Kein Abo" tone="muted" />
                    ) : (
                      <BillingStatusBadge
                        label={subPresentation.label}
                        tone={subPresentation.tone}
                      />
                    )}
                  </td>
                  <td className="tabular-nums text-sm">
                    {mrr > 0 ? formatBillingMoney(mrr, currency) : "—"}
                  </td>
                  <td className="text-sm text-[var(--text-2)]">
                    {invoice?.number ?? "—"}
                  </td>
                  <td>
                    {invoice ? (
                      <BillingStatusBadge
                        label={invoicePresentation.label}
                        tone={invoicePresentation.tone}
                      />
                    ) : (
                      <BillingStatusBadge label="Keine Rechnung" tone="muted" />
                    )}
                  </td>
                  <td className="tabular-nums text-sm">
                    {summary.outstandingAmount > 0
                      ? formatBillingMoney(summary.outstandingAmount, currency)
                      : "—"}
                  </td>
                  <td className="text-sm text-[var(--text-2)]">
                    {formatBillingDate(invoice?.dueDate)}
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
