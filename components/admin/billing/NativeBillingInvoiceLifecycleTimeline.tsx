import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import { formatBillingDateDisplay } from "@/lib/billing/native-billing-presentation";
import type { SerializedInvoiceDeliverySummary } from "@/lib/billing/invoice-delivery/invoice-delivery-serializers";
import type { SerializedInvoicePaymentSummary } from "@/lib/billing/invoice-payments/invoice-payment-serializers";

type TimelineEvent = {
  id: string;
  label: string;
  detail?: string | null;
  at: string;
  tone?: "default" | "success" | "warning" | "muted";
};

type Props = {
  invoiceCreatedAt: string | null;
  finalizedAt: string | null;
  delivery: SerializedInvoiceDeliverySummary | null;
  paymentSummary: SerializedInvoicePaymentSummary | null;
};

function pushEvent(events: TimelineEvent[], event: TimelineEvent | null) {
  if (event) events.push(event);
}

export default function NativeBillingInvoiceLifecycleTimeline({
  invoiceCreatedAt,
  finalizedAt,
  delivery,
  paymentSummary,
}: Props) {
  const events: TimelineEvent[] = [];

  pushEvent(events, invoiceCreatedAt
    ? {
        id: "created",
        label: "Rechnung erstellt",
        at: invoiceCreatedAt,
        tone: "muted",
      }
    : null);

  pushEvent(events, finalizedAt
    ? {
        id: "finalized",
        label: "Finalisiert",
        at: finalizedAt,
        tone: "default",
      }
    : null);

  if (delivery?.latestSentAt) {
    pushEvent(events, {
      id: "sent",
      label: "Per E-Mail versendet",
      detail: delivery.latestRecipientEmail,
      at: delivery.latestSentAt,
      tone: "success",
    });
  } else if (delivery?.aggregateStatus === "FAILED") {
    pushEvent(events, {
      id: "send-failed",
      label: "Versand fehlgeschlagen",
      at: delivery.attempts[0]?.failedAt ?? delivery.attempts[0]?.createdAt ?? finalizedAt ?? invoiceCreatedAt ?? "",
      tone: "warning",
    });
  }

  if (paymentSummary?.payments?.length) {
    for (const payment of paymentSummary.payments) {
      if (payment.status === "REVERSED") continue;
      pushEvent(events, {
        id: `payment-${payment.key}`,
        label: "Zahlung erfasst",
        detail: payment.amountFormatted,
        at: payment.paymentDate,
        tone: "success",
      });
    }
  }

  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  if (events.length === 0) {
    return <p className="text-sm text-[var(--text-2)]">Noch keine Lebenszyklus-Ereignisse.</p>;
  }

  return (
    <ol className="relative ml-2 space-y-0 border-l border-[color-mix(in_srgb,var(--border)_50%,transparent)] pl-5">
      {events.map((event) => (
        <li key={event.id} className="relative pb-4 last:pb-0">
          <span
            className="absolute -left-[1.35rem] top-1.5 h-2 w-2 rounded-full bg-[color-mix(in_srgb,var(--foreground)_35%,transparent)] ring-2 ring-[var(--card)]"
            aria-hidden
          />
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <BillingStatusBadge label={event.label} tone={event.tone ?? "default"} />
              {event.detail ? (
                <p className="mt-1 text-sm text-[var(--text-2)]">{event.detail}</p>
              ) : null}
            </div>
            <time
              className="text-xs tabular-nums text-[var(--muted)]"
              dateTime={event.at}
            >
              {formatBillingDateDisplay(event.at.slice(0, 10))}
            </time>
          </div>
        </li>
      ))}
    </ol>
  );
}
