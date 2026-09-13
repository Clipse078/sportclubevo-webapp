import Link from "next/link";
import { formatBillingMoney } from "@/lib/billing/format-billing-money";
import { formatBillingDateDisplay } from "@/lib/billing/native-billing-presentation";
import type { BillingAttentionItem } from "@/lib/billing/operations/billing-operations-types";

type Props = {
  items: BillingAttentionItem[];
};

export default function BillingOperationsAttentionQueue({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Keine offenen Punkte — Abrechnung ist auf dem aktuellen Stand.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border/60">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 space-y-1">
            <p className="font-medium text-foreground">{item.title}</p>
            <p className="text-sm text-muted-foreground">{item.reason}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {item.customerName ? <span>{item.customerName}</span> : null}
              {item.amountMinor != null && item.currency ? (
                <span className="tabular-nums">
                  {formatBillingMoney(item.amountMinor, item.currency)}
                </span>
              ) : null}
              {item.statusLabel ? <span>{item.statusLabel}</span> : null}
              {item.ageDate ? (
                <span>{formatBillingDateDisplay(item.ageDate)}</span>
              ) : null}
            </div>
          </div>
          <Link href={item.href} className="fca-button-secondary shrink-0 text-sm">
            {item.actionLabel}
          </Link>
        </div>
      ))}
    </div>
  );
}
