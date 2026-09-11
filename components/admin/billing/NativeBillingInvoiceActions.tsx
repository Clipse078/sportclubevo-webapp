"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  invoiceKey: string;
  status: string;
  canManage: boolean;
  grossTotalFormatted: string;
};

export default function NativeBillingInvoiceActions({
  invoiceKey,
  status,
  canManage,
  grossTotalFormatted,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function finalize() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform/billing/invoices/${invoiceKey}/finalize`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Finalisierung fehlgeschlagen.");
      }
      setConfirmOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Finalisierung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  if (!canManage || status !== "DRAFT") {
    return null;
  }

  return (
    <div className="space-y-2">
      {!confirmOpen ? (
        <button
          type="button"
          className="fca-button-primary"
          onClick={() => setConfirmOpen(true)}
        >
          Rechnung finalisieren
        </button>
      ) : (
        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3 max-w-md">
          <p className="text-sm">
            Rechnung unwiderruflich finalisieren? Rechnungsnummer wird vergeben und alle
            Inhalte eingefroren. Total: <strong>{grossTotalFormatted}</strong>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="fca-button-primary"
              disabled={loading}
              onClick={() => finalize()}
            >
              Ja, finalisieren
            </button>
            <button
              type="button"
              className="fca-button-secondary"
              disabled={loading}
              onClick={() => setConfirmOpen(false)}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
