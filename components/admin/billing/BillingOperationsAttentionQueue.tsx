import Link from "next/link";
import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import BillingEmptyState from "@/components/admin/billing/shell/BillingEmptyState";
import BillingPanel from "@/components/admin/billing/shell/BillingPanel";
import { formatBillingMoney } from "@/lib/billing/format-billing-money";
import {
  formatBillingDateDisplay,
  presentNativeInvoiceStatus,
} from "@/lib/billing/native-billing-presentation";
import type { BillingAttentionItem } from "@/lib/billing/operations/billing-operations-types";

type Props = {
  items: BillingAttentionItem[];
};

export default function BillingOperationsAttentionQueue({ items }: Props) {
  if (items.length === 0) {
    return (
      <BillingEmptyState
        title="Alles erledigt"
        description="Keine offenen Punkte — Abrechnung ist auf dem aktuellen Stand."
      />
    );
  }

  return (
    <BillingPanel padding="none" className="divide-y divide-[color-mix(in_srgb,var(--border)_45%,transparent)]">
      {items.map((item) => {
        const statusLabel =
          item.kind === "INVOICE_UNSENT" && item.statusLabel
            ? `Finalisiert · ${item.statusLabel === "Nicht versendet" ? "Noch nicht versendet" : item.statusLabel}`
            : item.statusLabel;

        return (
          <article
            key={item.id}
            className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-2">
              <p className="font-medium text-[var(--foreground)]">{item.title}</p>
              <p className="text-sm text-[var(--text-2)]">{item.reason}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                {item.customerName ? (
                  <span className="text-[var(--foreground)]">{item.customerName}</span>
                ) : null}
                {item.amountMinor != null && item.currency ? (
                  <span className="font-medium tabular-nums text-[var(--foreground)]">
                    {formatBillingMoney(item.amountMinor, item.currency)}
                  </span>
                ) : null}
                {item.ageDate ? (
                  <span className="text-[var(--muted)]">
                    Fällig {formatBillingDateDisplay(item.ageDate)}
                  </span>
                ) : null}
                {statusLabel ? (
                  <BillingStatusBadge
                    label={statusLabel}
                    tone={
                      item.kind === "INVOICE_OVERDUE"
                        ? "warning"
                        : item.kind === "INVOICE_UNSENT"
                          ? "muted"
                          : "default"
                    }
                  />
                ) : null}
              </div>
            </div>
            <Link
              href={item.href}
              className="fca-button-secondary shrink-0 text-sm"
            >
              {item.actionLabel}
            </Link>
          </article>
        );
      })}
    </BillingPanel>
  );
}
