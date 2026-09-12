"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import type { SerializedInvoiceDeliverySummary } from "@/lib/billing/invoice-delivery/invoice-delivery-serializers";

type Props = {
  invoiceKey: string;
  invoiceNumber: string | null;
  grossTotalFormatted: string;
  recipientEmail: string | null;
  canManage: boolean;
  status: string;
  initialDelivery: SerializedInvoiceDeliverySummary | null;
};

function deliveryTone(
  aggregateStatus: string,
): "default" | "success" | "warning" | "muted" {
  switch (aggregateStatus) {
    case "SENT":
      return "success";
    case "FAILED":
      return "warning";
    case "SENDING":
      return "default";
    default:
      return "muted";
  }
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default function NativeBillingInvoiceDeliverySection({
  invoiceKey,
  invoiceNumber,
  grossTotalFormatted,
  recipientEmail,
  canManage,
  status,
  initialDelivery,
}: Props) {
  const router = useRouter();
  const [delivery, setDelivery] = useState<SerializedInvoiceDeliverySummary | null>(
    initialDelivery,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmMode, setConfirmMode] = useState<"send" | "resend" | null>(null);
  const [optimisticSending, setOptimisticSending] = useState(false);

  const refreshDelivery = useCallback(async () => {
    const res = await fetch(
      `/api/platform/billing/invoices/${encodeURIComponent(invoiceKey)}/deliveries`,
    );
    if (!res.ok) return;
    const data = (await res.json()) as { delivery: SerializedInvoiceDeliverySummary };
    setDelivery(data.delivery);
  }, [invoiceKey]);

  useEffect(() => {
    setDelivery(initialDelivery);
  }, [initialDelivery]);

  async function sendInvoice(resend: boolean, simulateFailure = false) {
    setLoading(true);
    setOptimisticSending(true);
    setError(null);
    setConfirmMode(null);
    try {
      const res = await fetch(
        `/api/platform/billing/invoices/${encodeURIComponent(invoiceKey)}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resend, simulateFailure }),
        },
      );
      const data = (await res.json()) as {
        error?: string;
        summary?: SerializedInvoiceDeliverySummary;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Versand fehlgeschlagen.");
      }
      if (data.summary) {
        setDelivery(data.summary);
      } else {
        await refreshDelivery();
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Versand fehlgeschlagen.");
      await refreshDelivery();
    } finally {
      setLoading(false);
      setOptimisticSending(false);
    }
  }

  const serverAggregateStatus = delivery?.aggregateStatus ?? "NOT_SENT";
  const aggregateStatus =
    optimisticSending || loading ? "SENDING" : serverAggregateStatus;
  const aggregateStatusLabel = (() => {
    switch (aggregateStatus) {
      case "SENDING":
        return "Wird gesendet";
      case "SENT":
        return "Gesendet";
      case "FAILED":
        return "Fehlgeschlagen";
      default:
        return delivery?.aggregateStatusLabel ?? "Noch nicht gesendet";
    }
  })();

  if (status !== "FINALIZED") {
    return null;
  }

  const displayRecipient =
    delivery?.latestRecipientEmail ?? recipientEmail ?? "—";
  const actionsLocked =
    loading || optimisticSending || serverAggregateStatus === "SENDING";
  const hasSuccessfulSend = delivery?.attempts.some((attempt) => attempt.status === "SENT");
  const canInteract =
    canManage && Boolean(recipientEmail) && !actionsLocked;
  const showResend = canInteract && hasSuccessfulSend;
  const showFirstSend = canInteract && !hasSuccessfulSend;
  const showRetryAfterFailure =
    canInteract && aggregateStatus === "FAILED" && !hasSuccessfulSend;

  return (
    <section className="space-y-3 max-w-3xl">
      <h2 className="text-sm font-semibold">Versand</h2>

      <div className="rounded-lg border border-border p-4 space-y-4">
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Empfänger</dt>
            <dd className="font-medium break-all">{displayRecipient}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <BillingStatusBadge
                label={aggregateStatusLabel}
                tone={deliveryTone(aggregateStatus)}
              />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Gesendet am</dt>
            <dd className="font-medium">
              {formatDateTime(delivery?.latestSentAt ?? null)}
            </dd>
          </div>
        </dl>

        {aggregateStatus === "SENDING" ? (
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            Wird gesendet… Bitte warten Sie, bis der Versand abgeschlossen ist.
          </p>
        ) : null}

        {aggregateStatus === "FAILED" && !error ? (
          <p className="text-sm text-destructive">
            Die Rechnung konnte nicht gesendet werden. Sie können den Versand erneut
            versuchen.
          </p>
        ) : null}

        {!recipientEmail ? (
          <p className="text-sm text-destructive">
            Für den Rechnungsempfänger ist keine Rechnungs-E-Mail hinterlegt. Versand ist
            blockiert.
          </p>
        ) : null}

        {confirmMode === "send" ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
            <p className="text-sm font-semibold">Rechnung senden?</p>
            <p className="text-sm text-muted-foreground">
              Die Rechnung wird per E-Mail an den Empfänger versendet. Diese Aktion kann nicht
              rückgängig gemacht werden.
            </p>
            <dl className="text-sm space-y-1">
              <div className="flex gap-2">
                <dt className="text-muted-foreground min-w-24">Empfänger:</dt>
                <dd className="font-medium break-all">{recipientEmail}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground min-w-24">Rechnung:</dt>
                <dd className="font-medium">{invoiceNumber ?? "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground min-w-24">Betrag:</dt>
                <dd className="font-medium">{grossTotalFormatted}</dd>
              </div>
            </dl>
            <p className="text-sm text-muted-foreground">
              Die finalisierte Rechnung wird als PDF angehängt.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="fca-button-secondary"
                disabled={loading}
                onClick={() => setConfirmMode(null)}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="fca-button-primary"
                disabled={loading}
                onClick={() => sendInvoice(false)}
              >
                Rechnung senden
              </button>
            </div>
          </div>
        ) : null}

        {confirmMode === "resend" ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
            <p className="text-sm font-semibold">Rechnung erneut senden?</p>
            <p className="text-sm text-muted-foreground">
              Diese Rechnung wurde bereits gesendet. Eine weitere Kopie der finalisierten
              Rechnung wird per E-Mail versendet.
            </p>
            <dl className="text-sm space-y-1">
              <div className="flex gap-2">
                <dt className="text-muted-foreground min-w-24">Empfänger:</dt>
                <dd className="font-medium break-all">{recipientEmail}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground min-w-24">Rechnung:</dt>
                <dd className="font-medium">{invoiceNumber ?? "—"}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="fca-button-secondary"
                disabled={loading}
                onClick={() => setConfirmMode(null)}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="fca-button-primary"
                disabled={loading}
                onClick={() => sendInvoice(true)}
              >
                Erneut senden
              </button>
            </div>
          </div>
        ) : null}

        {!confirmMode ? (
          <div className="flex flex-wrap gap-2 items-center">
            {showFirstSend ? (
              <button
                type="button"
                className="fca-button-primary"
                disabled={!recipientEmail}
                onClick={() => setConfirmMode("send")}
              >
                Rechnung senden
              </button>
            ) : null}
            {showResend ? (
              <button
                type="button"
                className="fca-button-secondary"
                onClick={() => setConfirmMode("resend")}
              >
                Erneut senden
              </button>
            ) : null}
            {showRetryAfterFailure ? (
              <button
                type="button"
                className="fca-button-primary"
                onClick={() => setConfirmMode("send")}
              >
                Erneut versuchen
              </button>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {delivery && delivery.attempts.length > 0 ? (
          <div className="space-y-2 pt-2 border-t border-border">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Versandhistorie
            </h3>
            <ul className="space-y-2 text-sm">
              {delivery.attempts.map((attempt) => (
                <li
                  key={attempt.key}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-md bg-muted/30 px-3 py-2"
                >
                  <div>
                    <span className="font-medium">#{attempt.attemptNumber}</span>
                    <span className="text-muted-foreground"> · {attempt.recipientEmail}</span>
                  </div>
                  <div className="text-right">
                    <p>{attempt.statusLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(attempt.sentAt ?? attempt.failedAt ?? attempt.createdAt)}
                    </p>
                    {attempt.errorMessage ? (
                      <p className="text-xs text-destructive max-w-xs">
                        {attempt.errorMessage}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
