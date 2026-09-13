"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import type { SerializedInvoiceDeliverySummary } from "@/lib/billing/invoice-delivery/invoice-delivery-serializers";

type Props = {
  invoiceKey: string;
  invoiceNumber: string | null;
  grossTotalFormatted: string;
  dueDateFormatted: string;
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

function pdfAttachmentName(invoiceNumber: string | null): string {
  return invoiceNumber ? `Rechnung-${invoiceNumber}.pdf` : "Rechnung.pdf";
}

export default function NativeBillingInvoiceSendReviewDialog({
  invoiceKey,
  invoiceNumber,
  grossTotalFormatted,
  dueDateFormatted,
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
  const [dialogOpen, setDialogOpen] = useState(false);

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

  async function sendInvoice() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/platform/billing/invoices/${encodeURIComponent(invoiceKey)}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resend: false }),
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
      setDialogOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Versand fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  if (status !== "FINALIZED" || !canManage) {
    return null;
  }

  const aggregateStatus = delivery?.aggregateStatus ?? "NOT_SENT";
  const hasSuccessfulSend = delivery?.attempts.some((a) => a.status === "SENT");
  const showPrimarySend = Boolean(recipientEmail) && !hasSuccessfulSend && aggregateStatus !== "SENDING";

  const pdfUrl = `/api/platform/billing/invoices/${encodeURIComponent(invoiceKey)}/pdf`;
  const downloadUrl = `${pdfUrl}?download=1`;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {showPrimarySend ? (
          <button
            type="button"
            className="fca-button-primary"
            onClick={() => setDialogOpen(true)}
          >
            Rechnung senden
          </button>
        ) : null}
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="fca-button-secondary">
          PDF anzeigen
        </a>
        <a href={downloadUrl} className="fca-button-secondary">
          PDF herunterladen
        </a>
      </div>

      {dialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invoice-send-review-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Dialog schliessen"
            onClick={() => !loading && setDialogOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-[var(--radius-lg)] bg-[var(--card)] p-6 shadow-xl ring-1 ring-[color-mix(in_srgb,var(--border)_60%,transparent)]">
            <h2 id="invoice-send-review-title" className="text-lg font-semibold">
              Rechnung vor dem Versand prüfen
            </h2>
            <p className="mt-1 text-sm text-[var(--text-2)]">
              Bitte Empfänger und Betrag kontrollieren. Erst danach wird die E-Mail versendet.
            </p>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">Empfänger</dt>
                <dd className="font-medium text-right break-all">{recipientEmail}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">Rechnung</dt>
                <dd className="font-medium tabular-nums">{invoiceNumber ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">Betrag</dt>
                <dd className="font-medium tabular-nums">{grossTotalFormatted}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">Fällig</dt>
                <dd className="font-medium">{dueDateFormatted}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">Anhang</dt>
                <dd className="font-medium text-right">{pdfAttachmentName(invoiceNumber)}</dd>
              </div>
            </dl>

            <div className="mt-4 flex items-center gap-2">
              <BillingStatusBadge label="Finalisiert" tone="default" />
              <BillingStatusBadge label="Noch nicht versendet" tone="muted" />
            </div>

            {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="fca-button-secondary"
                disabled={loading}
                onClick={() => setDialogOpen(false)}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="fca-button-primary"
                disabled={loading || !recipientEmail}
                onClick={() => sendInvoice()}
              >
                Rechnung jetzt senden
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
