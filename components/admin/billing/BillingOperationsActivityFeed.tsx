import Link from "next/link";
import BillingEmptyState from "@/components/admin/billing/shell/BillingEmptyState";
import BillingPanel from "@/components/admin/billing/shell/BillingPanel";
import { formatBillingDateDisplay } from "@/lib/billing/native-billing-presentation";
import type { BillingActivityItem } from "@/lib/billing/operations/billing-operations-types";

type Props = {
  items: BillingActivityItem[];
};

const KIND_LABELS: Record<string, string> = {
  INVOICE_FINALIZED: "Finalisiert",
  INVOICE_SENT: "Versendet",
  INVOICE_DELIVERY_FAILED: "Versand fehlgeschlagen",
  PAYMENT_RECORDED: "Zahlung erfasst",
  PAYMENT_REVERSED: "Zahlung storniert",
  CAMT054_IMPORTED: "Bankimport",
  OTHER: "Aktivität",
};

export default function BillingOperationsActivityFeed({ items }: Props) {
  if (items.length === 0) {
    return (
      <BillingEmptyState
        title="Noch keine Aktivitäten"
        description="Rechnungs-, Zahlungs- und Abgleichsereignisse erscheinen hier in chronologischer Form."
      />
    );
  }

  return (
    <ol className="relative space-y-0 border-l border-[color-mix(in_srgb,var(--border)_50%,transparent)] ml-2 pl-5">
      {items.map((item) => (
        <li key={item.id} className="relative pb-5 last:pb-0">
          <span
            className="absolute -left-[1.35rem] top-1.5 h-2 w-2 rounded-full bg-[color-mix(in_srgb,var(--foreground)_35%,transparent)] ring-2 ring-[var(--card)]"
            aria-hidden
          />
          <div className="flex flex-wrap items-start justify-between gap-2 text-sm">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-medium uppercase tracking-wide text-[var(--muted)]">
                {KIND_LABELS[item.kind] ?? item.kind}
              </p>
              {item.href ? (
                <Link href={item.href} className="font-medium text-[var(--foreground)] hover:underline">
                  {item.title}
                </Link>
              ) : (
                <span className="font-medium text-[var(--foreground)]">{item.title}</span>
              )}
              {item.detail ? (
                <p className="mt-0.5 truncate text-[var(--text-2)]">{item.detail}</p>
              ) : null}
            </div>
            <time
              className="shrink-0 text-xs tabular-nums text-[var(--muted)]"
              dateTime={item.occurredAt}
            >
              {formatBillingDateDisplay(item.occurredAt.slice(0, 10))}
            </time>
          </div>
        </li>
      ))}
    </ol>
  );
}
